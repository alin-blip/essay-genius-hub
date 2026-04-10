import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GRADE_INSTRUCTIONS: Record<string, string> = {
  pass: `Write at a Pass level (40-49%). Use straightforward language with basic analysis. Show understanding of key concepts but keep critical evaluation minimal. Use simple sentence structures and common academic vocabulary. Include basic references but don't over-cite. The writing should demonstrate foundational knowledge without deep exploration.`,
  merit: `Write at a Merit/2:2 level (50-59%). Show good understanding with some analytical depth. Include relevant examples and some critical discussion. Use a mix of simple and complex sentences. Demonstrate engagement with the literature but don't be exhaustive. Show awareness of different perspectives without deeply evaluating them.`,
  distinction_lower: `Write at an Upper Second/2:1 level (60-69%). Demonstrate strong critical analysis with well-structured arguments. Synthesise multiple sources effectively. Use sophisticated academic language while remaining clear. Show ability to evaluate theories and models critically. Include counter-arguments and demonstrate independent thinking. Reference a good range of academic sources.`,
  distinction: `Write at a Distinction/First Class level (70%+). Display exceptional depth, originality, and critical evaluation. Demonstrate mastery of the subject with nuanced arguments. Synthesise complex ideas from multiple sources seamlessly. Use precise, sophisticated academic vocabulary. Show original insight and independent critical thinking. Challenge existing perspectives with well-evidenced arguments. Include extensive, diverse academic references.`,
};

