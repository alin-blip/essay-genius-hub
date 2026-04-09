CREATE OR REPLACE FUNCTION public.restore_credits(p_user_id uuid, p_amount integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_balance integer;
BEGIN
  UPDATE public.profiles
  SET credits_balance = credits_balance + p_amount,
      updated_at = now()
  WHERE user_id = p_user_id
  RETURNING credits_balance INTO new_balance;
  
  IF NOT FOUND THEN
    RETURN -1;
  END IF;
  
  RETURN new_balance;
END;
$$;