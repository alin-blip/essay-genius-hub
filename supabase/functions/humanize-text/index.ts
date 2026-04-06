import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const HUMANIZE_PROMPT = `You are a specialist in rewriting AI-generated academic text to make it indistinguishable from genuine student writing. Your ONLY job is to rewrite the provided text while preserving all meaning, arguments, and references.

## Critical Rewriting Rules

1. **Sentence Length Variation (MOST IMPORTANT)**
   - Create DRAMATIC variation: mix 5-word sentences with 30+ word sentences
   - Never have more than 2 consecutive sentences of similar length
   - Include occasional sentence fragments for emphasis

2. **Vocabulary & Tone**
   - Replace formal AI-typical words with natural student alternatives:
     * "utilise" → "use", "demonstrate" → "show", "furthermore" → "also"/"on top of that"
     * "it is important to note" → remove entirely or "worth noting"
     * "delve" → "look at"/"explore", "multifaceted" → "complex"
   - Add natural hedging: "sort of", "to some extent", "arguably"
   - Include occasional contractions: "doesn't", "isn't", "can't"
   - Mix registers: mostly formal with occasional informal phrasing

3. **Structural Changes**
   - Vary paragraph lengths (some 2 sentences, some 6-7)
   - Use rhetorical questions occasionally
   - Start some paragraphs with conjunctions: "But", "And", "Yet"
   - Include self-corrections: "or rather", "to put it differently"

4. **Natural Imperfections**
   - Add slight repetition of key points (as students do when emphasising)
   - Use "this" without clear antecedent occasionally
   - Include minor wordiness in some places
   - Vary transition quality — some smooth, some abrupt

5. **Preserve**
   - All Harvard references exactly as written
   - All factual claims and data
   - The overall argument structure and conclusion
   - Academic integrity — no fabricated content
   - British English spelling throughout

## Output
Return ONLY the rewritten text. No explanations, no meta-commentary. Maintain all markdown formatting.`;

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

    if (!assignment_id || !content) {
      return new Response(JSON.stringify({ error: "Missing assignment_id or content" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: HUMANIZE_PROMPT },
          { role: "user", content: `Rewrite the following academic text to sound like a genuine student wrote it. Preserve all references, arguments, and meaning:\n\n${content}` },
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

    // Deduct credits
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    await adminClient
      .from("profiles")
      .update({ credits_balance: profile.credits_balance - creditCost })
      .eq("user_id", user.id);

    return new Response(
      JSON.stringify({
        humanized_content: humanizedContent,
        credits_used: creditCost,
        credits_remaining: profile.credits_balance - creditCost,
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
