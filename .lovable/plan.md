

## Plan: Enhanced Assignment Generation — Charts/Data Support, Uniqueness, and Generation Report

### What the user asked for

1. **Charts, data tables, balance sheets** — When the brief mentions graphs, spreadsheets, accounting (e.g. balance sheets, income statements), the AI should generate them (as markdown tables, formatted financial statements, etc.)
2. **Uniqueness guarantee** — Each assignment must be unique, even for the same type/title/student. No similarity between assignments. Anti-plagiarism built in.
3. **Generation details/report** — After generation, show a summary card with stats: word count achieved, uniqueness seed, what was included (refs count, case studies, tables/charts detected, etc.)

---

### Technical Changes

#### 1. Update system prompt in `generate-assignment/index.ts`

Add two new sections to the system prompt:

**A. Charts, Tables & Financial Data instruction:**
```
## DATA, CHARTS & FINANCIAL STATEMENTS
If the assignment brief mentions charts, graphs, tables, data analysis, balance sheets, 
income statements, cash flow statements, trial balances, or any accounting/financial documents:
- Create detailed markdown tables with realistic but fictional data
- For accounting: produce properly formatted Balance Sheets, P&L / Income Statements, 
  Cash Flow Statements with correct double-entry structure
- For data analysis: create data tables and describe chart interpretations 
  (bar charts, pie charts, line graphs) with textual analysis
- Use proper accounting conventions (debits/credits, totals, sub-totals)
- Label all figures (Figure 1, Table 1, etc.) and reference them in the text
Note: Since output is markdown text, describe visual charts in detail and provide 
the underlying data in table format.
```

**B. Uniqueness instruction — inject a random seed into the prompt:**
- Generate a unique `sessionSeed` (random UUID + timestamp) per request
- Add to the system prompt:
```
## UNIQUENESS REQUIREMENT
Every assignment you write must be completely unique. Use this unique seed to vary your 
approach: ${sessionSeed}
- Choose different opening angles, examples, case studies, and argument orderings each time
- Vary your sentence structures, paragraph lengths, and transitions
- Select different references and cite them in different combinations
- Never produce the same introduction, conclusion, or argument flow twice
```

#### 2. Post-generation analysis in the edge function

After receiving `generatedContent`, compute stats before returning:

- **Actual word count**: `generatedContent.split(/\s+/).length`
- **Reference count**: count occurrences matching Harvard ref patterns `(Author, Year)`
- **Tables detected**: count markdown table occurrences (`|---|`)
- **Figures/charts mentioned**: count `Figure \d+` or `Table \d+` patterns
- **Has financial statements**: detect keywords like "Balance Sheet", "Income Statement"
- **Uniqueness seed used**: return the seed for transparency

Add these to the response JSON as a `generation_report` object:
```json
{
  "assignment_id": "...",
  "content": "...",
  "credits_used": 3000,
  "credits_remaining": 2000,
  "generation_report": {
    "actual_word_count": 3450,
    "requested_word_count": 3000,
    "references_count": 12,
    "tables_count": 3,
    "figures_mentioned": 2,
    "has_financial_data": true,
    "includes_case_studies": true,
    "uniqueness_seed": "a1b2c3..."
  }
}
```

#### 3. Update `NewAssignment.tsx` — show generation report

After successful generation, before navigating to the editor, show a brief toast or update the completion screen with the stats:

- Change the success toast to include: actual word count, references count, tables/charts included
- Update the credit cost display (line 126 and line 420) — currently shows `Math.ceil(wordCount[0] / 100)` and "÷ 100" which is wrong since the backend now deducts `word_count` directly. Fix to show `wordCount[0]` as the cost.

#### 4. Show generation report in `AssignmentEditor.tsx`

Add a collapsible "Generation Details" card in the editor sidebar showing:
- Actual word count vs requested
- Number of references detected
- Tables/charts included
- Uniqueness confirmation

This data will be stored in a new `generation_metadata` column on the `assignments` table (JSONB).

#### 5. Database migration

Add a nullable JSONB column to `assignments`:
```sql
ALTER TABLE public.assignments ADD COLUMN generation_metadata jsonb DEFAULT NULL;
```

---

### Files Changed

| File | Change |
|------|--------|
| `supabase/functions/generate-assignment/index.ts` | Add charts/data prompt, uniqueness seed, post-generation analysis, save metadata |
| `src/pages/NewAssignment.tsx` | Fix credit cost display (remove ÷100), show generation report in toast |
| `src/pages/AssignmentEditor.tsx` | Add "Generation Details" collapsible card |
| Migration | Add `generation_metadata` JSONB column to `assignments` |

