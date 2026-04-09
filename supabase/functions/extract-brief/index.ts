import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ZipReader, BlobReader, TextWriter } from "https://deno.land/x/zipjs@v2.7.32/index.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Extract plain text from a DOCX file (which is a ZIP containing XML).
 * Reads word/document.xml and strips XML tags to get the text content.
 */
async function extractTextFromDocx(blob: Blob): Promise<string> {
  const reader = new ZipReader(new BlobReader(blob));
  const entries = await reader.getEntries();

  const docEntry = entries.find((e: any) => e.filename === "word/document.xml");
  if (!docEntry) {
    await reader.close();
    throw new Error("Invalid DOCX: word/document.xml not found");
  }

  const xmlText = await docEntry.getData!(new TextWriter());
  await reader.close();

  // Parse XML to extract text content from <w:t> tags, preserving paragraphs
  const paragraphs: string[] = [];
  // Split by paragraph tags <w:p ...>...</w:p>
  const pRegex = /<w:p[\s>][\s\S]*?<\/w:p>/g;
  let pMatch;
  while ((pMatch = pRegex.exec(xmlText)) !== null) {
    const pContent = pMatch[0];
    // Extract all <w:t ...>text</w:t> within this paragraph
    const tRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
    let tMatch;
    let paraText = "";
    while ((tMatch = tRegex.exec(pContent)) !== null) {
      paraText += tMatch[1];
    }
    if (paraText.trim()) {
      paragraphs.push(paraText.trim());
    }
  }

  return paragraphs.join("\n\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const aiGatewayKey = Deno.env.get("LOVABLE_API_KEY")!;

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    const { file_path } = await req.json();
    if (!file_path || typeof file_path !== "string") {
      return new Response(JSON.stringify({ error: "file_path is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Download the file using service role to bypass RLS on storage
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: fileData, error: downloadError } = await adminClient.storage
      .from("assignment-briefs")
      .download(file_path);

    if (downloadError || !fileData) {
      return new Response(JSON.stringify({ error: "Failed to download file: " + (downloadError?.message || "unknown") }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fileType = file_path.split(".").pop()?.toLowerCase() || "";
    let contentForAI = "";

    if (fileType === "txt") {
      contentForAI = await fileData.text();
    } else if (fileType === "docx") {
      // Parse DOCX directly — it's a ZIP with XML inside
      contentForAI = await extractTextFromDocx(fileData);
    } else if (["pdf", "png", "jpg", "jpeg"].includes(fileType)) {
      // For PDF and images, use Gemini multimodal
      const arrayBuffer = await fileData.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < uint8Array.length; i++) {
        binary += String.fromCharCode(uint8Array[i]);
      }
      const base64Content = btoa(binary);

      const mimeMap: Record<string, string> = {
        pdf: "application/pdf",
        png: "image/png",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
      };
      const mimeType = mimeMap[fileType] || "application/octet-stream";

      const extractionResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${aiGatewayKey}`,
          "Content-Type": "application/json",
          "x-lovable-project-id": Deno.env.get("LOVABLE_PROJECT_ID") || "",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `You are an expert document extraction assistant specialising in UK university assignment briefs.

Your task is to extract ALL text content from the uploaded document accurately and completely.

EXTRACTION RULES:
1. Extract EVERY piece of text from the document — do not summarise or skip anything
2. Preserve the original structure: headings, bullet points, numbered lists, tables
3. Include ALL:
   - Assignment title and module information
   - Learning outcomes and assessment criteria
   - Task descriptions and requirements
   - Word count requirements
   - Submission guidelines
   - Marking criteria / rubrics
   - Any additional notes or instructions
4. For tables, reproduce them clearly using plain text formatting
5. If the document contains images with text (e.g. screenshots of briefs), extract that text too
6. Do NOT add your own commentary or interpretation — only extract what's in the document
7. Do NOT wrap the output in markdown code blocks — just output the raw extracted text
8. Preserve paragraph breaks and formatting hierarchy`,
            },
            {
              role: "user",
              content: [
                {
                  type: "file",
                  file: {
                    filename: file_path.split("/").pop() || "document",
                    file_data: `data:${mimeType};base64,${base64Content}`,
                  },
                },
                {
                  type: "text",
                  text: "Extract ALL text content from this assignment brief document. Return the complete text exactly as it appears, preserving structure and formatting.",
                },
              ],
            },
          ],
          max_tokens: 16000,
          temperature: 0.1,
        }),
      });

      if (!extractionResponse.ok) {
        const errText = await extractionResponse.text();
        console.error("AI extraction failed:", extractionResponse.status, errText);
        return new Response(JSON.stringify({ error: "AI extraction failed. Please try pasting the text manually." }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const aiResult = await extractionResponse.json();
      contentForAI = aiResult.choices?.[0]?.message?.content || "";
    } else {
      return new Response(JSON.stringify({ error: `Unsupported file type: .${fileType}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!contentForAI || contentForAI.trim().length < 10) {
      return new Response(JSON.stringify({ error: "Could not extract meaningful text from the file. Please try pasting manually." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ extracted_text: contentForAI.trim() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("extract-brief error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
