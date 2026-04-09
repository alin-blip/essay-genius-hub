
-- Create storage bucket for assignment brief uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'assignment-briefs',
  'assignment-briefs',
  false,
  20971520,
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword', 'text/plain', 'image/png', 'image/jpeg']
);

-- Users can upload their own briefs
CREATE POLICY "Users can upload briefs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'assignment-briefs' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Users can read their own briefs
CREATE POLICY "Users can read own briefs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'assignment-briefs' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Users can delete their own briefs
CREATE POLICY "Users can delete own briefs"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'assignment-briefs' AND (storage.foldername(name))[1] = auth.uid()::text);
