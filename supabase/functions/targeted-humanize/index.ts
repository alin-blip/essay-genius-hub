import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_PASSES = 3;
const TARGET_SCORE = 15;
const POLL_INTERVAL_MS = 7000;
const MAX_POLL_ATTEMPTS = 25;

async function scanWithGPTZero(content: string, apiKey: string) {
  const response = await fetch("https://api.gptzero.me/v2/predict/text", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ document: content }),
  });

  if (!response.ok) {
    if (response.status === 429) return { score: null, rateLimited: true };
    throw new Error(`GPTZero error: ${response.status}`);
  }

  const data = await response.json();
  const doc = data.documents?.[0];
  if (!doc) return { score: null, rateLimited: false };

  return {
    score: Math.round((doc.completely_generated_prob ?? 0) * 100),
    rateLimited: false,
  };
}

async function humanizeWithUndetectable(content: string, apiKey: string): Promise<string> {
  // Submit
  const submitRes = await fetch("https://humanize.undetectable.ai/submit", {
    method: "POST",
    headers: {
      apikey: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      content,
      readability: "University",
      purpose: "Essay",
      strength: "More Human",
      model: "v11sr",
      userId: "a78a2279-03da-4db4-9445-9fe23e659868",
    }),
  });

  if (!submitRes.ok) {
    const errText = await submitRes.text();
    if (submitRes.status === 400) throw new Error("Insufficient Undetectable.ai credits");
    throw new Error(`Undetectable.ai submit failed (${submitRes.status}): ${errText}`);
  }

  const submitData = await submitRes.json();
  const docId = submitData.id;
  if (!docId) throw new Error("No document ID from Undetectable.ai");

  // Poll
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

    const pollRes = await fetch("https://humanize.undetectable.ai/document", {
      method: "POST",
      headers: {
        apikey: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: docId }),
    });

    if (!pollRes.ok) continue;

    const pollData = await pollRes.json();
    if (pollData.output) return pollData.output;
  }

  throw new Error("Humanization timed out");
}

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

    const UNDETECTABLE_API_KEY = Deno.env.get("UNDETECTABLE_API_KEY");
    if (!UNDETECTABLE_API_KEY) {
      await supabaseClient.rpc("restore_credits", { p_user_id: userId, p_amount: creditCost });
      throw new Error("Humanization service not configured");
    }

    let currentContent = content;
    const passResults: Array<{
      pass: number;
      score_before: number;
      score_after: number;
      sentences_rewritten: number;
    }> = [];

    for (let pass = 1; pass <= MAX_PASSES; pass++) {
      // Step 1: GPTZero scan to get initial score
      const scanResult = await scanWithGPTZero(currentContent, GPTZERO_API_KEY);
      if (scanResult.rateLimited) break;
      if (scanResult.score === null) break;

      const scoreBefore = scanResult.score;

      // Already below target
      if (scoreBefore <= TARGET_SCORE) {
        passResults.push({
          pass,
          score_before: scoreBefore,
          score_after: scoreBefore,
          sentences_rewritten: 0,
        });
        break;
      }

      // Step 2: Send full content to Undetectable.ai for humanization
      console.log(`Pass ${pass}: score=${scoreBefore}%, sending to Undetectable.ai...`);
      const humanizedContent = await humanizeWithUndetectable(currentContent, UNDETECTABLE_API_KEY);
      
      // Count approximate changes
      const originalWords = currentContent.split(/\s+/);
      const humanizedWords = humanizedContent.split(/\s+/);
      const changedWords = originalWords.filter((w, i) => humanizedWords[i] !== w).length;
      const sentencesRewritten = Math.max(1, Math.round(changedWords / 15));

      currentContent = humanizedContent;

      // Step 3: Re-scan with GPTZero to verify
      let scoreAfter = scoreBefore;
      try {
        const rescan = await scanWithGPTZero(currentContent, GPTZERO_API_KEY);
        if (rescan.score !== null) scoreAfter = rescan.score;
      } catch {
        // Continue anyway
      }

      passResults.push({
        pass,
        score_before: scoreBefore,
        score_after: scoreAfter,
        sentences_rewritten: sentencesRewritten,
      });

      console.log(`Pass ${pass} complete: ${scoreBefore}% → ${scoreAfter}%`);

      if (scoreAfter <= TARGET_SCORE) break;
    }

    // Save the final content
    const { error: saveError } = await supabaseClient
      .from("assignments")
      .update({ humanized_content: currentContent })
      .eq("id", assignment_id);

    if (saveError) {
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
