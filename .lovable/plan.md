

## Plan: Upgrade Affiliate System

### Changes

#### 1. Change commission rate to 50%
- **Database migration**: Update default `commission_rate` on `affiliates` table from `0.30` to `0.50`
- **Update existing affiliates**: Set all current affiliates to `0.50`
- **UI text**: Update "30% recurring commission" → "50% recurring commission" in `AffiliateApply.tsx`

#### 2. Add name, email, phone to affiliate application form
- **Database migration**: Add columns to `affiliates` table: `contact_name text`, `contact_email text`, `contact_phone text`
- **AffiliateApply.tsx**: Add 3 new required fields (Full Name, Email, Phone Number) to the application form, before the optional website/social fields

#### 3. Show referred users in affiliate dashboard
- Currently, the referrals table only stores `referred_user_id` and `status` — no user details are visible
- **AffiliateDashboard.tsx**: Add a "Referred Users" table section showing all referrals with:
  - Sign-up date (`referrals.created_at`)
  - Status (signed_up / subscribed)
  - To get user details (name, email), fetch from `profiles` table using `referred_user_id` — but RLS on profiles only allows users to see their own profile
  - **Database migration**: Add a new RLS policy on `profiles` that allows affiliates to SELECT profiles of their referred users (using a subquery on referrals table)
  - Display columns: Name, Sign-up Date, Status (with badge)

### Files Changed

| File | Change |
|------|--------|
| Migration SQL | Add `contact_name`, `contact_email`, `contact_phone` to affiliates; update default commission to 0.50; update existing rows; add RLS policy on profiles for affiliate access |
| `src/pages/AffiliateApply.tsx` | Add name/email/phone fields; update commission text to 50% |
| `src/pages/AffiliateDashboard.tsx` | Add "Referred Users" table with name, date, status; fetch profile data for each referral |

