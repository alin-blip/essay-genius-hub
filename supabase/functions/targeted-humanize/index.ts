import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const REWRITE_PROMPT = `You are an expert academic editor helping a UK university student make their writing sound more natural and human.

TASK: Rewrite ONLY the specific sentences provided below. Each sentence is numbered. Return the rewritten versions in the SAME order, one per line, prefixed with the same number.

RULES:
- Keep the exact same meaning and academic content
- Vary sentence length — mix short punchy sentences with longer ones
- Use natural student vocabulary, not overly formal or robotic language
- Add occasional contractions (it's, doesn't, won't) where appropriate
- Break uniform sentence patterns — don't start consecutive sentences the same way
- Use active voice more than passive where possible
- Add transitional phrases that feel natural (honestly, in practice, interestingly)
- Maintain academic rigour — don't dumb it down, just make it sound human
- Do NOT add or remove information
- Do NOT change technical terms or proper nouns
- Each rewritten sentence must be on its own line, prefixed with the number

CONTEXT (for coherence, do NOT rewrite this):
"""
{context}
"""

SENTENCES TO REWRITE:
{sentences}`;

const MAX_PASSES = 3;
const TARGET_SCORE = 15;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Not authenticated");
    const userId = userData.user.id;

    const { content, assignment_id } = await req.json();
    if (!content || !assignment_id) throw new Error("content and assignment_id required");

    // Verify ownership
    const { data: assignment, error: assignError } = await supabaseClient
      .from("assignments")
      .select("id, user_id, word_count")
      .eq("id", assignment_id)
      .eq("user_id", userId)
      .single();
    if (assignError || !assignment) throw new Error("Assignment not found");

    // Check credits
    const wordCount = assignment.word_count || 3000;
    const creditCost = Math.max(1, Math.ceil(wordCount / 100));

    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("credits_balance")
      .eq("user_id", userId)
      .single();
    if (!profile || profile.credits_balance < creditCost) {
      throw new Error(`Not enough credits. Need ${creditCost}, have ${profile?.credits_balance || 0}`);
    }

    // Deduct credits upfront
    const deductResult = await supabaseClient.rpc("deduct_credits", {
      p_user_id: userId,
      p_amount: creditCost,
    });
    if (deductResult.data === -1) throw new Error("Failed to deduct credits");
    const creditsRemaining = deductResult.data as number;

    const GPTZERO_API_KEY = Deno.env.get("GPTZERO_API_KEY");
    if (!GPTZERO_API_KEY) {
      await supabaseClient.rpc("restore_credits", { p_user_id: userId, p_amount: creditCost });
      throw new Error("GPTZERO_API_KEY not configured");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      await supabaseClient.rpc("restore_credits", { p_user_id: userId, p_amount: creditCost });
      throw new Error("AI API key not configured");
    }

    let currentContent = content;
    const passResults: Array<{
      pass: number;
      score_before: number;
      score_after: number;
      sentences_rewritten: number;
    }> = [];

    for (let pass = 1; pass <= MAX_PASSES; pass++) {
      // Step 1: GPTZero scan
      const gptZeroRes = await fetch("https://api.gptzero.me/v2/predict/text", {
        method: "POST",
        headers: {
          "x-api-key": GPTZERO_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ document: currentContent }),
      });

      if (!gptZeroRes.ok) {
        if (gptZeroRes.status === 429) {
          // Rate limited — return what we have so far
          break;
        }
        throw new Error(`GPTZero error: ${gptZeroRes.status}`);
      }

      const gptData = await gptZeroRes.json();
      const doc = gptData.documents?.[0];
      if (!doc) break;

      const scoreBefore = Math.round((doc.completely_generated_prob ?? 0) * 100);

      // Check if already below target
      if (scoreBefore <= TARGET_SCORE) {
        passResults.push({
          pass,
          score_before: scoreBefore,
          score_after: scoreBefore,
          sentences_rewritten: 0,
        });
        break;
      }

      // Step 2: Find flagged sentences
      const sentences = (doc.sentences ?? []) as Array<{
        sentence: string;
        generated_prob: number;
        highlight_sentence_for_ai: boolean;
      }>;

      const flagged = sentences.filter(
        (s) => s.generated_prob > 0.5 || s.highlight_sentence_for_ai
      );

      if (flagged.length === 0) break;

      // Step 3: Build prompt with numbered sentences
      const numberedSentences = flagged
        .map((s, i) => `${i + 1}. ${s.sentence}`)
        .join("\n");

      // Use a snippet of the full text as context (first 500 chars + last 500 chars)
      const contextSnippet =
        currentContent.length > 1200
          ? currentContent.slice(0, 600) + "\n...\n" + currentContent.slice(-600)
          : currentContent;

      const prompt = REWRITE_PROMPT
        .replace("{context}", contextSnippet)
        .replace("{sentences}", numberedSentences);

      // Step 4: Call AI to rewrite
      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-5",
          messages: [
            { role: "system", content: "You are an expert academic rewriter. Follow instructions exactly." },
            { role: "user", content: prompt },
          ],
          temperature: 0.85,
          max_tokens: 4000,
        }),
      });

      if (!aiRes.ok) {
        console.error("AI rewrite failed:", aiRes.status);
        break;
      }

      const aiData = await aiRes.json();
      const rewrittenText = aiData.choices?.[0]?.message?.content?.trim();
      if (!rewrittenText) break;

      // Step 5: Parse numbered responses and splice back
      const rewrittenLines = rewrittenText.split("\n").filter((l: string) => l.trim());
      const rewrittenMap = new Map<number, string>();

      for (const line of rewrittenLines) {
        const match = line.match(/^(\d+)\.\s*(.+)$/);
        if (match) {
          rewrittenMap.set(parseInt(match[1]), match[2].trim());
        }
      }

      let updatedContent = currentContent;
      let replacedCount = 0;

      for (let i = 0; i < flagged.length; i++) {
        const rewritten = rewrittenMap.get(i + 1);
        if (rewritten && rewritten !== flagged[i].sentence) {
          // Simple string replacement — replace first occurrence
          const idx = updatedContent.indexOf(flagged[i].sentence);
          if (idx !== -1) {
            updatedContent =
              updatedContent.slice(0, idx) +
              rewritten +
              updatedContent.slice(idx + flagged[i].sentence.length);
            replacedCount++;
          }
        }
      }

      if (replacedCount === 0) break;

      currentContent = updatedContent;

      // Step 6: Re-scan to get score_after (only if not last pass)
      let scoreAfter = scoreBefore;
      if (pass < MAX_PASSES) {
        try {
          const recheck = await fetch("https://api.gptzero.me/v2/predict/text", {
            method: "POST",
            headers: {
              "x-api-key": GPTZERO_API_KEY,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ document: currentContent }),
          });
          if (recheck.ok) {
            const recheckData = await recheck.json();
            const recheckDoc = recheckData.documents?.[0];
            if (recheckDoc) {
              scoreAfter = Math.round((recheckDoc.completely_generated_prob ?? 0) * 100);
            }
          }
        } catch {
          // Continue anyway
        }
      }

      passResults.push({
        pass,
        score_before: scoreBefore,
        score_after: scoreAfter,
        sentences_rewritten: replacedCount,
      });

      if (scoreAfter <= TARGET_SCORE) break;
    }

    // Save the final content
    const { error: saveError } = await supabaseClient
      .from("assignments")
      .update({ humanized_content: currentContent })
      .eq("id", assignment_id);

    if (saveError) {
      // Refund on save failure
      await supabaseClient.rpc("restore_credits", { p_user_id: userId, p_amount: creditCost });
      throw new Error("Failed to save humanized content");
    }

    return new Response(
      JSON.stringify({
        humanized_content: currentContent,
        credits_used: creditCost,
        credits_remaining: creditsRemaining,
        passes: passResults,
        final_score: passResults.length > 0
          ? passResults[passResults.length - 1].score_after
          : null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
