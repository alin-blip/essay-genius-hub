import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function searchCrossref(query: string): Promise<any> {
  const encoded = encodeURIComponent(query);
  const url = `https://api.crossref.org/works?query=${encoded}&rows=3&select=title,author,published-print,DOI,container-title`;
  try {
    const resp = await fetch(url, {
      headers: { "User-Agent": "AssignmentPro/1.0 (mailto:support@assignmentpro.uk)" },
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return data?.message?.items || [];
  } catch {
    return null;
  }
}

function extractReferences(refText: string): string[] {
  return refText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 15 && /\(\d{4}\)/.test(line));
}

function extractSearchTerms(ref: string): string {
  // Extract author surname and year, plus a few title words
  const yearMatch = ref.match(/\((\d{4})\)/);
  const year = yearMatch ? yearMatch[1] : "";
  // Get first author surname (before comma or parenthesis)
  const authorMatch = ref.match(/^([A-Za-z\-']+)/);
  const author = authorMatch ? authorMatch[1] : "";
  // Get some title words (after year, before journal/publisher)
  const afterYear = ref.split(/\(\d{4}\)/)[1] || "";
  const titleWords = afterYear
    .replace(/[''"".,]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 5)
    .join(" ");
  return `${author} ${year} ${titleWords}`.trim();
}

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

    const { references, assignment_id } = await req.json();
    if (!references || !assignment_id) throw new Error("references and assignment_id required");

    // Verify ownership
    const { data: assignment, error: assignError } = await supabaseClient
      .from("assignments")
      .select("id, user_id")
      .eq("id", assignment_id)
      .eq("user_id", userData.user.id)
      .single();
    if (assignError || !assignment) throw new Error("Assignment not found");

    const refList = extractReferences(references);
    const results = [];

    for (const ref of refList.slice(0, 15)) {
      const searchTerms = extractSearchTerms(ref);
      const crossrefResults = await searchCrossref(searchTerms);

      if (!crossrefResults || crossrefResults.length === 0) {
        results.push({
          original: ref,
          status: "not_found",
          details: "No matching publication found in Crossref database.",
        });
        continue;
      }

      // Check if any result closely matches
      const bestMatch = crossrefResults[0];
      const matchTitle = bestMatch.title?.[0]?.toLowerCase() || "";
      const refLower = ref.toLowerCase();

      // Simple similarity check
      const titleWords = matchTitle.split(/\s+/).filter((w: string) => w.length > 3);
      const matchingWords = titleWords.filter((w: string) => refLower.includes(w));
      const similarity = titleWords.length > 0 ? matchingWords.length / titleWords.length : 0;

      if (similarity > 0.5) {
        const authors = bestMatch.author?.map((a: any) => `${a.family}, ${a.given?.[0]}.`).join(", ") || "";
        results.push({
          original: ref,
          status: "verified",
          details: `Verified via Crossref. DOI: ${bestMatch.DOI || "N/A"}`,
        });
      } else if (similarity > 0.2) {
        results.push({
          original: ref,
          status: "partial_match",
          details: `Partial match found: "${bestMatch.title?.[0] || ""}"`,
          suggestion: bestMatch.DOI ? `https://doi.org/${bestMatch.DOI}` : undefined,
        });
      } else {
        results.push({
          original: ref,
          status: "not_found",
          details: "No close match found. This reference may be fabricated or incorrectly formatted.",
        });
      }

      // Rate limit Crossref requests
      await new Promise((r) => setTimeout(r, 300));
    }

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
