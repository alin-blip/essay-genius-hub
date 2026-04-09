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
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Not authenticated");

    const { content, assignment_id } = await req.json();
    if (!content || !assignment_id) throw new Error("content and assignment_id required");

    // Verify ownership
    const { data: assignment, error: assignError } = await supabaseClient
      .from("assignments")
      .select("id, user_id")
      .eq("id", assignment_id)
      .eq("user_id", userData.user.id)
      .single();
    if (assignError || !assignment) throw new Error("Assignment not found");

    const GPTZERO_API_KEY = Deno.env.get("GPTZERO_API_KEY");
    if (!GPTZERO_API_KEY) throw new Error("GPTZERO_API_KEY not configured");

    const response = await fetch("https://api.gptzero.me/v2/predict/text", {
      method: "POST",
      headers: {
        "x-api-key": GPTZERO_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ document: content }),
    });

    if (!response.ok) {
      const errText = await response.text();
      if (response.status === 429) throw new Error("Rate limited — please try again in a moment");
      if (response.status === 401 || response.status === 403) throw new Error("GPTZero API key invalid");
      throw new Error(`GPTZero API error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const documents = data.documents?.[0];

    if (!documents) throw new Error("No analysis returned from GPTZero");

    const overallScore = Math.round((documents.completely_generated_prob ?? 0) * 100);
    const humanScore = 100 - overallScore;
    const classification = documents.document_classification ?? "UNKNOWN";
    const burstiness = documents.overall_burstiness != null
      ? Math.round(documents.overall_burstiness)
      : null;

    let details = `Classification: ${classification}.`;
    if (burstiness != null) {
      details += ` Burstiness: ${burstiness} (higher = more human-like).`;
    }
    const aiSentences = (documents.sentences ?? []).filter(
      (s: any) => s.generated_prob > 0.7
    ).length;
    const totalSentences = (documents.sentences ?? []).length;
    if (totalSentences > 0) {
      details += ` ${aiSentences}/${totalSentences} sentences flagged as likely AI.`;
    }

    return new Response(
      JSON.stringify({
        overall_score: Math.min(100, Math.max(0, overallScore)),
        human_score: Math.min(100, Math.max(0, humanScore)),
        details,
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
