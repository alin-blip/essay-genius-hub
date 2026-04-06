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

    const creditCost = Math.ceil(word_count / 100);
    if (!profile || profile.credits_balance < creditCost) {
      return new Response(JSON.stringify({ error: "Insufficient credits" }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build the system prompt — target 15% OVER requested word count to ensure minimum met
    const targetWords = Math.ceil(word_count * 1.15);
    const gradeInstruction = GRADE_INSTRUCTIONS[target_grade] || GRADE_INSTRUCTIONS.merit;
    const structureInstruction = TYPE_STRUCTURES[assignment_type] || TYPE_STRUCTURES.essay;

    const systemPrompt = `You are a real UK university student writing your own assignment. You are NOT an AI assistant — you are a human student who sometimes struggles with wording, occasionally repeats yourself, and writes the way real people do.

## YOUR WRITING PERSONALITY (CRITICAL — this is what makes you human)
- You think out loud in your writing. Sometimes you start a sentence one way then redirect: "The data shows — or at least suggests — that..."
- You have favourite phrases you overuse slightly (pick 2-3 and reuse them naturally throughout)
- Your paragraphs vary wildly in length. Some are 2 sentences. Some are 8.
- You sometimes use slightly clumsy transitions: "Moving on to...", "On another note...", "Going back to the point about..."
- You occasionally start sentences with "And" or "But" 
- You use contractions naturally: "doesn't", "isn't", "won't", "it's"
- You sometimes write in a slightly conversational way before catching yourself and becoming more formal again
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

## Grade Level
${gradeInstruction}

## Assignment Structure
${structureInstruction}

## Referencing
${include_harvard_refs ? `Use Harvard referencing style throughout:
- In-text: (Author, Year) or Author (Year). Vary which format you use — don't be consistent (real students aren't).
- Sometimes put the citation mid-sentence, sometimes at the end
- Full reference list at the end in alphabetical order
- Mix of recent (2019-2025) and older seminal works
- Mix journals, books, reputable websites, and government reports
- Aim for ${Math.max(10, Math.ceil(word_count / 300))} references minimum
- Make ALL references real and plausible for the UK academic context` : "Do not include formal referencing."}

${include_case_studies ? `## Case Studies
Include 2-3 real-world case studies or examples. Name specific companies, organisations, or events with approximate dates and outcomes. Integrate them naturally — don't just bolt them on.` : ""}

## WORD COUNT — ABSOLUTE MINIMUM: ${word_count} WORDS
You MUST write at least ${targetWords} words. This is a hard requirement. Count your output mentally as you write. If you feel yourself wrapping up too early, add more depth, another example, or expand your analysis. Do NOT write fewer than ${word_count} words under any circumstances. Err on the side of writing MORE rather than less.

## Output Format
Write the complete assignment. Use markdown: ## for main sections, ### for subsections. Do NOT include title page, word count, or meta-commentary.`;

    const userPrompt = `Write a ${assignment_type.replace(/_/g, " ")} for:

**Module:** ${module_name || "Not specified"}
${unit_number ? `**Unit:** ${unit_number}` : ""}
**Title:** ${title}

**Assignment Brief:**
${assignment_brief || "No specific brief provided. Write based on the title."}

${additional_instructions ? `**Additional Instructions:**\n${additional_instructions}` : ""}

REMEMBER: You MUST write at least ${word_count} words. Write the full assignment now.`;

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
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "AI service is busy. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI service credits exhausted. Please contact support." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ error: "Failed to generate assignment" }), {
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
        status: "completed",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(JSON.stringify({ error: "Failed to save assignment" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Deduct credits using service role
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    await adminClient
      .from("profiles")
      .update({ credits_balance: profile.credits_balance - creditCost })
      .eq("user_id", user.id);

    return new Response(
      JSON.stringify({
        assignment_id: assignment.id,
        content: generatedContent,
        credits_used: creditCost,
        credits_remaining: profile.credits_balance - creditCost,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
