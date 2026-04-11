
-- 1. Add referral_code to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code text UNIQUE;

-- 2. Create friend_referrals table
CREATE TABLE public.friend_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL,
  referred_id uuid NOT NULL,
  referral_code text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  credits_awarded boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  credited_at timestamptz,
  UNIQUE(referred_id)
);

ALTER TABLE public.friend_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own referrals as referrer"
ON public.friend_referrals FOR SELECT
USING (auth.uid() = referrer_id);

CREATE POLICY "Service role can manage friend_referrals"
ON public.friend_referrals FOR ALL
USING (auth.role() = 'service_role'::text)
WITH CHECK (auth.role() = 'service_role'::text);

-- Allow authenticated users to insert (for signup flow)
CREATE POLICY "Authenticated users can insert friend referrals"
ON public.friend_referrals FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = referred_id);

-- 3. Function to generate unique referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  code text;
  exists_already boolean;
BEGIN
  LOOP
    code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE referral_code = code) INTO exists_already;
    IF NOT exists_already THEN
      RETURN code;
    END IF;
  END LOOP;
END;
$$;

-- 4. Trigger to auto-generate referral_code on new profile
CREATE OR REPLACE FUNCTION public.set_referral_code_on_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := generate_referral_code();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_referral_code
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_referral_code_on_profile();

-- 5. Backfill existing profiles
UPDATE public.profiles
SET referral_code = generate_referral_code()
WHERE referral_code IS NULL;

-- 6. Award credits trigger when referred user credits hit 0
CREATE OR REPLACE FUNCTION public.award_friend_referral_credits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ref_row record;
BEGIN
  -- Only fire when credits_balance drops to 0 or below
  IF NEW.credits_balance <= 0 AND OLD.credits_balance > 0 THEN
    SELECT * INTO ref_row
    FROM public.friend_referrals
    WHERE referred_id = NEW.user_id
      AND status = 'pending'
      AND credits_awarded = false
    LIMIT 1;

    IF FOUND THEN
      -- Award 1500 credits to referrer
      UPDATE public.profiles
      SET credits_balance = credits_balance + 1500,
          updated_at = now()
      WHERE user_id = ref_row.referrer_id;

      -- Mark referral as credited
      UPDATE public.friend_referrals
      SET status = 'credits_earned',
          credits_awarded = true,
          credited_at = now()
      WHERE id = ref_row.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_award_friend_referral
AFTER UPDATE OF credits_balance ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.award_friend_referral_credits();
