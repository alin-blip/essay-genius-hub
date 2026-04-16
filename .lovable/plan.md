
The user wants a comprehensive QA pass before launch — verify each assignment type (essay, report, case study, etc.) generates correctly, with proper output (tables, references, charts, PowerPoint export, etc.) per type.

Let me think about what we have:
- 7 assignment types in `NewAssignment.tsx` (need to check exact list)
- 4 grade levels
- Word counts varying
- Outputs: text content, references, tables, AI detection, similarity, humanization, PPTX export, DOCX/PDF export

This is a QA testing plan, not a build task. I need to propose a structured testing matrix the user can run through, plus identify what I should verify in code first.

Best approach: testing matrix + automated checks where possible.

# QA Testing Plan — Pre-Launch Verification

## Objective
Verify every assignment type produces correct output (content structure, tables, references, charts, PPTX export) before opening to paying customers.

## Testing matrix

For each assignment type, run a small generation (~1500 words to save credits) and verify outputs.

| Assignment type | Must verify |
|---|---|
| **Essay** | Intro/body/conclusion structure, Harvard refs render, no markdown leftovers |
| **Report** | Executive summary, sections with `##` headings, tables render as HTML (not pipes), figures mentioned |
| **Case study** | Company context, analysis, recommendations, financial tables if applicable |
| **Literature review** | Multiple themes, refs grouped by topic, comparative analysis |
| **Reflective journal** | First-person voice, Gibbs/Kolb cycle if requested |
| **Dissertation chapter** | Chapter structure, subsections, methodology language |
| **Business plan** | Market analysis, financials, SWOT tables |

## What to verify per generated assignment

1. **Editor display**
   - Headings styled (not raw `##`)
   - Tables rendered as HTML grid (not `| col1 | col2 |`)
   - Bold/italic working
   - References list at bottom

2. **AI detection & similarity**
   - For ≤4000 words: scores show automatically
   - For >4000 words: "Run check" buttons appear (deferred per recent fix)

3. **Humanize**
   - Button works, progress shown, score drops

4. **Exports**
   - **DOCX** — opens in Word, headings/tables preserved
   - **PDF** — pagination clean, tables formatted
   - **TXT** — plain text dump
   - **PPTX** — opens in PowerPoint, theme applied, images on relevant slides, slide editor allows inline edit

5. **PPTX editor specifically**
   - Inline text edit on canvas
   - Add/replace image (upload + AI generate)
   - Add slide, reorder, delete
   - Undo/redo
   - Export downloads valid `.pptx`

## Process

### Step 1 — Code audit (I do this)
Read `NewAssignment.tsx`, `generate-assignment/index.ts`, `AssignmentEditor.tsx` to confirm:
- All assignment types listed in UI map to a `TYPE_STRUCTURES` entry in the edge function
- Reference style toggle wired through
- Table generation prompt is present for report/case study/business plan

I'll report any gaps (e.g. assignment type missing in backend).

### Step 2 — Guided manual test (you do this)
I'll give you a checklist with 7 short test runs (one per type, 1500 words each = ~7×1500 = ~10.5K credits total). For each, you confirm pass/fail on the verification points above and share screenshots of any issue.

### Step 3 — Fixes
For each failure you report, I diagnose (logs + code) and fix. Common likely issues:
- A type missing structure → AI returns generic essay
- Tables not generated for report (prompt not strong enough)
- PPTX theme not applied
- Charts missing — currently no chart generation exists; we'd need to add a chart-rendering layer if business plan/report needs it

### Step 4 — Charts decision
Currently the platform does **not** generate visual charts inside assignments — only mentions tables/figures in text and generates images for PPTX slides. If you want real charts (bar/pie/line) embedded in DOCX/PDF, that's a separate feature to build (using `chart.js` server-side render → embedded PNG).

I'll flag this in the audit and ask if you want to add it before launch or later.

## Deliverable from Step 1
A short report: "Backend supports types X, Y, Z correctly. Type W is missing structure. Tables prompt is weak for type V. Charts not implemented."

Then we proceed to manual testing with a clear checklist.
