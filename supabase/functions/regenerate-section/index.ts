import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Not authenticated");

    const { assignment_id, selected_text, full_content } = await req.json();
    if (!assignment_id || !selected_text) throw new Error("assignment_id and selected_text required");

    // Verify ownership
    const { data: assignment, error: assignError } = await supabaseClient
      .from("assignments")
      .select("id, user_id, target_grade, assignment_type")
      .eq("id", assignment_id)
      .eq("user_id", userData.user.id)
      .single();

    if (assignError || !assignment) throw new Error("Assignment not found");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const wordCount = selected_text.split(/\s+/).length;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5",
        messages: [
          {
            role: "system",
            content: `You are rewriting a section of a UK university assignment. The assignment type is "${assignment.assignment_type}" at "${assignment.target_grade}" grade level.

CRITICAL RULES:
- Rewrite ONLY the provided section, keeping the same topic and arguments
- Match the approximate word count (${wordCount} words, ±10%)
- Write like a real UK university student — use contractions, vary sentence length, include minor hedging
- Use British English spelling (organisation, behaviour, analyse)
- Keep any citations/references that appear in the original
- Make the text sound natural and human-written
- NEVER use words like: delve, tapestry, multifaceted, pivotal, nuanced, landscape, paradigm
- Do NOT include any markdown formatting, headers, or special characters
- Return ONLY the rewritten text, nothing else`,
          },
          {
            role: "user",
            content: `Rewrite this section while maintaining its meaning and academic quality:\n\n${selected_text}`,
          },
        ],
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      if (response.status === 429) throw new Error("Rate limited — please try again in a moment");
      if (response.status === 402) throw new Error("AI credits exhausted — please top up");
      throw new Error("AI generation failed");
    }

    const aiData = await response.json();
    const regeneratedText = aiData.choices?.[0]?.message?.content?.trim();
    if (!regeneratedText) throw new Error("No content generated");

    return new Response(
      JSON.stringify({ regenerated_text: regeneratedText }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
