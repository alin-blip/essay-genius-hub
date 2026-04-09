import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const HUMANIZE_PROMPT = `You are rewriting AI-generated academic text so that AI detectors score it BELOW 15%. You are a real student rewriting your own draft because it "sounded too robotic." Your goal is to make it sound authentically human.

## REWRITING STRATEGY (in order of importance)

### 1. DESTROY AI SENTENCE PATTERNS (most important)
AI writes in predictable rhythms. Break them completely:
- Take any sentence over 20 words and split it into 2, or combine 2 short ones into 1 long messy one
- Rearrange clause order: "Although X, Y" → "Y. This is despite X." or "Y — even though X"
- Insert parenthetical asides: "The results (somewhat surprisingly) indicated..."
- Use dashes liberally — real students love em dashes — sometimes too much
- Add false starts and self-corrections: "The theory suggests — or rather implies — that..."

### 2. REPLACE AI VOCABULARY 
These substitutions are mandatory:
- "utilise/utilize" → "use"
- "demonstrate" → "show" or "prove"  
- "facilitate" → "help" or "make easier"
- "implement" → "put in place" or "carry out"
- "subsequently" → "then" or "after that"
- "furthermore" → "also" or "on top of that" or "and"
- "consequently" → "so" or "because of this"
- "nevertheless" → "still" or "even so" or "but"
- "comprehensive" → "thorough" or "full"
- "significant" → "big" or "major" or "important"
- "fundamental" → "basic" or "key"
- Remove "it is important to note", "it should be noted", "it is worth mentioning" entirely
- Remove "delve", "tapestry", "multifaceted", "nuanced", "intricate", "pivotal", "groundbreaking"

### 3. ADD HUMAN MESSINESS
- Use contractions: "doesn't", "isn't", "can't", "won't", "it's", "that's"
- Start 2-3 paragraphs with "But" or "And" or "So"
- Add 1-2 rhetorical questions per 1000 words: "But does this really hold up?"
- Include slight redundancy — say something, then rephrase it slightly
- Vary paragraph lengths dramatically (2 sentences to 7 sentences)
- Use "kind of", "sort of", "arguably", "to some extent" as hedges
- Add the occasional informal aside: "which, admittedly, is a bold claim"

### 4. STRUCTURAL HUMANISATION
- Move some citations from the end of sentences to the middle
- Occasionally reference an author by name in flowing text: "As Smith puts it..."
- Break up any perfect lists into flowing prose
- Remove any overly smooth transitions and replace with abrupt ones occasionally
- Add a sentence or two that slightly digresses before coming back to the point

### 5. PRESERVE (do not change)
- All Harvard references — keep citations exactly as written
- All factual claims, data points, and statistics
- The overall argument and conclusion
- British English spelling
- Markdown formatting
- Total word count (do not shorten the text)

## OUTPUT
Return ONLY the rewritten text. No explanations. No commentary. Maintain markdown formatting.`;

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
