
-- 1. Replace blanket UPDATE policy on profiles with a column-restricted version
-- via security definer function. The policy now only allows updates that don't
-- change protected columns.
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile (safe fields)"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND credits_balance = (SELECT credits_balance FROM public.profiles WHERE user_id = auth.uid())
  AND subscription_plan = (SELECT subscription_plan FROM public.profiles WHERE user_id = auth.uid())
  AND account_type = (SELECT account_type FROM public.profiles WHERE user_id = auth.uid())
  AND has_manager_addon = (SELECT has_manager_addon FROM public.profiles WHERE user_id = auth.uid())
);

-- 2. Tighten realtime: the policy already checks the topic uuid matches auth.uid()
-- but the scanner is right that ANY user (not just admins) can subscribe to their
-- own topic. Since each user's topic only emits their OWN admin's data (filtered
-- by admin_id=eq.user.id on the client), and topic = uid, this is actually safe:
-- a non-admin subscribing to their own uid topic gets nothing because they have
-- no rows where admin_id = their uid. But to be explicit and correct, add the check:
DROP POLICY IF EXISTS "Admins receive only their own managed-students events" ON realtime.messages;

CREATE POLICY "Per-user managed-students channel access"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  CASE
    WHEN realtime.topic() LIKE 'managed-students-changes:%' THEN
      -- Only the user whose UID is in the topic name can subscribe
      realtime.topic() = 'managed-students-changes:' || auth.uid()::text
      -- AND they must be an admin who has at least one managed student
      AND EXISTS (SELECT 1 FROM public.managed_students ms WHERE ms.admin_id = auth.uid())
    WHEN realtime.topic() = 'managed-students-changes' THEN
      false
    ELSE true
  END
);
