

# Sistem de Referral "Share cu Prieteni" — 1500 credite bonus

## Ce construim

Un sistem prin care utilizatorii pot invita prieteni printr-un link unic. Când prietenul se înregistrează **și** își consumă creditele inițiale (1500), referrer-ul primește automat **1500 credite bonus**. Totul este tracked într-un tabel dedicat.

## Diferența față de sistemul de affiliate existent

Sistemul de affiliate existent este pentru parteneri externi (comision Stripe, Connect, etc.). Acesta este un sistem simplu peer-to-peer pentru utilizatorii platformei.

## Plan tehnic

### 1. Tabel nou: `friend_referrals`

```sql
CREATE TABLE public.friend_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL,        -- cine a trimis link-ul
  referred_id uuid NOT NULL,        -- cine s-a înregistrat
  referral_code text NOT NULL,      -- codul unic al referrer-ului
  status text NOT NULL DEFAULT 'pending',  -- pending | credits_earned
  credits_awarded boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  credited_at timestamptz,
  UNIQUE(referred_id)
);
-- RLS: users can see their own referrals
-- Service role can manage all
```

### 2. Cod referral unic pe profil

Adăugăm o coloană `referral_code` pe `profiles` (generată automat la signup via trigger).

### 3. Trigger pe `profiles` — detectează când creditele ajung la 0

Un trigger `AFTER UPDATE` pe `profiles` verifică dacă `credits_balance` a ajuns la 0 (sau sub un prag). Dacă utilizatorul este un `referred_id` în `friend_referrals` cu `status = 'pending'`, acordă 1500 credite referrer-ului și marchează `status = 'credits_earned'`.

### 4. UI pe Dashboard

- Un card/buton **"Invite Friends — Get 1500 Credits"** pe dashboard
- Click deschide un dialog cu:
  - Link-ul unic de referral (copiere cu un click)
  - Lista prietenilor invitați + status (pending / credits earned)
  - Contorul de credite câștigate

### 5. Capturare referral la signup

- Landing/signup citește `?ref=CODE` din URL
- La signup, se creează un rând în `friend_referrals` cu `referrer_id` (găsit din cod) și `referred_id` (noul user)

### 6. Fișiere modificate

| Fișier | Ce se schimbă |
|--------|--------------|
| **Migration SQL** | Tabel `friend_referrals`, coloana `referral_code` pe `profiles`, trigger generare cod, trigger creditare |
| `src/pages/Dashboard.tsx` | Buton "Invite Friends" + dialog cu link și statistici |
| `src/pages/Signup.tsx` | Capturare `?ref=` și salvare în `friend_referrals` la signup |
| `src/hooks/useAuth.tsx` | La `SIGNED_IN`, creează rândul de referral dacă există cod în localStorage |

### 7. Securitate

- RLS pe `friend_referrals`: utilizatorii pot vedea doar referralurile lor (ca referrer)
- Creditarea se face prin `SECURITY DEFINER` function (nu direct de client)
- Trigger-ul previne acordarea dublă (verifică `credits_awarded = false`)

