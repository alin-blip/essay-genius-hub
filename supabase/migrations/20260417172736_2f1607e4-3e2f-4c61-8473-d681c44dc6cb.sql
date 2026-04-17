
DROP POLICY IF EXISTS "Admins can receive managed-students-changes events" ON realtime.messages;

-- Default deny on the managed-students-changes topic, with explicit allow for admins who own rows.
-- All other topics fall through to default behavior.
CREATE POLICY "Restrict managed-students-changes to owning admins"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  CASE
    WHEN realtime.topic() = 'managed-students-changes' THEN
      EXISTS (SELECT 1 FROM public.managed_students ms WHERE ms.admin_id = auth.uid())
    ELSE true
  END
);

-- Allow users to read their own generation logs
CREATE POLICY "Users can view their own generation logs"
ON public.generation_logs
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
