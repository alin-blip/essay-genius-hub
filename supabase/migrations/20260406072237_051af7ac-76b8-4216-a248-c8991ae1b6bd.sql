
-- Prevent client-side tampering of credits_balance and subscription_plan
CREATE OR REPLACE FUNCTION public.prevent_credit_tampering()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_setting('role') != 'service_role' THEN
    NEW.credits_balance := OLD.credits_balance;
    NEW.subscription_plan := OLD.subscription_plan;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER guard_credits
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_credit_tampering();
