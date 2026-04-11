const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
import { createClient } from "jsr:@supabase/supabase-js@2";

const SLIDE_SYSTEM_PROMPT = `You are a UK university presentation designer. Given assignment content, create a structured JSON array of slides for a PowerPoint presentation.

Rules:
- Title slide first (type: "title"), then content slides, conclusion slide last
- Each slide has: type, title, content, and optionally image_prompt
- Slide types: "title", "content", "two_column", "bullet_list", "quote", "stats", "conclusion", "image_content"
- For "bullet_list": content is { bullets: string[] }
- For "two_column": content is { left: { title: string, bullets: string[] }, right: { title: string, bullets: string[] } }
- For "content": content is { text: string }
- For "title": content is { subtitle: string, author?: string }
- For "quote": content is { quote: string, attribution: string }
- For "stats": content is { stats: { value: string, label: string }[] } (max 4)
- For "conclusion": content is { bullets: string[], closing: string }
- For "image_content": content is { text: string } (text displayed alongside an image)
- image_prompt: optional string. When a slide would benefit from a visual (diagram, chart concept, illustration, photo), add a detailed image_prompt describing what to generate. Use for slides about processes, data, comparisons, case studies, or any visual concept. Do NOT add images to title or conclusion slides.
- Keep text concise — bullet points max 15 words each
- Use academic language appropriate for UK universities
- Aim for 30-50% of content slides to have image_prompt for visual variety
- image_prompt should describe a professional, clean illustration or diagram suitable for an academic presentation. Be specific about what to show.
- Number of slides based on word count: roughly 1 slide per 150 words of source content

Return ONLY valid JSON array, no markdown fences.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { content, title, module_name } = await req.json();
    if (!content) {
      return new Response(JSON.stringify({ error: "Content is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const wordCount = content.split(/\s+/).filter(Boolean).length;
    const targetSlides = Math.max(6, Math.min(25, Math.round(wordCount / 150)));

    const userPrompt = `Create a ${targetSlides}-slide presentation from this assignment.

Title: ${title || "Untitled"}
Module: ${module_name || "N/A"}

Assignment content:
${content.substring(0, 12000)}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SLIDE_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.4,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      throw new Error(`AI call failed [${aiResponse.status}]: ${errText}`);
    }

    const aiData = await aiResponse.json();
    let slidesText = aiData.choices?.[0]?.message?.content || "[]";
    
    // Clean markdown fences if present
    slidesText = slidesText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    
    const slides = JSON.parse(slidesText);

    return new Response(JSON.stringify({ slides, slide_count: slides.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("generate-pptx-structure error:", err);
    return new Response(JSON.stringify({ error: err.message || "Failed to generate presentation structure" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
