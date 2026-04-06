

# Plan: Transactional Emails for AssignmentPro

## Emails Identified

Based on the app's user flows, these are the transactional emails needed:

1. **Welcome Email** — sent after a user completes onboarding (profile setup), welcoming them to AssignmentPro
2. **Assignment Ready Email** — sent after an assignment is successfully generated, notifying the user their essay is ready to view/download
3. **Low Credits Warning** — sent when a user's credits drop below a threshold (e.g., 500 words remaining) after generating an assignment

## Technical Steps

### Step 1: Scaffold transactional email infrastructure
- Call the transactional email scaffolding tool to create the Edge Functions (`send-transactional-email`, `handle-email-unsubscribe`, `handle-email-suppression`) and the template registry

### Step 2: Create 3 email templates
Create React Email templates in `supabase/functions/_shared/transactional-email-templates/`:

- **`welcome.tsx`** — "Welcome to AssignmentPro" with user's name, brief intro, CTA to dashboard
- **`assignment-ready.tsx`** — "Your Assignment is Ready" with assignment title, word count, grade target, CTA to view it
- **`low-credits.tsx`** — "You're Running Low on Credits" with remaining balance, CTA to upgrade

All templates will use AssignmentPro branding: dark blue `#1a365d` primary, gold `#d4a843` accent, white `#ffffff` background, Inter font family.

### Step 3: Register templates in registry.ts
Add all 3 templates to the `TEMPLATES` map in `registry.ts`.

### Step 4: Wire up triggers in the app

- **Welcome**: In `Onboarding.tsx`, after successful profile save, invoke `send-transactional-email` with `welcome` template
- **Assignment Ready**: In `NewAssignment.tsx`, after successful generation, invoke `send-transactional-email` with `assignment-ready` template and pass title/word count/grade as templateData
- **Low Credits**: In `NewAssignment.tsx`, after generation, check if `credits_remaining < 500` and send the low-credits email

### Step 5: Create unsubscribe page
Create a branded `/unsubscribe` page that validates tokens and lets users opt out of app emails.

### Step 6: Deploy all edge functions
Deploy `send-transactional-email`, `handle-email-unsubscribe`, `handle-email-suppression`.

