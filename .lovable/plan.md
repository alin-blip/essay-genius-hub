

# Sistem de Feedback — 100 credite per feedback

## Ce construim

1. **Tabel `feedback`** — stochează feedbackul utilizatorilor (rating, mesaj, tip feedback)
2. **Pop-up pe Dashboard** — apare periodic (ex: după fiecare 3 assignments sau la fiecare 7 zile de la ultimul feedback) care invită userul să lase feedback pentru 100 credite
3. **Acordare automată** — la submit, userul primește 100 credite bonus
4. **Secțiune în Admin Panel** — tabel cu tot feedbackul: user, rating, mesaj, data — util pentru studii de caz

## Plan tehnic

### 1. Migration: tabel `feedback`

```sql
CREATE TABLE public.feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  rating integer NOT NULL,          -- 1-5 stars
  message text,                     -- free text
  category text DEFAULT 'general',  -- general, feature_request, bug, testimonial
  allow_case_study boolean DEFAULT false,  -- user consents to use as case study
  credits_awarded boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
-- RLS: users can insert own, view own; service role full access
```

### 2. Edge function: `admin-data` — adăugăm acțiunea `get_feedback`

Returnează tot feedbackul cu join pe profiles (full_name, university) pentru admin.

### 3. Componentă `FeedbackPopup`

- Se montează pe Dashboard
- Verifică: ultimul feedback al userului > 7 zile SAU niciun feedback încă + min 1 assignment completat
- Dialog cu: rating (5 stele), mesaj text, checkbox "Allow use as case study"
- La submit: insert în `feedback` + apel `restore_credits(user_id, 100)` prin edge function
- Se afișează "Thank you! 100 credits added"

### 4. Admin Panel — tab/secțiune Feedback

- Tabel cu: User, University, Rating, Message, Case Study?, Date
- Filtru pe rating și case study consent

### Fișiere modificate

| Fișier | Schimbare |
|--------|-----------|
| **Migration SQL** | Tabel `feedback` + RLS |
| `src/components/FeedbackPopup.tsx` | Nou — pop-up component |
| `src/pages/Dashboard.tsx` | Montează `FeedbackPopup` |
| `supabase/functions/admin-data/index.ts` | Acțiune `get_feedback` + `award_feedback_credits` |
| `src/pages/AdminDashboard.tsx` | Tab/secțiune Feedback cu tabel |

