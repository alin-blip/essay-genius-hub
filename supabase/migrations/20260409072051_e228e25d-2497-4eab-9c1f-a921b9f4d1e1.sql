
-- Generation audit log table
CREATE TABLE public.generation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  assignment_id uuid,
  requested_word_count integer NOT NULL,
  actual_word_count integer,
  credits_before integer NOT NULL,
  credits_after integer,
  credits_charged integer,
  ai_provider_status integer,
  failure_step text,
  error_message text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.generation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage generation_logs"
  ON public.generation_logs FOR ALL
  USING (auth.role() = 'service_role'::text)
  WITH CHECK (auth.role() = 'service_role'::text);

CREATE INDEX idx_generation_logs_user ON public.generation_logs(user_id, created_at DESC);

-- Atomic credit deduction function
CREATE OR REPLACE FUNCTION public.deduct_credits(p_user_id uuid, p_amount integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_balance integer;
BEGIN
  UPDATE public.profiles
  SET credits_balance = credits_balance - p_amount,
      updated_at = now()
  WHERE user_id = p_user_id
    AND credits_balance >= p_amount
  RETURNING credits_balance INTO new_balance;
  
  IF NOT FOUND THEN
    RETURN -1;
  END IF;
  
  RETURN new_balance;
END;
$$;
