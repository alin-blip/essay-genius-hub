import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const HUMANIZE_PROMPT = `You are a skilled academic editor helping a university student polish their draft. The text already makes good arguments — your job is to make it read like a confident, capable student wrote it naturally, not like AI generated it.

## CORE PRINCIPLE
Make minimal, surgical changes. Do NOT rewrite from scratch. Preserve the structure, arguments, and academic quality. You are polishing, not demolishing.

## STEP 1: VOCABULARY CLEANUP (mandatory substitutions)
Replace these AI-signature words wherever they appear:
- "utilize/utilise" → "use"
- "demonstrate" → "show" or "suggest"
- "facilitate" → "help" or "support"
- "implement" → "carry out" or "apply"
- "subsequently" → "then" or "after this"
- "furthermore" → "also" or "additionally"
- "consequently" → "so" or "as a result"
- "nevertheless" → "still" or "however"
- "comprehensive" → "thorough" or "detailed"
- "significant" → "notable" or "important"
- "fundamental" → "key" or "core"
- "multifaceted" → remove or rephrase simply
- "delve" → "examine" or "explore"
- "tapestry" → remove metaphor, state plainly
- "pivotal" → "important" or "key"
- "groundbreaking" → "important" or "notable"
- "it is important to note that" → remove entirely, just state the point
- "it should be noted that" → remove entirely
- "it is worth mentioning" → remove entirely
- "in conclusion" at paragraph starts → vary: "Overall", "To summarise", "Taking this together", or just start the concluding point directly
- "plays a crucial role" → "matters" or "is important"
- "in the context of" → "for" or "in"

## STEP 2: SENTENCE RHYTHM (burstiness)
AI writes sentences of similar length. Fix this:
- If you see 3+ sentences in a row of similar length (15-25 words each), break the pattern
- Split one long sentence into two shorter ones, OR combine two short ones with a comma or dash
- Aim for a mix: some sentences 8-12 words, some 20-30 words, within each paragraph
- Do NOT add sentence fragments or incomplete thoughts

## STEP 3: NATURAL ACADEMIC VOICE
- Add contractions where natural: "does not" → "doesn't", "it is" → "it's", "cannot" → "can't"
- But keep some formal phrasing — not every instance needs contracting
- Move 2-3 citations from sentence-end to mid-sentence: "X (Author, Year) is evident in..." 
- Occasionally name authors in text: "As Smith (2021) argues..." instead of just "(Smith, 2021)"
- Vary paragraph openings — if 3 paragraphs start with "The" or "This", change one to start differently

## STEP 4: SUBTLE IMPERFECTIONS
- Add 1-2 em dashes per 500 words for parenthetical thoughts
- Use "arguably" or "to some extent" as hedges (max 2 per 1000 words)
- One or two sentences can start with "And" or "But" — but sparingly
- Keep tone confident and academic throughout — this is a strong student, not a sloppy one

## ABSOLUTE RULES — DO NOT BREAK
- Keep ALL Harvard references exactly as written — every single citation must remain
- Keep ALL factual claims, data, statistics unchanged
- Keep the overall argument, structure, and conclusion identical
- Keep British English spelling
- Keep markdown formatting (headings, bold, lists)
- Keep the same word count (±5% maximum)
- Do NOT add rhetorical questions
- Do NOT add digressions or off-topic asides
- Do NOT add "false starts" or self-corrections
- Do NOT use "kind of", "sort of" — too informal for academic writing
- Do NOT add personal anecdotes or first-person commentary unless already present

## OUTPUT
Return ONLY the polished text. No explanations, no commentary, no preamble.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { assignment_id, content } = await req.json();

    if (!assignment_id || typeof assignment_id !== "string") {
      return new Response(JSON.stringify({ error: "Invalid or missing assignment_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!content || typeof content !== "string" || content.length > 100000) {
      return new Response(JSON.stringify({ error: "Invalid or missing content" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify assignment belongs to user
    const { data: assignment, error: fetchError } = await supabase
      .from("assignments")
      .select("id, user_id, word_count")
      .eq("id", assignment_id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !assignment) {
      return new Response(JSON.stringify({ error: "Assignment not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check credits (humanization costs half of generation)
    const { data: profile } = await supabase
      .from("profiles")
      .select("credits_balance")
      .eq("user_id", user.id)
      .single();

    const creditCost = Math.ceil(assignment.word_count / 200);
    if (!profile || profile.credits_balance < creditCost) {
      return new Response(JSON.stringify({ error: "Insufficient credits" }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Call Lovable AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5",
        messages: [
          { role: "system", content: HUMANIZE_PROMPT },
          { role: "user", content: `Rewrite this academic text so AI detectors score it below 15%. You are a student rewriting your own draft because it sounded too robotic. Keep all references, arguments, facts, and the same word count. Make it sound like YOU wrote it — messy, human, real:\n\n${content}` },
        ],
      }),
    });

    if (!aiResponse.ok) {
      console.error("AI gateway error:", aiResponse.status);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "AI service is busy. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Failed to humanize text" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const humanizedContent = aiData.choices?.[0]?.message?.content;

    if (!humanizedContent) {
      return new Response(JSON.stringify({ error: "No content generated" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Save humanized content
    const { error: updateError } = await supabase
      .from("assignments")
      .update({ humanized_content: humanizedContent })
      .eq("id", assignment_id)
      .eq("user_id", user.id);

    if (updateError) {
      console.error("Update error:", updateError);
      return new Response(JSON.stringify({ error: "Failed to save humanized content" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Deduct credits atomically
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: newBalance } = await adminClient.rpc("deduct_credits", {
      p_user_id: user.id,
      p_amount: creditCost,
    });

    return new Response(
      JSON.stringify({
        humanized_content: humanizedContent,
        credits_used: creditCost,
        credits_remaining: newBalance ?? profile.credits_balance - creditCost,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
