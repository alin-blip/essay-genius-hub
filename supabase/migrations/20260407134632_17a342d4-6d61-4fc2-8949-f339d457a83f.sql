
-- Add contact fields to affiliates
ALTER TABLE public.affiliates ADD COLUMN contact_name text;
ALTER TABLE public.affiliates ADD COLUMN contact_email text;
ALTER TABLE public.affiliates ADD COLUMN contact_phone text;

-- Update default commission rate to 50%
ALTER TABLE public.affiliates ALTER COLUMN commission_rate SET DEFAULT 0.50;

-- Update existing affiliates to 50%
UPDATE public.affiliates SET commission_rate = 0.50;

-- Create a security definer function to check if a user is an affiliate of a referred user
CREATE OR REPLACE FUNCTION public.is_affiliate_of_user(_affiliate_user_id uuid, _referred_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.referrals r
    JOIN public.affiliates a ON a.id = r.affiliate_id
    WHERE a.user_id = _affiliate_user_id
      AND r.referred_user_id = _referred_user_id
  )
$$;

-- Allow affiliates to view profiles of their referred users
CREATE POLICY "Affiliates can view referred user profiles"
ON public.profiles
FOR SELECT
USING (public.is_affiliate_of_user(auth.uid(), user_id));
