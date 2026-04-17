
CREATE OR REPLACE FUNCTION public.decline_managed_student_invite(_invite_id uuid)
RETURNS public.managed_students
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row public.managed_students;
  _user_email text;
BEGIN
  SELECT email INTO _user_email FROM auth.users WHERE id = auth.uid();
  IF _user_email IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.managed_students
  SET status = 'revoked',
      updated_at = now()
  WHERE id = _invite_id
    AND invite_email = _user_email
    AND status = 'pending'
  RETURNING * INTO _row;

  IF _row IS NULL THEN
    RAISE EXCEPTION 'Invite not found or not pending';
  END IF;

  RETURN _row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.decline_managed_student_invite(uuid) TO authenticated;
