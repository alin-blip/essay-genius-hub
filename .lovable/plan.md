

User asks what those two items mean and whether they're legally required. Also says no email verification.

**Rate limiting**: per-user cap on generation requests (e.g. max 3 generations/hour). Backend rate limiting primitives are not available — per system constraint, I should NOT add backend rate limiting. Will explain and skip.

**Academic integrity warning on success**: a modal/banner shown after generation completes, reminding user that submitting AI work as own may breach university policy. Already covered in Terms + Signup checkbox, but a per-generation reminder strengthens legal defense (shows we repeatedly warned the user → reduces our liability if a student is expelled and tries to blame us).

**Email verification**: User says no. Legally NOT required, but it prevents free-credit farming. Acceptable to skip.

Plan: skip rate limiting + email verification, only implement the academic integrity warning.

# What those two things mean (and what's legally needed)

## 1. "Server-side rate limiting per user"
A backend cap like "max 3 generations per hour per account" to stop abuse (one person farming 1500 free credits across many accounts, or hammering the AI to drive up our costs).

- **Legally required?** No. It's an anti-abuse / cost-control measure, not a legal one.
- **Status:** Lovable Cloud doesn't have proper rate-limiting infrastructure yet, so I'd recommend skipping this for now and revisiting once it does. Not a launch blocker.

## 2. "Academic integrity warning on generation success"
A popup/banner that appears **every time a generation finishes**, reminding the user:
> "This is a draft for study purposes. Submitting as your own work may breach your university's academic policy. Review, edit and verify before use."

- **Legally required?** Not strictly — but **strongly recommended**. Here's why:
  - We already have it in Terms + the signup checkbox (one-time consent).
  - A per-generation reminder creates a **paper trail of repeated warnings**. If a student is expelled and tries to sue us or chargeback, we can show "we warned them every single time."
  - Stripe + payment processors look favourably on this for AI/essay products — reduces dispute risk.
  - Cost: ~5 min of work, zero downside.

## Email verification
You said no — **that's fine legally**. GDPR and UK consumer law don't require it. The only downside is free-credit farming (someone signs up 10x with fake emails for 15,000 free credits). If that becomes a problem post-launch we can add it later.

---

# Proposed Phase 3 (slimmed down)

**Skip:**
- ❌ Email verification (your call)
- ❌ Server-side rate limiting (infrastructure not ready)

**Implement:**
1. **Academic integrity reminder modal** — shown once per successful generation in `NewAssignment.tsx`, with:
   - Clear warning text
   - "I understand — open my draft" button
   - Link to our Acceptable Use Policy
   - Stored in `localStorage` so we can show "you've been warned X times" if needed later
2. **Persistent footer banner inside the editor** (`AssignmentEditor.tsx`) — small dismissible note: *"Draft for study purposes. Verify all references and edit substantially before submission."*

That's it for Phase 3. Then we can move to Phase 4 (SEO + brand polish — fix index.html, sitemap, unify "MyUniPal" vs "AssignmentPro" branding).

**Reply with:**
- ✅ "Implement Phase 3 (warning only)" → I do the 2 items above
- ✏️ "Adjust" → tell me what to change
- ⏭️ "Skip Phase 3, go to Phase 4 (SEO/brand)"

