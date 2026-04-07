import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/** Simple n-gram (shingle) Jaccard similarity – runs entirely in-memory, no external API needed for the comparison itself. */
function ngrams(text: string, n: number): Set<string> {
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(Boolean);
  const s = new Set<string>();
  for (let i = 0; i <= words.length - n; i++) {
    s.add(words.slice(i, i + n).join(" "));
  }
  return s;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const x of a) if (b.has(x)) intersection++;
  return intersection / (a.size + b.size - intersection);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing auth");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) throw new Error("Unauthorized");

    const { content, assignment_id } = await req.json();
    if (!content || !assignment_id) {
      return new Response(JSON.stringify({ error: "Missing content or assignment_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all other completed assignments for this user
    const { data: previousAssignments, error: fetchError } = await supabase
      .from("assignments")
      .select("id, title, generated_content, humanized_content")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .neq("id", assignment_id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (fetchError) throw fetchError;

    if (!previousAssignments || previousAssignments.length === 0) {
      return new Response(
        JSON.stringify({
          overall_similarity: 0,
          verdict: "unique",
          details: "No previous assignments to compare against. This is your first completed assignment!",
          comparisons: [],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const currentNgrams = ngrams(content, 4);
    const comparisons: { assignment_id: string; title: string; similarity: number }[] = [];

    for (const prev of previousAssignments) {
      const prevContent = prev.humanized_content || prev.generated_content;
      if (!prevContent) continue;

      const prevNgrams = ngrams(prevContent, 4);
      const sim = Math.round(jaccard(currentNgrams, prevNgrams) * 100);

      comparisons.push({
        assignment_id: prev.id,
        title: prev.title,
        similarity: sim,
      });
    }

    // Sort by highest similarity
    comparisons.sort((a, b) => b.similarity - a.similarity);

    const maxSimilarity = comparisons.length > 0 ? comparisons[0].similarity : 0;

    let verdict: string;
    if (maxSimilarity <= 10) verdict = "unique";
    else if (maxSimilarity <= 25) verdict = "low_similarity";
    else if (maxSimilarity <= 50) verdict = "moderate_similarity";
    else verdict = "high_similarity";

    const detailsMap: Record<string, string> = {
      unique: "Excellent! This assignment is highly original with no significant overlap with your previous work.",
      low_similarity: "Good result. Minor overlaps detected which are likely common academic phrases.",
      moderate_similarity: "Some sections share similarities with previous assignments. Consider rephrasing overlapping areas.",
      high_similarity: "Significant overlap detected with previous work. We recommend rewriting or humanizing to ensure uniqueness.",
    };

    return new Response(
      JSON.stringify({
        overall_similarity: maxSimilarity,
        verdict,
        details: detailsMap[verdict],
        comparisons: comparisons.slice(0, 5), // top 5
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("check-similarity error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
