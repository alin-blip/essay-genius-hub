

# Fix Generation Timeout for Large Assignments

## Problem
The `generate-assignment` edge function runs sequentially: AI generation → GPTZero scan → similarity check. For large assignments (5K-10K words), GPT-5 generation alone can take 60-120s, and the post-processing pushes total time past the edge function wall-clock limit (~150s), causing "Failed to fetch" / timeout errors.

## Root cause
- AI generation of 10K words: ~60-120s
- GPTZero scan of 10K words: ~10-20s
- Similarity check against 50 previous assignments: ~5-10s
- Total: easily exceeds edge function timeout

## Solution: Skip heavy post-checks for large assignments + add polling

### 1. Edge function: defer GPTZero & similarity for large word counts
**File:** `supabase/functions/generate-assignment/index.ts`
- If `word_count > 4000`, skip the GPTZero scan and similarity check entirely during generation
- Set `ai_detection: null` and `similarity: null` in `generation_metadata` — the user can run these checks later from the editor (the buttons already exist)
- This cuts ~20-30s off the critical path for large assignments
- Also add `max_tokens` parameter to the AI call to prevent the model from generating excessively

### 2. Client: add polling with retries on timeout
**File:** `src/pages/NewAssignment.tsx`
- When a timeout is detected, poll for the completed assignment up to 5 times (every 10s) instead of checking once
- This handles the case where the function completes after the client connection drops
- Show a "Still working..." message during polling

### 3. Client: increase timeout for large assignments
**File:** `src/pages/NewAssignment.tsx`
- Scale timeout based on word count: `Math.max(300000, wordCount * 30)` (30s per 1000 words, min 5 minutes)
- For 10K words: 5 minutes timeout

### Files modified
| File | Change |
|------|--------|
| `supabase/functions/generate-assignment/index.ts` | Skip GPTZero + similarity when word_count > 4000; add max_tokens to AI call |
| `src/pages/NewAssignment.tsx` | Polling retry loop on timeout; scale timeout to word count |

