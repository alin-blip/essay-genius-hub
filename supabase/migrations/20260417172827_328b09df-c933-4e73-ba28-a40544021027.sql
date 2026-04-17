
-- 1. Profiles: defense-in-depth WITH CHECK on UPDATE policy
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  -- Sensitive fields are also enforced by the prevent_credit_tampering trigger,
  -- but an additional policy-level guard via row check is safer.
);

-- 2. Managed students: restrict invite acceptance to setting own student_id only
DROP POLICY IF EXISTS "Students can update invites for their email" ON public.managed_students;

-- Use a security definer function so the row-level update is performed safely
CREATE OR REPLACE FUNCTION public.accept_managed_student_invite(_invite_id uuid)
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
  SET student_id = auth.uid(),
      status = 'accepted',
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

GRANT EXECUTE ON FUNCTION public.accept_managed_student_invite(uuid) TO authenticated;

-- 3. Realtime: per-admin channel scoping
DROP POLICY IF EXISTS "Restrict managed-students-changes to owning admins" ON realtime.messages;

CREATE POLICY "Admins receive only their own managed-students events"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  CASE
    WHEN realtime.topic() LIKE 'managed-students-changes:%' THEN
      realtime.topic() = 'managed-students-changes:' || auth.uid()::text
    WHEN realtime.topic() = 'managed-students-changes' THEN
      false  -- legacy unscoped channel: deny
    ELSE true
  END
);
