

# Launch Readiness Audit — UniTaskPro / MyUniPal

Based on a deep code + security + legal review. Status: **NOT ready to launch to paying customers yet**. Below are the blockers, ordered by priority.

---

## 🔴 CRITICAL BLOCKERS (must fix before launch)

### 1. Legal pages missing entirely
The footer in `Landing.tsx` links Privacy / Terms / Contact to `href="#"` (placeholder). **No pages exist.** This is illegal for a UK SaaS taking payments.

Required pages (UK + EU GDPR + Stripe T&Cs require these):
- `/privacy` — Privacy Policy (GDPR Art. 13/14)
- `/terms` — Terms of Service (incl. AI usage clause, account deletion, governing law)
- `/refund` — Refund Policy (UK Consumer Contracts Regulations 2013 — 14-day cooling off; you must state digital-content waiver if applicable)
- `/cookies` — Cookie Policy (PECR + GDPR)
- `/acceptable-use` — Acceptable Use Policy (academic integrity disclaimer — critical given AI essay use case)
- `/contact` — Contact / company info (UK Companies Act requires registered name + address if Ltd)

### 2. Cookie consent banner missing
You serve UK/EU users, use auth cookies + likely analytics → **PECR violation** without consent banner. ICO can fine.

### 3. Academic integrity / disclaimer missing
Your product writes university essays. UK universities treat AI-generated work as misconduct. Without a clear disclaimer ("for research / drafting only — submitting as your own work may breach your university's policies"), you face:
- Reputational + legal exposure
- Potential class-action risk from students expelled
- Stripe could shut down the account (against their AUP for "facilitating academic dishonesty" if no disclaimer)

### 4. Security findings (from automated scan)
- **REALTIME exposed (error)**: any authenticated user can subscribe to `managed_students` realtime channel and read other students' invite emails. Add RLS on `realtime.messages`.
- **Affiliate over-exposure (warn)**: affiliates can read full referred-user profile (name, university, credits, plan). Restrict to affiliate-needed columns only via a view.
- **Storage UPDATE policy missing** on `assignment-briefs` bucket — risk of cross-user overwrites.
- **4 DB functions** without `search_path` set.

### 5. Stripe webhook not verified in production
`affiliate-webhook` only verifies signature *if* `STRIPE_WEBHOOK_SECRET` is set. Confirm secret is set, otherwise webhooks are spoofable.

### 6. SEO + branding (index.html)
- Title still says "Assignments Pro" — brand is "UniTaskPro" / "MyUniPal" — inconsistent across landing, custom domain, OG.
- OG image URL has an `Expires` timestamp (Google Cloud signed URL) → image will break.
- No `sitemap.xml`, no canonical tags, no structured data.
- `meta author = "Lovable"` should be removed.

---

## 🟡 HIGH PRIORITY (fix before paid traffic)

### 7. Free trial abuse
1500 free credits given to every signup. No email verification gating. No device/IP fingerprinting → users can farm free generations. Need at minimum: email verification required before generation.

### 8. Email verification not enforced
Onboarding flow doesn't check `email_confirmed_at`. Anyone can sign up with fake email and consume credits.

### 9. Refund / dispute flow
No in-app refund request. No clear path for "I wasn't satisfied" — leads to Stripe chargebacks (which damage your processor account).

### 10. Customer support channel
No support email visible, no help center, no in-app chat. Required by Stripe + by users paying £50–£997.

### 11. Pricing transparency
Plans range £50–£997. UK Consumer Rights Act requires VAT-inclusive pricing for B2C. Confirm Stripe is set to charge VAT (depending on whether you're VAT-registered).

### 12. Account deletion + data export (GDPR right)
Settings page lets users update profile but no "Delete my account" or "Export my data" buttons. GDPR Art. 17 + 20 requirement.

### 13. Generation reliability for paying customers
Recent timeout fixes are in but not battle-tested at 5K–10K word range. Need real test runs across all 8 assignment types (the QA matrix we already designed).

### 14. PPTX / chart features still untested end-to-end
The chart embedding in DOCX/PDF and PPTX flow were just added. Need full QA.

---

## 🟢 NICE TO HAVE (post-launch OK)

- Status page (uptime monitoring)
- Better error messages when AI gateway fails
- Reduce subscription auto-refresh from 60s to on-demand
- Add Sentry / error tracking
- Add analytics (PostHog / Plausible — GDPR-friendly)
- Welcome email already exists ✅
- Feedback popup already exists ✅
- Affiliate program already built ✅

---

## Proposed launch plan

I'll execute in this order:

### Phase 1 — Legal & compliance (blocks launch)
1. Generate Privacy Policy, Terms, Refund Policy, Cookie Policy, Acceptable Use, Contact pages — UK-tailored, GDPR-compliant, with strong academic-integrity disclaimer.
2. Add cookie consent banner (PECR-compliant — reject all / accept all / customize).
3. Wire footer links + add "I agree to Terms & Privacy" checkbox on signup.
4. Add "Delete my account" + "Export my data" in Settings.

### Phase 2 — Security fixes
5. Fix the 3 RLS / Realtime / Storage findings + 4 search_path warnings (single migration).
6. Restrict affiliate profile view via column-limited view.
7. Verify `STRIPE_WEBHOOK_SECRET` is set and webhook is registered in Stripe dashboard.

### Phase 3 — Anti-abuse + enforcement
8. Require email verification before assignment generation.
9. Add server-side rate limit on generation per user (e.g. 3 generations / hour for free tier).
10. Add "Submitted as your own work?" warning on generation success screen.

### Phase 4 — Brand / SEO polish
11. Fix `index.html` (title, brand, OG image, author tag).
12. Generate `sitemap.xml`, add canonical URLs, structured data.
13. Add support email + help section in dashboard.

### Phase 5 — QA pass
14. Run the 8-assignment-type QA matrix (already approved earlier).
15. Test full payment flow on each plan with Stripe test cards.
16. Test on mobile (current viewport is 927px — need <500px coverage).

### Phase 6 — Pre-launch checklist
17. Confirm domain, SSL, email deliverability (SPF/DKIM/DMARC) all green.
18. Confirm Stripe live mode, prices match `subscription-tiers.ts`, VAT settings correct.
19. Soft-launch to 10–20 beta users for 48h, monitor errors.

---

## Decision needed

Reply with one of:

- **"Start with Phase 1"** — I generate all legal pages + cookie banner now.
- **"Do everything in order"** — I execute Phase 1 → 6 across multiple turns, you approve each phase.
- **"Just give me the security fixes first"** — Phase 2 only (1 migration).
- **"Custom — I'll prioritize"** — tell me which phase / numbered item to tackle first.

For the legal pages I'll need from you (or I'll use sensible UK defaults you can edit later):
- Company legal name + address (or "sole trader" + your address)
- Support email
- Whether you're VAT-registered
- Whether you want a 14-day refund window or "no refund on digital generated content" (UK CCRs allow waiver if user accepts before generation)