const TYPE_STRUCTURES: Record<string, string> = {
  essay: `Structure as an academic essay:
- Introduction (10% of word count): Context, thesis statement, outline of arguments
- Main Body (80%): 3-5 thematic sections with clear topic sentences, evidence, analysis, and evaluation
- Conclusion (10%): Summary of key arguments, restate thesis with nuance, implications`,
  report: `Structure as a formal academic report:
- Title Page
- Executive Summary
- Table of Contents
- Introduction: Background, aims, objectives
- Main Body: Findings organized by theme/section with numbered headings (1.0, 1.1, etc.)
- Analysis/Discussion
- Conclusions
- Recommendations
- References
- Appendices (if relevant)`,
  case_study: `Structure as a case study analysis:
- Introduction: Context and background of the case
- Problem Identification: Key issues and challenges
- Analysis: Apply relevant theories and frameworks to the case
- Evaluation: Assess different perspectives and solutions
- Recommendations: Evidence-based recommendations
- Conclusion: Summary and lessons learned`,
  reflective_account: `Structure as a reflective account using Gibbs' Reflective Cycle or similar framework:
- Description: What happened?
- Feelings: What were you thinking and feeling?
- Evaluation: What was good and bad about the experience?
- Analysis: What sense can you make of the situation?
- Conclusion: What else could you have done?
- Action Plan: What would you do differently next time?
Use first person throughout. Be personal yet analytical.`,
  research_project: `Structure as a research project:
- Abstract
- Introduction: Research context, rationale, aims and objectives, research questions
- Literature Review: Critical review of existing research
- Methodology: Research design, methods, sampling, ethics
- Findings/Results: Presentation of data
- Discussion: Analysis of findings in relation to literature
- Conclusion and Recommendations
- References`,
  literature_review: `Structure as a literature review:
- Introduction: Scope, search strategy, key themes
- Thematic sections: Organize by themes, not by author. Compare and contrast sources.
- Critical evaluation: Identify gaps, contradictions, and consensus in the literature
- Conclusion: Summary of key findings, identified gaps, directions for future research`,
  dissertation: `Structure as a dissertation chapter. Generate the Introduction and Literature Review chapters:
- Chapter 1 - Introduction: Background, rationale, aims, objectives, research questions, structure overview
- Chapter 2 - Literature Review: Comprehensive critical review organized thematically`,
  presentation: `Structure as presentation content with slide-by-slide outline:
- Title Slide
- Introduction/Overview slide
- 6-10 content slides with key points and speaker notes
- Conclusion slide
- References slide
Include speaker notes for each slide.`,
};

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

    const body = await req.json();
    const {
      title,
      module_name,
      unit_number,
      assignment_type,
      target_grade,
      word_count,
      assignment_brief,
      additional_instructions,
      include_harvard_refs,
      include_case_studies,
    } = body;

    // Validate required fields and ranges
    const VALID_TYPES = ["essay", "report", "case_study", "reflective_account", "research_project", "literature_review", "dissertation", "presentation"];
    const VALID_GRADES = ["pass", "merit", "distinction_lower", "distinction"];

    if (!title || typeof title !== "string" || title.length > 500) {
      return new Response(JSON.stringify({ error: "Invalid or missing title" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!VALID_TYPES.includes(assignment_type)) {
      return new Response(JSON.stringify({ error: "Invalid assignment type" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!VALID_GRADES.includes(target_grade)) {
      return new Response(JSON.stringify({ error: "Invalid target grade" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (typeof word_count !== "number" || word_count < 100 || word_count > 10000) {
      return new Response(JSON.stringify({ error: "Word count must be between 100 and 10,000" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check credits
    const { data: profile } = await supabase
      .from("profiles")
      .select("credits_balance")
      .eq("user_id", user.id)
      .single();

    const creditCost = word_count;
    if (!profile || profile.credits_balance < creditCost) {
      return new Response(JSON.stringify({ error: "Insufficient credits" }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate a unique session seed for uniqueness guarantee
    const sessionSeed = crypto.randomUUID() + "-" + Date.now();
    const creditsBefore = profile.credits_balance;

    // Step 1: Fetch real academic references from OpenAlex
    let realReferences: Array<{ harvard: string; in_text: string }> = [];
    try {
      const refResponse = await fetch(
        `${supabaseUrl}/functions/v1/fetch-references`,
        {
          method: "POST",
          headers: {
            Authorization: authHeader,
            apikey: supabaseKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            topic: title,
            brief: assignment_brief || "",
            count: Math.max(10, Math.ceil(word_count / 300)),
          }),
        }
      );
      if (refResponse.ok) {
        const refData = await refResponse.json();
        realReferences = refData.references || [];
        console.log(`Fetched ${realReferences.length} real references from OpenAlex`);
      }
    } catch (e) {
      console.error("Failed to fetch references:", e);
    }

    // Build the system prompt
    const targetWords = word_count;
    const gradeInstruction = GRADE_INSTRUCTIONS[target_grade] || GRADE_INSTRUCTIONS.merit;
    const structureInstruction = TYPE_STRUCTURES[assignment_type] || TYPE_STRUCTURES.essay;

    // Build references instruction with real sources
    const referencesInstruction = realReferences.length > 0
      ? `Use ONLY these real academic references throughout. You MUST cite them using Harvard style.
Here are your references — use at least ${Math.min(realReferences.length, 8)} of them:

REFERENCE LIST:
${realReferences.map((r: any) => r.harvard).join("\n")}

IN-TEXT CITATION FORMATS:
${realReferences.map((r: any) => r.in_text).join(", ")}

Include the full reference list at the end of your assignment.`
      : include_harvard_refs
      ? `Use Harvard referencing style throughout. Mix of recent (2019-2025) and older seminal works. Aim for ${Math.max(10, Math.ceil(word_count / 300))} references minimum.`
      : "Do not include formal referencing.";

    const systemPrompt = `You are a real UK university student writing your own assignment. You are NOT an AI assistant — you are a human student who sometimes struggles with wording, occasionally repeats yourself, and writes the way real people do.

## YOUR WRITING PERSONALITY (CRITICAL — this is what makes you human)
- You think out loud in your writing. Sometimes you start a sentence one way then redirect: "The data shows — or at least suggests — that..."
- You have favourite phrases you overuse slightly (pick 2-3 and reuse them naturally throughout)
- Your paragraphs vary wildly in length. Some are 2 sentences. Some are 8.
- You sometimes use slightly clumsy transitions: "Moving on to...", "On another note...", "Going back to the point about..."
- You occasionally start sentences with "And" or "But" 
- You use contractions naturally: "doesn't", "isn't", "won't", "it's"
- You sometimes write in a slightly conversational way before catching yourself and becoming more formal again
- You use filler phrases a student would: "to be fair", "in a way", "if anything", "I suppose", "arguably"

## BURSTINESS (CRITICAL FOR BYPASSING AI DETECTORS)
AI detectors measure "burstiness" — how much sentence length and complexity varies. Real human writing has HIGH burstiness. AI writing has low burstiness (uniform sentences).
- Alternate dramatically: write a 35-word complex sentence, then a 4-word punchy one. Then a medium one. Then two short ones in a row. Then a sprawling one.
- Have at least one paragraph that's just 1-2 sentences.
- Have at least one paragraph that runs 7+ sentences and feels slightly too long.
- Include at least 2-3 sentence fragments throughout: "A fair point." "Not quite." "Easier said than done."

## DELIBERATE IMPERFECTIONS (makes it feel authentically student-written)
- Include one parenthetical aside that slightly derails before getting back on track
- Have one transition that feels slightly forced or awkward
- In one place, make a point then partially repeat it 2 paragraphs later in different words (students do this)
- Use one slightly informal phrase that's borderline too casual for academic writing, then immediately follow with a formal sentence
- You make minor redundancies — saying something twice in slightly different ways
- Your vocabulary is good but not artificially perfect. You repeat key terms rather than finding 5 synonyms.
- You use British English: analyse, organisation, behaviour, colour, programme, centre, defence

## BANNED WORDS AND PHRASES (NEVER USE THESE — instant AI detection)
- "delve", "delving", "tapestry", "multifaceted", "nuanced", "intricate", "pivotal"
- "it's important to note", "it is worth noting that", "it should be noted"
- "in today's [anything]", "in the realm of", "the landscape of"  
- "a testament to", "serves as a reminder", "sheds light on"
- "comprehensive", "robust", "groundbreaking", "innovative" (overused by AI)
- "navigating the complexities", "at its core", "the interplay between"
- "This essay will explore/examine/investigate" (in introduction)
- "In conclusion, it can be said that" or any formulaic conclusion opener
- Perfect parallel structures in lists — vary your list formats

## SENTENCE STRUCTURE (CRITICAL FOR BYPASSING DETECTION)
- NEVER write 3+ consecutive sentences of similar length
- Aim for this pattern: long (25-30 words), short (5-10), medium (15-20), very short (3-7), long (25-35)
- Use sentence fragments occasionally: "A significant finding." "Not entirely convincing."
- Include compound-complex sentences that feel slightly unwieldy — like a student trying to pack too much in
- Mix declarative, interrogative, and occasional exclamatory sentences

## DATA, CHARTS & FINANCIAL STATEMENTS
If the assignment brief mentions charts, graphs, tables, data analysis, balance sheets, income statements, cash flow statements, trial balances, or any accounting/financial documents:
- Create detailed markdown tables with realistic but fictional data
- For accounting: produce properly formatted Balance Sheets, P&L / Income Statements, Cash Flow Statements with correct double-entry structure
- For data analysis: create data tables and describe chart interpretations (bar charts, pie charts, line graphs) with textual analysis
- Use proper accounting conventions (debits/credits, totals, sub-totals)
- Label all figures (Figure 1, Table 1, etc.) and reference them in the text
Note: Since output is markdown text, describe visual charts in detail and provide the underlying data in table format.

## UNIQUENESS REQUIREMENT
Every assignment you write must be completely unique. Use this unique seed to vary your approach: ${sessionSeed}
- Choose different opening angles, examples, case studies, and argument orderings each time
- Vary your sentence structures, paragraph lengths, and transitions
- Select different references and cite them in different combinations
- Never produce the same introduction, conclusion, or argument flow twice

## Grade Level
${gradeInstruction}

## Assignment Structure
${structureInstruction}

    ## Referencing
    ${referencesInstruction}

${include_case_studies ? `## Case Studies
Include 2-3 real-world case studies or examples. Name specific companies, organisations, or events with approximate dates and outcomes. Integrate them naturally — don't just bolt them on.` : ""}

## WORD COUNT — EXACTLY ${word_count} WORDS (±5% tolerance)
You MUST write approximately ${word_count} words. Your output must be between ${Math.floor(word_count * 0.95)} and ${Math.ceil(word_count * 1.05)} words. This is a hard requirement. Count your output carefully as you write. Do NOT write significantly more or less than ${word_count} words. If you find yourself going over, cut content. If under, add depth. The target is EXACTLY ${word_count} words.

## Output Format
Write the complete assignment. Use markdown: ## for main sections, ### for subsections. Do NOT include title page, word count, or meta-commentary.`;

    const userPrompt = `Write a ${assignment_type.replace(/_/g, " ")} for:

**Module:** ${module_name || "Not specified"}
${unit_number ? `**Unit:** ${unit_number}` : ""}
**Title:** ${title}

**Assignment Brief:**
${assignment_brief || "No specific brief provided. Write based on the title."}

${additional_instructions ? `**Additional Instructions:**\n${additional_instructions}` : ""}

REMEMBER: You MUST write approximately ${word_count} words (±5%). Not more, not less. Write the full assignment now.`;

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
        model: "openai/gpt-5",
        temperature: 1,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      
      // Log the failure for audit
      const serviceRoleKeyForLog = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const logClient = createClient(supabaseUrl, serviceRoleKeyForLog);
      await logClient.from("generation_logs").insert({
        user_id: user.id,
        requested_word_count: word_count,
        credits_before: creditsBefore,
        ai_provider_status: aiResponse.status,
        failure_step: "ai_generation",
        error_message: errText.substring(0, 500),
        metadata: { target_grade, assignment_type },
      });
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "AI service is busy. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Our AI service is temporarily unavailable. Please try again in a few minutes. No credits have been charged." }), {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ error: "Failed to generate assignment. Please try again. No credits have been charged." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const generatedContent = aiData.choices?.[0]?.message?.content;

    if (!generatedContent) {
      return new Response(JSON.stringify({ error: "No content generated" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Post-generation analysis
    const actualWordCount = generatedContent.split(/\s+/).filter((w: string) => w.length > 0).length;
    const referencesCount = (generatedContent.match(/\([A-Z][a-z]+(?:\s(?:and|&)\s[A-Z][a-z]+)?,\s*\d{4}\)/g) || []).length;
    const tablesCount = (generatedContent.match(/\|[-:]+\|/g) || []).length;
    const figuresMentioned = (generatedContent.match(/(?:Figure|Table|Chart|Graph)\s+\d+/gi) || []).length;
    const financialKeywords = ["balance sheet", "income statement", "cash flow", "trial balance", "profit and loss", "p&l"];
    const hasFinancialData = financialKeywords.some(kw => generatedContent.toLowerCase().includes(kw));
    const hasCaseStudies = include_case_studies && /case\s+stud/i.test(generatedContent);

    // --- Auto-check: AI Detection ---
    let aiDetectionResult = null;
    try {
      const sampleText = generatedContent.length > 5000 ? generatedContent.slice(0, 5000) : generatedContent;
      const aiDetectResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `You are an AI detection analysis expert. Analyze the given text and estimate how likely it is to be flagged as AI-generated by common detectors (Turnitin AI, GPTZero, Winston AI, Originality.ai).

You MUST respond with ONLY a valid JSON object. No other text, no markdown, no code blocks.

The JSON must have exactly these fields:
{
  "overall_score": <number 0-100, percentage likely AI-detected>,
  "human_score": <number 0-100, percentage appearing human-written>,
  "details": "<string: 1-2 sentence analysis>"
}`,
            },
            { role: "user", content: `Analyze this text for AI detection:\n\n${sampleText}` },
          ],
          temperature: 0.3,
        }),
      });

      if (aiDetectResponse.ok) {
        const aiDetectData = await aiDetectResponse.json();
        const rawAiContent = aiDetectData.choices?.[0]?.message?.content?.trim();
        try {
          const cleaned = rawAiContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
          const parsed = JSON.parse(cleaned);
          aiDetectionResult = {
            overall_score: Math.min(100, Math.max(0, Math.round(parsed.overall_score))),
            human_score: Math.min(100, Math.max(0, Math.round(parsed.human_score))),
            details: parsed.details || "Analysis complete.",
          };
        } catch {
          aiDetectionResult = { overall_score: 50, human_score: 50, details: "Could not fully analyze." };
        }
      }
    } catch (e) {
      console.error("Auto AI detection check failed:", e);
    }

    // --- Auto-check: Similarity ---
    let similarityResult = null;
    try {
      const serviceRoleKeyForSim = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const simClient = createClient(supabaseUrl, serviceRoleKeyForSim);

      const { data: previousAssignments } = await simClient
        .from("assignments")
        .select("id, title, generated_content, humanized_content")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(50);

      if (previousAssignments && previousAssignments.length > 0) {
        const ngrams = (text: string, n: number): Set<string> => {
          const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(Boolean);
          const s = new Set<string>();
          for (let i = 0; i <= words.length - n; i++) {
            s.add(words.slice(i, i + n).join(" "));
          }
          return s;
        };
        const jaccard = (a: Set<string>, b: Set<string>): number => {
          if (a.size === 0 && b.size === 0) return 0;
          let intersection = 0;
          for (const x of a) if (b.has(x)) intersection++;
          return intersection / (a.size + b.size - intersection);
        };

        const currentNgrams = ngrams(generatedContent, 4);
        let maxSim = 0;
        let topMatch = "";

        for (const prev of previousAssignments) {
          const prevContent = prev.humanized_content || prev.generated_content;
          if (!prevContent) continue;
          const sim = Math.round(jaccard(currentNgrams, ngrams(prevContent, 4)) * 100);
          if (sim > maxSim) {
            maxSim = sim;
            topMatch = prev.title;
          }
        }

        let verdict = "unique";
        if (maxSim > 50) verdict = "high_similarity";
        else if (maxSim > 25) verdict = "moderate_similarity";
        else if (maxSim > 10) verdict = "low_similarity";

        similarityResult = {
          overall_similarity: maxSim,
          verdict,
          most_similar_title: topMatch || null,
        };
      } else {
        similarityResult = { overall_similarity: 0, verdict: "unique", most_similar_title: null };
      }
    } catch (e) {
      console.error("Auto similarity check failed:", e);
    }

    const generationMetadata = {
      actual_word_count: actualWordCount,
      requested_word_count: word_count,
      references_count: referencesCount,
      tables_count: tablesCount,
      figures_mentioned: figuresMentioned,
      has_financial_data: hasFinancialData,
      includes_case_studies: hasCaseStudies,
      uniqueness_seed: sessionSeed,
      generated_at: new Date().toISOString(),
      ai_detection: aiDetectionResult,
      similarity: similarityResult,
    };

    // Deduct credits FIRST, then save — refund if save fails
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: newBalance } = await adminClient.rpc("deduct_credits", {
      p_user_id: user.id,
      p_amount: creditCost,
    });

    if (newBalance === -1) {
      return new Response(JSON.stringify({ error: "Insufficient credits" }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Save assignment to DB
    const { data: assignment, error: insertError } = await supabase
      .from("assignments")
      .insert({
        user_id: user.id,
        title,
        module_name,
        unit_number,
        assignment_type,
        target_grade,
        word_count,
        assignment_brief,
        additional_instructions,
        include_harvard_refs,
        include_case_studies,
        generated_content: generatedContent,
        humanized_content: null,
        status: "completed",
        generation_metadata: generationMetadata,
      } as any)
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      // REFUND credits since we failed to save the assignment
      console.log(`Refunding ${creditCost} credits to user ${user.id} due to insert failure`);
      await adminClient.rpc("restore_credits", { p_user_id: user.id, p_amount: creditCost });
      
      await adminClient.from("generation_logs").insert({
        user_id: user.id,
        requested_word_count: word_count,
        credits_before: creditsBefore,
        credits_after: creditsBefore, // refunded
        credits_charged: 0,
        ai_provider_status: 200,
        failure_step: "db_insert",
        error_message: insertError.message?.substring(0, 500),
        metadata: { target_grade, assignment_type, refunded: true },
      });

      return new Response(JSON.stringify({ error: "Failed to save assignment. Credits have been refunded." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log the generation for audit trail
    await adminClient.from("generation_logs").insert({
      user_id: user.id,
      assignment_id: assignment.id,
      requested_word_count: word_count,
      actual_word_count: actualWordCount,
      credits_before: creditsBefore,
      credits_after: newBalance ?? creditsBefore - creditCost,
      credits_charged: creditCost,
      ai_provider_status: 200,
      metadata: { target_grade, assignment_type },
    });

    return new Response(
      JSON.stringify({
        assignment_id: assignment.id,
        content: generatedContent,
        credits_used: creditCost,
        credits_remaining: newBalance ?? creditsBefore - creditCost,
        generation_report: generationMetadata,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Edge function error:", error);
    // Attempt to refund credits on unexpected errors
    try {
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const adminClient = createClient(supabaseUrl, serviceRoleKey);
      
      // Try to get user from auth header for refund
      const authHeader = req.headers.get("Authorization");
      if (authHeader) {
        const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
        const userClient = createClient(supabaseUrl, supabaseKey, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: { user } } = await userClient.auth.getUser();
        if (user) {
          const body = await req.clone().json().catch(() => null);
          const wc = body?.word_count;
          if (wc && typeof wc === "number") {
            console.log(`Refunding ${wc} credits to user ${user.id} due to unexpected error`);
            await adminClient.rpc("restore_credits", { p_user_id: user.id, p_amount: wc });
          }
        }
      }
    } catch (refundErr) {
      console.error("Refund attempt failed:", refundErr);
    }
    
    return new Response(
      JSON.stringify({ error: "Generation failed. Credits have been refunded. Please try again." }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
