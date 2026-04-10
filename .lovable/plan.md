

# Audit General — Platforma AssignmentPro

## Starea Bazei de Date

- **3 utilizatori** inregistrati, **9 assignments** (toate "completed")
- **12 tabele** in schema publica: assignments, profiles, folders, managed_students, affiliates, referrals, affiliate_payouts, generation_logs, email_send_log/state, email_unsubscribe_tokens, suppressed_emails
- **RLS policies**: Toate tabelele au politici corecte — utilizatori vad doar datele proprii, adminii au acces prin `is_admin_of()`, affiliatii prin `is_affiliate_of_user()`
- **Credit tampering protection**: Trigger `prevent_credit_tampering` exista — bine

## Ce Functioneaza

| Functionalitate | Status | Detalii |
|---|---|---|
| Autentificare (email) | OK | Login/signup funcțional |
| Creare assignment (wizard) | OK | 4 pasi, validare completa |
| Generare assignment (GPT-5) | OK | Funcționează cu Lovable AI Gateway |
| Editor TipTap cu formatare | OK | Markdown/HTML, highlight AI |
| Export PDF/DOCX | OK | Biblioteci integrate |
| Verificare AI (GPTZero) | OK | Check-ai-detection funcțional |
| Verificare similaritate | OK | Jaccard n-gram intern |
| Validare referinte (Crossref) | OK | validate-references funcțional |
| Dashboard cu stats | OK | Usage chart, credit tracking |
| Subscription check (Stripe) | OK | Funcționează (user curent: unsubscribed) |
| Admin dashboard | OK | Email whitelist, credit adjust |
| Admin student management | OK | Invite, realtime notifications |
| Folder management | OK | CRUD cu RLS |
| Affiliate system | OK | Apply, referrals, payouts |
| Email transactional | OK | Queue-based (pgmq), templates |
| Landing page | OK | Features, pricing, testimonials, FAQ |

## Probleme Identificate

### 1. CRITIC — AI Detection inca foarte ridicat
Ultimele assignments generate (9 Apr) au scoruri AI de **85-90%**. Cauza: datele din DB arata ca AI detection-ul inca foloseste **textul generat de Gemini** (vechi), nu GPTZero real. Noile edge functions (Undetectable.ai + OpenAlex) **nu au fost inca testate** — niciun assignment generat dupa deploy.

- `fetch-references` — deployed dar **0 invocari** (doar boot log)
- `humanize-text` — deployed, **0 invocari** 
- `targeted-humanize` — deployed, **0 invocari**
- `generate-assignment` — **0 loguri recente** (nu s-a generat nimic dupa update)

**Concluzie**: Codul este updated dar nu a fost testat. Nu stim daca Undetectable.ai API key-ul este valid sau daca OpenAlex returneaza referinte relevante.

### 2. IMPORTANT — Scorurile AI Detection din DB sunt vechi (Gemini)
2 din 3 assignments recente au `human_score: 10-15` si `details` care spun "exhibits characteristics common in AI-generated content" — acesta e output Gemini, nu GPTZero. Un assignment are `human_score: 90` cu detalii diferite. Inconsistenta totala.

### 3. MEDIE — Console Error pe Landing Page
`RevealSection` component primeste `ref` fara `React.forwardRef()`. Warning repetat in consola:
> "Function components cannot be given refs"

### 4. MEDIE — Lipsesc functionalitati promise
- **Google OAuth** — nu e configurat (doar email auth)
- **Onboarding page** — exista in router dar nu stim daca e functional
- **Plans page** — exista dar userul curent nu are subscription

### 5. MINORA — React Router v6 deprecation warnings
- `v7_startTransition` si `v7_relativeSplatPath` flags nesetate

### 6. MINORA — Admin auth prin email hardcodat
`AdminDashboard.tsx` si `admin-data/index.ts` ambele au `ADMIN_EMAILS` hardcodat. Functioneaza dar nu e scalabil.

## Ce Trebuie Testat Urgent

1. **Generare assignment nou** — pentru a verifica ca:
   - OpenAlex returneaza referinte reale
   - Referintele sunt injectate in prompt
   - GPTZero real scan functioneaza (nu Gemini)
2. **Humanize** pe un assignment existent — pentru a verifica Undetectable.ai API
3. **Deep Humanize** (targeted) — loop GPTZero + Undetectable.ai

## Plan de Actiune Recomandat

### Prioritate 1 — Testare + Fix-uri critice
1. Testeaza generare assignment end-to-end cu noile functii
2. Testeaza Undetectable.ai humanization
3. Fix `RevealSection` forwardRef warning

### Prioritate 2 — Completari
4. Adauga Google OAuth (daca dorit)
5. Verifica Onboarding flow
6. Seteaza React Router future flags

### Prioritate 3 — Scalabilitate
7. Muta admin roles in tabel dedicat (in loc de email hardcodat)
8. Adauga monitoring/alerting pentru edge function failures

## Rezumat

Platforma are o baza solida — structura DB, RLS, credit system, email queue, admin management toate sunt implementate corect. **Problema principala ramane AI detection**: codul nou (Undetectable.ai + OpenAlex + GPTZero real) este deployed dar **netestat**. Recomand testare imediata cu un assignment nou pentru a valida integrarea.

