CREATE POLICY "Admins can view student profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.is_admin_of(auth.uid(), user_id));

CREATE POLICY "Students can view admin profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.managed_students
    WHERE managed_students.admin_id = profiles.user_id
      AND managed_students.student_id = auth.uid()
      AND managed_students.status = 'accepted'
  )
);