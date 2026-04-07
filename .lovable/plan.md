

## Fix: Word Count Deduction Bug

### Problem
The `credits_balance` field stores **word counts** (e.g., 5000 for free, 6000 for Student Basic), but the `generate-assignment` function deducts `Math.ceil(word_count / 100)` instead of the actual `word_count`. So a 3000-word assignment only deducts 30 instead of 3000.

### Root Cause
Line 148 in `supabase/functions/generate-assignment/index.ts`:
```
const creditCost = Math.ceil(word_count / 100);
```
This divides by 100 as if 1 credit = 100 words, but `credits_balance` already represents words directly (confirmed by `TIER_CREDITS` in `check-subscription` which sets values like 6000, 14000, etc.).

### Fix

**1. Update `generate-assignment/index.ts`**
- Change `creditCost` calculation from `Math.ceil(word_count / 100)` to simply `word_count`
- Update the insufficient credits check accordingly
- Update the deduction and response to use the correct value

**2. Fix existing user balances (optional migration)**
- The current user with `credits_balance = 4950` should actually be at `5000 - 3000 - 500 = 1500` if tracked correctly. A one-time correction may be needed, or we can leave it as-is since the incorrect deductions gave users more credits than they should have.

### Files Changed
- `supabase/functions/generate-assignment/index.ts` — fix the credit cost calculation (single line change + update references)

