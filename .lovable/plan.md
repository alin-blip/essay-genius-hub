

# Pricing Structure: Students + Agents (2 Categories)

## Plan Overview

Landing page with toggle/tabs switching between Student and Agent pricing.

### Student Plans

| Plan | Price | Assignments | Words |
|------|-------|-------------|-------|
| Student Basic | £50/mo | 3/month | 6,000 |
| Student Plus | £100/mo | 7/month | 14,000 |
| Student Pro | £200/mo | 15/month | 30,000 |

### Agent Plans

| Plan | Price | Assignments | Words |
|------|-------|-------------|-------|
| Agent Starter | £200/mo | 10/month | 20,000 |
| Agent Pro | £350/mo | 20/month | 40,000 |
| Agent Unlimited | £997/mo | Unlimited | Unlimited |

### Upsell (both categories)
- **Assignment Manager** — £100/mo add-on (human concierge)

## Technical Steps

### Step 1: Create 7 Stripe Products + Prices
- 3 student products (£50, £100, £200/mo recurring GBP)
- 3 agent products (£200, £350, £997/mo recurring GBP)
- 1 Assignment Manager add-on (£100/mo recurring GBP)

### Step 2: Database Migration
- Add `account_type` column to `profiles` (`student` | `agent`, default `student`)
- Add `has_manager_addon` boolean to `profiles` (default false)
- Update `prevent_credit_tampering` trigger to also protect `account_type` and `has_manager_addon`

### Step 3: Edge Functions
- **`create-checkout`** — Accepts a `price_id`, creates Stripe Checkout session for authenticated user. Supports both subscription plans and the manager add-on.
- **`check-subscription`** — Queries Stripe for active subscriptions by user email. Returns: `subscribed`, `product_id`, `subscription_end`, `has_manager_addon`. Maps product IDs to tier names and credit amounts. Auto-sets credits on profile.
- **`customer-portal`** — Opens Stripe billing portal for plan management.

### Step 4: Frontend — Auth Context
- After login/signup, call `check-subscription` to populate global state: `subscribed`, `planTier`, `planCategory` (student/agent), `hasManagerAddon`, `subscriptionEnd`
- Auto-refresh every 60 seconds
- Store tier config mapping (product_id → tier name, credits, category)

### Step 5: Landing Page Pricing Section
- Add Student/Agent toggle tabs in `Landing.tsx` pricing section
- 3 cards per category with features list
- Checkout button on each card (redirects to login if not authenticated, then Stripe Checkout)
- Assignment Manager upsell section below pricing cards

### Step 6: Dashboard Updates
- Show current plan and credits in stats cards
- "Upgrade" button → Stripe Checkout
- "Manage Subscription" → Customer Portal
- Post-checkout upsell modal for Assignment Manager
- "Manager Active" badge when subscribed to add-on

### Step 7: Gate Features by Plan
- Free users: limited to 1 assignment (trial)
- Paid users: gated by assignment count per month (tracked via `assignments` table count for current billing period)
- Agent Unlimited: no limits

## Files Changed
- `src/pages/Landing.tsx` — pricing tabs with Student/Agent toggle
- `src/pages/Dashboard.tsx` — subscription status, upgrade buttons, upsell modal
- `src/hooks/useAuth.tsx` — subscription state from check-subscription
- `supabase/functions/create-checkout/index.ts` — new
- `supabase/functions/check-subscription/index.ts` — new
- `supabase/functions/customer-portal/index.ts` — new
- DB migration: add `account_type`, `has_manager_addon` to profiles
- `src/lib/subscription-tiers.ts` — tier config constants (product IDs, names, limits)

