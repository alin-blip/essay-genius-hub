

# Assignment Manager Upsell — 3 Tiers

## Current State
Single upsell: Assignment Manager at £100/mo. Need to expand to 3 options.

## New Upsell Options

| Option | Price | Billing | What's Included |
|--------|-------|---------|-----------------|
| Monthly Manager | £100/mo | Monthly recurring | Manages assignments monthly — generates, exports, uploads |
| Academic Year | £499 | One-time (or annual) | All assignments for the full academic year, done + uploaded |
| Final Year + Dissertation | £997 | One-time (or annual) | Everything in Academic Year + dissertation/final project (Level 6 students) |

## Technical Steps

### Step 1: Create 2 New Stripe Products
- **Academic Year Manager** — £499 recurring yearly (or one-time)
- **Final Year + Dissertation Manager** — £997 recurring yearly (or one-time)
- Keep existing £100/mo product as-is

### Step 2: Update `subscription-tiers.ts`
- Replace single `MANAGER_ADDON` with `MANAGER_ADDONS` array containing all 3 options with price IDs, descriptions, and billing intervals

### Step 3: Update `check-subscription` Edge Function
- Recognize all 3 manager product IDs (not just one)
- Return which manager tier is active (monthly, academic_year, final_year)

### Step 4: Update `PricingSection.tsx`
- Replace single add-on card with 3 cards in a grid
- Each card shows price, billing period, features, and a CTA button

### Step 5: Update Dashboard Upsell Modal
- Show all 3 manager options instead of just the £100/mo one

### Step 6: Update `useAuth.tsx`
- Track manager addon tier (not just boolean) — `managerTier: 'monthly' | 'academic_year' | 'final_year' | null`

## Files Changed
- `src/lib/subscription-tiers.ts` — 3 manager addon configs
- `src/components/landing/PricingSection.tsx` — 3 upsell cards
- `supabase/functions/check-subscription/index.ts` — recognize 3 manager products
- `src/hooks/useAuth.tsx` — manager tier state
- `src/pages/Dashboard.tsx` — upsell modal with 3 options

