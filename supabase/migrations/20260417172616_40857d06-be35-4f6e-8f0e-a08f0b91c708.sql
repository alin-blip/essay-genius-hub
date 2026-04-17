
-- 1. REALTIME: lock down managed_students channel subscriptions
-- Enable RLS on realtime.messages (idempotent)
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if rerun
DROP POLICY IF EXISTS "Authenticated users can receive managed_students events" ON realtime.messages;

-- Only authenticated users may receive realtime broadcasts; combined with table-level RLS,
-- this prevents anonymous channel snooping.
CREATE POLICY "Authenticated users can receive managed_students events"
ON realtime.messages
FOR SELECT
TO authenticated
USING (true);

-- 2. AFFILIATE PROFILE EXPOSURE: replace broad SELECT with a limited view
DROP POLICY IF EXISTS "Affiliates can view referred user profiles" ON public.profiles;

-- Create a limited view exposing only non-sensitive fields to affiliates
CREATE OR REPLACE VIEW public.affiliate_referred_users
WITH (security_invoker = true)
AS
SELECT
  p.user_id,
  p.full_name,
  p.university,
  p.course_name,
  p.created_at
FROM public.profiles p
WHERE public.is_affiliate_of_user(auth.uid(), p.user_id);

GRANT SELECT ON public.affiliate_referred_users TO authenticated;

-- 3. STORAGE: explicit UPDATE policy on assignment-briefs bucket
DROP POLICY IF EXISTS "Users can update their own assignment briefs" ON storage.objects;

CREATE POLICY "Users can update their own assignment briefs"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'assignment-briefs'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'assignment-briefs'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 4. FUNCTION SEARCH PATH: lock down 4 email queue helpers
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public;
