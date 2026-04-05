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
    const supabaseKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
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

    if (!title || !assignment_type || !target_grade || !word_count) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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

    // Build the system prompt
    const gradeInstruction = GRADE_INSTRUCTIONS[target_grade] || GRADE_INSTRUCTIONS.merit;
    const structureInstruction = TYPE_STRUCTURES[assignment_type] || TYPE_STRUCTURES.essay;

    const systemPrompt = `You are an expert UK university academic writer. You write assignments that are indistinguishable from genuine student work. You must follow these rules strictly:

## Writing Quality Rules (CRITICAL for avoiding AI detection)
- Vary sentence length dramatically: mix very short sentences (5-8 words) with longer complex ones (25-35 words)
- Use natural hedging phrases: "It could be argued that...", "This suggests that...", "To some extent...", "One might contend..."
- Include occasional minor stylistic imperfections that real students make (slightly informal transitions, rhetorical questions)
- Use British English spelling throughout (analyse, organisation, behaviour, colour, programme)
- Mix active and passive voice naturally (60% active, 40% passive)
- Include subject-specific terminology appropriate to the level
- Avoid AI-typical patterns: no "delve into", "it's important to note", "in conclusion it can be said", "multifaceted", "nuanced"
- Do NOT use overly perfect paragraph transitions - vary them naturally
- Include some sentences that start with "However," "Nevertheless," "Moreover," but also use "But," "Yet," "Still," informally

## Grade Level
${gradeInstruction}

## Assignment Structure
${structureInstruction}

## Referencing
${include_harvard_refs ? `Use Harvard referencing style throughout:
- In-text citations: (Author, Year) or Author (Year)
- Include a full reference list at the end
- Use a mix of recent sources (2019-2025) and seminal works
- Include a mix of journal articles, books, and reputable online sources
- Aim for ${Math.max(8, Math.ceil(word_count / 400))} references minimum
- Make references plausible and realistic for the subject area` : "Do not include formal referencing unless specifically needed."}

${include_case_studies ? `## Case Studies
Include 2-3 real-world case studies or examples relevant to the topic. Name specific companies, organisations, or events with approximate dates and outcomes.` : ""}

## Word Count Target
Write approximately ${word_count} words. This is crucial - do not significantly exceed or fall short.

## Output Format
Write the complete assignment text. Use markdown formatting for headings (## for main sections, ### for subsections). Do NOT include a title page or word count at the end.`;

    const userPrompt = `Write a ${assignment_type.replace("_", " ")} for the following:

**Module:** ${module_name || "Not specified"}
${unit_number ? `**Unit:** ${unit_number}` : ""}
**Title:** ${title}

**Assignment Brief:**
${assignment_brief || "No specific brief provided. Write based on the title."}

${additional_instructions ? `**Additional Instructions:**\n${additional_instructions}` : ""}

Generate the complete assignment now.`;

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
