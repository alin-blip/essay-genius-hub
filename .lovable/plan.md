

# Audit Complet — AssignmentPro

## 🔴 Probleme Critice

### 1. Escaladare de privilegii: Utilizatorii își pot modifica credits și subscription
**Severitate: CRITICĂ**

Politica RLS de UPDATE pe `profiles` permite utilizatorilor să-și modifice `credits_balance` și `subscription_plan` direct din client. Un utilizator poate rula în consolă:
```
supabase.from('profiles').update({ credits_balance: 999999 }).eq('user_id', uid)
```

**Fix:** Restricționează UPDATE-ul la coloanele sigure (`full_name`, `university`, `university_level`, `course_name`) prin:
- Înlocuirea politicii UPDATE cu una care folosește un trigger de validare SAU
- Crearea unei funcții `security definer` pentru actualizarea creditelor (deja folosită în edge functions cu service role, dar politica RLS nu blochează client-side)

### 2. Leaked Password Protection dezactivat
**Severitate: MEDIE**

Parolele compromise (din breaches publice) nu sunt verificate la signup. Trebuie activat HIBP check.

---

## 🟡 Probleme Medii

### 3. Tipuri `any` peste tot
Dashboard, AssignmentEditor, Settings folosesc `useState<any>` pentru profile și assignments. Tipurile există deja în `types.ts` — ar trebui folosite.

### 4. Nu există forgot password
Nu există pagină de reset parolă. Doar change password din Settings (necesită autentificare).

### 5. Signup nu redirecționează la onboarding
După email verification, `emailRedirectTo` trimite la `window.location.origin` (landing page `/`). Ar trebui să fie `/dashboard` ca ProtectedRoute să redirecționeze la `/onboarding`.

### 6. Lipsă validare input pe edge functions
Edge functions nu validează formatul/lungimea input-urilor (ex: `word_count` ar putea fi 0 sau 1000000). Nu se folosește Zod sau echivalent.

---

## 🟢 Probleme Minore

### 7. Dashboard `toast.error` / `toast.success` inconsistent
Dashboard folosește `toast.error()` / `toast.success()` dar `useToast` returnează `toast({ variant: "destructive" })`. Probabil funcționează prin Sonner, dar e inconsistent.

### 8. Lipsă error handling la fetch-uri
Dashboard și alte pagini nu tratează erorile de la queries Supabase (ex: `profileRes.error` nu e verificat).

### 9. Nu există rate limiting pe edge functions
Un utilizator autentificat poate spama generări/humanizări fără limite.

---

## Plan de Implementare (prioritizat)

### Pasul 1: Fix escaladare privilegii (CRITIC)
- Creează o migrare SQL care:
  - Șterge politica UPDATE existentă pe `profiles`
  - Adaugă o politică UPDATE restricționată doar la coloanele `full_name`, `university`, `university_level`, `course_name`
  - Alternativ: adaugă un trigger BEFORE UPDATE care previne modificarea `credits_balance` și `subscription_plan` din context non-service-role

### Pasul 2: Activează Leaked Password Protection
- Folosește `cloud--configure_auth` pentru a activa HIBP check

### Pasul 3: Fix redirect după email verification
- Schimbă `emailRedirectTo` în Signup.tsx la `${window.location.origin}/dashboard`

### Pasul 4: Adaugă validare Zod pe edge functions
- Validează `word_count` (100-10000), `assignment_type`, `target_grade`, etc.

### Pasul 5: Înlocuiește `any` cu tipuri corecte
- Folosește `Tables<'profiles'>` și `Tables<'assignments'>` din types.ts

### Pasul 6: Adaugă forgot password flow
- Pagină nouă `/forgot-password` cu `supabase.auth.resetPasswordForEmail()`

### Detalii Tehnice

**Pentru fix-ul de privilegii (Pasul 1)**, cea mai solidă abordare este un trigger BEFORE UPDATE:

```sql
CREATE OR REPLACE FUNCTION prevent_credit_tampering()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF current_setting('role') != 'service_role' THEN
    NEW.credits_balance := OLD.credits_balance;
    NEW.subscription_plan := OLD.subscription_plan;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER guard_credits
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_credit_tampering();
```

Aceasta permite edge functions (care folosesc service_role) să actualizeze creditele, dar blochează orice tentativă din client.

