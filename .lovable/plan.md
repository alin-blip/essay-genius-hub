

# EduForYou AssignmentPro — Plan de Implementare

## Ce construim
Platformă SaaS pentru generarea de assignments universitare UK, cu autentificare, generator AI multi-step, editor de document, umanizare anti-detectare, export DOCX/PDF, si Stripe billing. Urmam Faza 1 (MVP) din documentul Manus.

## Ordinea implementarii (Sprint 1 — MVP)

### 1. Landing Page publica
- Hero: "Get Your UK University Assignments Done Right"
- Sectiuni: Features (Harvard Referencing, Anti-AI Detection, Pass to Distinction, Dissertation Support), Pricing preview, FAQ, CTA
- Color scheme: Dark blue `#1a365d`, white, gold accents `#d4a843`
- Rute: `/` = landing, `/login` = auth, `/dashboard` = app

### 2. Auth + Onboarding
- Supabase Auth cu email/password
- Pagina Login/Signup cu design academic
- Onboarding wizard 3 steps dupa signup:
  - Step 1: Nivel studiu (HND Level 5, BSc Level 6, MSc Level 7)
  - Step 2: Course (Construction Management, Business Management, Health & Social Care, etc.)
  - Step 3: University (text input)
- Tabel `profiles`: id, full_name, university_level, course_name, university, credits_balance (default 5000), subscription_plan (default 'free')

### 3. Database Schema (Supabase)
- `profiles` — user profile + credits + subscription
- `assignments` — id, user_id, title, module_name, assignment_brief, word_count, target_grade, assignment_type, status, generated_content, humanized_content, references_list, created_at, updated_at
- RLS policies: users can only CRUD their own data

### 4. Dashboard
- Welcome message cu nume + nivel
- 4 stat cards: Credits Remaining, Assignments This Month, Average Grade Target, Subscription Plan
- Tabel assignments recente cu status badges (Draft/Generating/Completed)
- Empty state cu CTA "Create your first assignment"
- Buton prominent "Create New Assignment"

### 5. New Assignment Wizard (4 steps)
- **Step 1 — Module & Title:** Module name, assignment title, unit number
- **Step 2 — Academic Requirements:** Target grade (Pass/Merit/Distinction cu descrieri), word count slider (500-15000), assignment type dropdown (Essay, Report, Case Study, Reflective Account, Research Project, Dissertation)
- **Step 3 — Assignment Brief:** Textarea mare pentru brief, additional instructions, checkboxes (case studies, Harvard refs)
- **Step 4 — Review & Generate:** Summary, credit cost (1 credit = 100 words), balance check, generate button
- Zod validation pe toate campurile

### 6. Edge Function: `generate-assignment`
- Verifica credits
- Apel OpenAI GPT-4o cu system prompt din documentul Manus (sectiunea 10, Prompt 3) — include reguli anti-detectare, structura UK, Harvard referencing, nivel de nota
- Salveaza in DB, scade credite
- Frontend: loading screen cu progress messages animate

### 7. Edge Function: `humanize-text`
- Al doilea pass prin AI cu prompt de umanizare
- Variatie dramatica lungime propozitii, vocabular neasteptat, stil ESL, burstiness ridicat
- Pastreaza citatiile si faptele intacte

### 8. Document Editor
- Layout split: 75% editor (TipTap rich text) / 25% tools panel
- Tools: Humanize Text, Regenerate References, Word Count by section
- Auto-save in Supabase
- Top bar: titlu editabil, Export dropdown (DOCX, PDF), Back to Dashboard

### 9. Export DOCX/PDF
- Librarie `docx` pentru Word — Arial 12pt, 1.5 spacing, cover page, page numbers
- `jsPDF` sau `html2pdf` pentru PDF
- Download direct din browser

### 10. Billing + Stripe
- Pagina Billing cu plan curent + pricing cards (Starter £9.99, Pro £19.99, Dissertation £49.99)
- Edge function `create-checkout-session`
- Edge function `stripe-webhook` pentru actualizare credite/plan
- Buy extra credits (£4.99/5000 words)

### 11. Settings
- Profile edit (name, uni, course, level)
- Writing preferences (default grade, word count, style, auto-humanize toggle)
- Notification preferences

## Structura de fisiere (noi)

```text
src/
├── pages/
│   ├── Landing.tsx
│   ├── Login.tsx
│   ├── Signup.tsx
│   ├── Onboarding.tsx
│   ├── Dashboard.tsx
│   ├── NewAssignment.tsx
│   ├── AssignmentEditor.tsx
│   ├── Billing.tsx
│   └── Settings.tsx
├── components/
│   ├── layout/
│   │   ├── AppSidebar.tsx
│   │   └── AppLayout.tsx
│   ├── assignment/
│   │   ├── StepModuleTitle.tsx
│   │   ├── StepRequirements.tsx
│   │   ├── StepBrief.tsx
│   │   ├── StepReview.tsx
│   │   └── GeneratingOverlay.tsx
│   ├── editor/
│   │   ├── DocumentEditor.tsx
│   │   └── ToolsPanel.tsx
│   ├── billing/
│   │   └── PricingCards.tsx
│   └── onboarding/
│       └── OnboardingWizard.tsx
├── hooks/
│   ├── useAssignments.ts
│   └── useCredits.ts
├── lib/
│   ├── supabase.ts
│   └── export.ts
supabase/functions/
├── generate-assignment/
├── humanize-text/
├── create-checkout-session/
└── stripe-webhook/
```

## Design tokens
- Primary: `#1a365d` (dark blue)
- Accent: `#d4a843` (gold)
- Background: white
- Font: Inter (body), system serif for academic feel in headings
- Componente: shadcn/ui existente + customizare culori

## Abordare
Construim tot secvential: landing → auth → DB → dashboard → wizard → AI edge functions → editor → export → billing → settings. Fiecare pas e functional independent.

