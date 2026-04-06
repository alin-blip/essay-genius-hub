
-- Add account_type and has_manager_addon to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_type text NOT NULL DEFAULT 'student',
  ADD COLUMN IF NOT EXISTS has_manager_addon boolean NOT NULL DEFAULT false;

-- Update prevent_credit_tampering to also protect new fields
CREATE OR REPLACE FUNCTION public.prevent_credit_tampering()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF current_setting('role') != 'service_role' THEN
    NEW.credits_balance := OLD.credits_balance;
    NEW.subscription_plan := OLD.subscription_plan;
    NEW.account_type := OLD.account_type;
    NEW.has_manager_addon := OLD.has_manager_addon;
  END IF;
  RETURN NEW;
END;
$$;
