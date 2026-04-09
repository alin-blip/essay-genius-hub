

# Targeted AI Detection Reduction System

## Problem
The current humanize function rewrites the entire text in one pass, which often isn't enough to bring AI detection scores down. The screenshot shows high AI detection even after humanization.

## Solution: Smart Targeted Humanization

Instead of rewriting everything, we build a **feedback loop** that uses GPTZero to identify exactly which sentences are flagged, then rewrites **only those sentences** — repeating until the score drops below threshold.

### Architecture

```text
User clicks "Deep Humanize"
  │
  ├─► GPTZero scan → get flagged sentences
  │
  ├─► Send ONLY flagged sentences to AI for rewriting
  │     (with surrounding context for coherence)
  │
  ├─► Replace rewritten sentences back into full text
  │
  ├─► Re-scan with GPTZero
  │     └─► If score > 15% AND passes < 3 → loop back
  │     └─► If score ≤ 15% OR passes = 3 → done, save
  │
  └─► Show progress: "Pass 1/3... 12 sentences rewritten... Score: 45% → 22%"
```

### Changes

**A. New edge function: `targeted-humanize/index.ts`**
- Accepts `content`, `assignment_id`, and optionally `flagged_sentences` from GPTZero
- If no flagged sentences provided, calls GPTZero first to get them
- Sends only sentences with `generated_prob > 0.5` to AI with a focused prompt: "Rewrite these specific sentences to sound more human, keeping the same meaning"
- Reconstructs the full text with rewritten sentences spliced back in
- Runs up to 3 passes automatically, checking GPTZero between each pass
- Returns final content + per-pass scores for the UI

**B. Enhanced humanize prompt (targeted)**
- Instead of the generic "rewrite the whole thing", the prompt receives 5-15 specific sentences with context
- More focused = better results per sentence
- Prompt emphasizes: vary sentence length, add contractions, use student voice, break uniform patterns

**C. UI: Deep Humanize button in `AssignmentEditor.tsx`**
- New "Deep Humanize" button alongside existing "Humanize"
- Shows real-time progress: current pass number, sentences being rewritten, score improvement
- Progress card with pass-by-pass breakdown: "Pass 1: 65% → 42% (14 sentences) | Pass 2: 42% → 18% (6 sentences)"
- Uses more credits (each GPTZero call + AI rewrite counts)

**D. Credit cost calculation**
- Each pass costs: GPTZero API call + AI rewrite of flagged sentences
- Estimate: 2-3x the cost of a single humanize, but much better results
- Show estimated cost before user confirms

### Files to create/modify

| File | Change |
|------|--------|
| `supabase/functions/targeted-humanize/index.ts` | **New** — multi-pass targeted humanization with GPTZero feedback loop |
| `src/pages/AssignmentEditor.tsx` | Add "Deep Humanize" button + progress UI |
| `src/components/editor/DeepHumanizeProgress.tsx` | **New** — progress component showing per-pass results |

### Credit cost
- Regular humanize: `word_count / 200` credits
- Deep humanize: `word_count / 100` credits (covers up to 3 passes + GPTZero calls)

