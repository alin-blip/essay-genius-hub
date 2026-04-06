

# Affiliate Program — 30% Recurring Commission via Stripe Connect

## How It Works

1. Anyone can apply to become an affiliate through a public `/affiliate` page
2. After approval, they connect their Stripe account (via Stripe Connect Express)
3. They get a unique referral link like `assignmentpro.co.uk/?ref=CODE`
4. When someone signs up through that link and subscribes, the affiliate earns **30% recurring commission** every month the referred user pays
5. Commission is transferred automatically to the affiliate's bank account via Stripe

## Database (3 new tables)

**`affiliates`** — stores affiliate applications and status
- user_id, affiliate_code (unique), stripe_connect_account_id, status (pending/approved/rejected), commission_rate (default 0.30), application details (website, social_media, reason)

**`referrals`** — tracks which users were referred by which affiliate
- affiliate_id → affiliates, referred_user_id, status (signed_up/subscribed/churned)

**`affiliate_payouts`** — logs every commission transfer
- affiliate_id, stripe_transfer_id, amount (pence), currency, status

RLS: affiliates can only read their own data. Service role handles writes from edge functions.

## Stripe Connect Setup

- Use **Stripe Connect Express** accounts for affiliates
- Edge function creates Connect account + onboarding link
- On each subscription payment (`invoice.payment_succeeded` webhook), calculate 30% and create a `Transfer` to the affiliate's connected account

## New Pages

1. **`/affiliate`** — Public application form (name, website/social, why they want to join). Requires an AssignmentPro account.
2. **`/affiliate/dashboard`** — Protected page showing: referral link, click stats, total referrals, earnings this month / lifetime, payout history, Stripe Connect onboarding button

## New Edge Functions

1. **`affiliate-connect`** — Creates Stripe Connect Express account + returns onboarding URL
2. **`affiliate-webhook`** — Stripe webhook for `invoice.payment_succeeded`: looks up referral → calculates 30% → creates Stripe Transfer → logs payout

## Referral Tracking

- Signup page reads `?ref=CODE` from URL, stores in localStorage (30-day persistence)
- After successful account creation, inserts row in `referrals` linking new user to affiliate
- When the referred user subscribes, the webhook handles commission automatically

## Implementation Order

1. Create 3 database tables with RLS policies
2. Build `/affiliate` application page
3. Build `/affiliate/dashboard` with stats
4. Create `affiliate-connect` edge function (Stripe Connect Express onboarding)
5. Create `affiliate-webhook` edge function (commission calculation + transfers)
6. Wire referral tracking into Signup page (`?ref=` param → localStorage → referrals table)
7. Deploy all edge functions

