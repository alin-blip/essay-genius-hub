import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface OpenAlexWork {
  id: string;
  title: string;
  publication_year: number;
  doi: string | null;
  authorships: Array<{
    author: { display_name: string };
  }>;
  primary_location?: {
    source?: { display_name: string };
  };
}

function formatHarvardReference(work: OpenAlexWork): string {
  const authors = work.authorships?.map((a) => a.author.display_name) || [];
  let authorStr = "";
  if (authors.length === 0) {
    authorStr = "Unknown";
  } else if (authors.length === 1) {
    authorStr = authors[0].split(" ").pop() || authors[0];
  } else if (authors.length === 2) {
    authorStr = `${authors[0].split(" ").pop()} and ${authors[1].split(" ").pop()}`;
  } else {
    authorStr = `${authors[0].split(" ").pop()} et al.`;
  }

  const year = work.publication_year || "n.d.";
  const title = work.title || "Untitled";
  const journal = work.primary_location?.source?.display_name || "";
  const doi = work.doi ? ` doi:${work.doi.replace("https://doi.org/", "")}` : "";

  if (journal) {
    return `${authorStr} (${year}) '${title}', *${journal}*.${doi}`;
  }
  return `${authorStr} (${year}) '${title}'.${doi}`;
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

    const { topic, brief, count } = await req.json();
    if (!topic || typeof topic !== "string") {
      return new Response(JSON.stringify({ error: "topic is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const numRefs = Math.min(Math.max(count || 15, 5), 30);

    // Build search query from topic and brief keywords
    const searchTerms = topic.slice(0, 200);
    const briefKeywords = brief
      ? brief
          .replace(/[^a-zA-Z0-9\s]/g, "")
          .split(/\s+/)
          .filter((w: string) => w.length > 4)
          .slice(0, 10)
          .join(" ")
      : "";
    
    const query = encodeURIComponent(`${searchTerms} ${briefKeywords}`.trim());

    // Fetch from OpenAlex (free, no API key needed)
    const url = `https://api.openalex.org/works?search=${query}&filter=publication_year:2019-2025,type:article|review&per_page=${numRefs}&sort=relevance_score:desc&mailto=support@assignmentpro.uk`;

    const response = await fetch(url, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      console.error("OpenAlex error:", response.status);
      return new Response(
        JSON.stringify({ references: [], error: "Failed to fetch references" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const works: OpenAlexWork[] = data.results || [];

    const references = works
      .filter((w) => w.title && w.authorships?.length > 0)
      .map((w) => ({
        harvard: formatHarvardReference(w),
        title: w.title,
        year: w.publication_year,
        authors: w.authorships.map((a) => a.author.display_name),
        doi: w.doi,
        journal: w.primary_location?.source?.display_name || null,
        in_text: (() => {
          const firstAuthor = w.authorships[0]?.author.display_name.split(" ").pop() || "Unknown";
          if (w.authorships.length === 1) return `(${firstAuthor}, ${w.publication_year})`;
          if (w.authorships.length === 2) {
            const second = w.authorships[1]?.author.display_name.split(" ").pop();
            return `(${firstAuthor} and ${second}, ${w.publication_year})`;
          }
          return `(${firstAuthor} et al., ${w.publication_year})`;
        })(),
      }));

    return new Response(
      JSON.stringify({ references }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("fetch-references error:", error);
    return new Response(
      JSON.stringify({ references: [], error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
