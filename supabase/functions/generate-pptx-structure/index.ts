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
- image_prompt: optional string. When a slide would benefit from a visual, add a detailed image_prompt. Use for slides about processes, data, comparisons, case studies. Do NOT add images to title or conclusion slides.
- Keep text concise — bullet points max 15 words each
- Use academic language appropriate for UK universities
- Aim for 30-50% of content slides to have image_prompt for visual variety
- image_prompt should describe a professional, clean illustration or diagram suitable for an academic presentation.
- Number of slides based on word count: roughly 1 slide per 200 words of source content, max 25 slides

Return ONLY valid JSON array, no markdown fences.`;

function summarizeForSlides(content: string, maxChars: number): string {
  if (content.length <= maxChars) return content;
  
  // Split into paragraphs and take the most important ones
  const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 20);
  
  // Take intro, evenly spaced middle sections, and conclusion
  if (paragraphs.length <= 6) return content.substring(0, maxChars);
  
  const selected: string[] = [];
  // Always include first 2 paragraphs (intro)
  selected.push(paragraphs[0], paragraphs[1]);
  
  // Sample evenly from middle
  const middle = paragraphs.slice(2, -2);
  const step = Math.max(1, Math.floor(middle.length / 8));
  for (let i = 0; i < middle.length; i += step) {
    selected.push(middle[i]);
  }
  
  // Always include last 2 paragraphs (conclusion)
  selected.push(paragraphs[paragraphs.length - 2], paragraphs[paragraphs.length - 1]);
  
  let result = selected.join("\n\n");
  if (result.length > maxChars) result = result.substring(0, maxChars);
  return result;
}

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
    const targetSlides = Math.max(6, Math.min(25, Math.round(wordCount / 200)));

    // For large content, intelligently summarize rather than truncating mid-sentence
    const processedContent = summarizeForSlides(content, 8000);

    const userPrompt = `Create a ${targetSlides}-slide presentation from this assignment.

Title: ${title || "Untitled"}
Module: ${module_name || "N/A"}
Word count: ~${wordCount} words

Assignment content (key sections):
${processedContent}`;

    console.log(`[generate-pptx] ${wordCount} words → ${targetSlides} slides, content chars: ${processedContent.length}`);

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
        max_tokens: 8192,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error(`[generate-pptx] AI error ${aiResponse.status}: ${errText}`);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited — please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI call failed [${aiResponse.status}]`);
    }

    const aiData = await aiResponse.json();
    const finishReason = aiData.choices?.[0]?.finish_reason;
    let slidesText = aiData.choices?.[0]?.message?.content || "";
    
    console.log(`[generate-pptx] finish_reason: ${finishReason}, content length: ${slidesText.length}`);

    if (!slidesText) {
      throw new Error("AI returned empty response — content may be too large. Try a shorter assignment.");
    }

    // Clean markdown fences if present
    slidesText = slidesText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    
    // Handle truncated JSON from MAX_TOKENS
    let slides: any[];
    try {
      slides = JSON.parse(slidesText);
    } catch (parseErr) {
      console.error(`[generate-pptx] JSON parse failed, attempting repair. finishReason=${finishReason}`);
      // Try to repair truncated JSON array
      let repaired = slidesText;
      // Close any open strings and objects
      const openBraces = (repaired.match(/{/g) || []).length - (repaired.match(/}/g) || []).length;
      const openBrackets = (repaired.match(/\[/g) || []).length - (repaired.match(/]/g) || []).length;
      for (let i = 0; i < openBraces; i++) repaired += "}";
      for (let i = 0; i < openBrackets; i++) repaired += "]";
      
      try {
        slides = JSON.parse(repaired);
      } catch {
        // Last resort: find the last complete object
        const lastComplete = repaired.lastIndexOf("},");
        if (lastComplete > 0) {
          try {
            slides = JSON.parse(repaired.substring(0, lastComplete + 1) + "]");
          } catch {
            throw new Error("Failed to parse AI response. Please try again.");
          }
        } else {
          throw new Error("Failed to parse AI response. Please try again.");
        }
      }
    }

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
