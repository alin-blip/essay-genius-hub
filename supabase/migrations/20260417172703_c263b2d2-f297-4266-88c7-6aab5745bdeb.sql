
-- Replace the overly broad realtime policy with a topic-scoped one.
-- The only client subscriber is admins on the 'managed-students-changes' topic
-- (see src/pages/AdminStudents.tsx). For all other topics, fall through to
-- existing/default realtime behavior.
DROP POLICY IF EXISTS "Authenticated users can receive managed_students events" ON realtime.messages;

CREATE POLICY "Admins can receive managed-students-changes events"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() <> 'managed-students-changes'
  OR EXISTS (
    SELECT 1 FROM public.managed_students ms
    WHERE ms.admin_id = auth.uid()
  )
);

-- Allow referred users to also view their own friend_referral row, and scope to authenticated only
DROP POLICY IF EXISTS "Users can view their own referrals as referrer" ON public.friend_referrals;

CREATE POLICY "Users can view their own friend referrals"
ON public.friend_referrals
FOR SELECT
TO authenticated
USING (auth.uid() = referrer_id OR auth.uid() = referred_id);
