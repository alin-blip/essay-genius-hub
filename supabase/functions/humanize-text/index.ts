import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const POLL_INTERVAL_MS = 7000;
const MAX_POLL_ATTEMPTS = 25; // ~175 seconds max

async function submitToUndetectable(content: string, apiKey: string): Promise<string> {
  const response = await fetch("https://humanize.undetectable.ai/submit", {
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
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    if (response.status === 400) throw new Error("Insufficient Undetectable.ai credits");
    throw new Error(`Undetectable.ai submit failed (${response.status}): ${errText}`);
  }

  const data = await response.json();
  if (!data.id) throw new Error("No document ID returned from Undetectable.ai");
  return data.id;
}

async function pollForResult(docId: string, apiKey: string): Promise<string> {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

    const response = await fetch("https://humanize.undetectable.ai/document", {
      method: "POST",
      headers: {
        apikey: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: docId }),
    });

    if (!response.ok) {
      console.error("Poll error:", response.status);
      continue;
    }

    const data = await response.json();
    if (data.output) {
      return data.output;
    }
    // No output yet — still processing
  }
  throw new Error("Humanization timed out after ~175 seconds");
}

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

    // Check credits
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

    // Check for Undetectable.ai API key
    const UNDETECTABLE_API_KEY = Deno.env.get("UNDETECTABLE_API_KEY");
    if (!UNDETECTABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "Humanization service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Submit to Undetectable.ai
    console.log(`Submitting ${content.length} chars to Undetectable.ai for assignment ${assignment_id}`);
    const docId = await submitToUndetectable(content, UNDETECTABLE_API_KEY);
    console.log(`Document submitted, ID: ${docId}. Polling for result...`);

    // Poll for result
    const humanizedContent = await pollForResult(docId, UNDETECTABLE_API_KEY);
    console.log(`Humanization complete. Output length: ${humanizedContent.length}`);

    if (!humanizedContent) {
      return new Response(JSON.stringify({ error: "No content returned from humanization service" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
