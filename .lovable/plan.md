

## Plan: Fix generate-assignment 504 timeout

### Root Cause
The `generate-assignment` edge function is timing out (504, 150s+) because it chains too many AI calls in one request:
1. GPT-5 generation (~30-60s)
2. Gemini AI detection check (~5-10s)
3. Similarity check (DB query)
4. Up to 3 humanization passes with GPT-5 (~30-60s each) + re-detection after each

That's 4-7 AI API calls. Edge functions have a ~150s hard timeout.

### Fix: Remove auto-humanization from generation flow

The humanization loop (lines 471-575) is the main culprit. The user already has a separate "Humanize" button in the editor (`humanize-text` edge function). Running it automatically during generation is redundant and causes timeouts.

**Changes to `supabase/functions/generate-assignment/index.ts`:**
1. Remove the entire auto-humanize while loop (lines 471-575)
2. Keep the AI detection check and similarity check (they're fast, ~10s total)
3. Save only `generated_content` (no `humanized_content` at generation time)
4. The user can still humanize from the editor after generation

This reduces the flow to: 1 GPT-5 call + 1 Gemini call + 1 DB query = well within timeout.

### Also improve error handling on client
In `src/pages/NewAssignment.tsx`, the error message "Failed to send the request to the Edge Function" comes from the Supabase client when the function returns 504 or the connection drops. Add a more user-friendly catch for this specific error.

### Files changed
| File | Change |
|------|--------|
| `supabase/functions/generate-assignment/index.ts` | Remove auto-humanize loop (~100 lines). Keep detection + similarity. |
| `src/pages/NewAssignment.tsx` | Better error message for timeout/network failures |

### What users still get
- AI detection score shown in generation report (1 quick Gemini call)
- Similarity check against past assignments
- Manual "Humanize" button in the editor (works as separate function, no timeout risk)

