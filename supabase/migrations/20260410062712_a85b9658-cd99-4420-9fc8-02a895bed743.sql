
-- Create managed_students table
CREATE TABLE public.managed_students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL,
  student_id UUID,
  invite_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Unique constraint: one invite per admin-email pair
CREATE UNIQUE INDEX idx_managed_students_admin_email ON public.managed_students (admin_id, invite_email);

-- Index for student lookups
CREATE INDEX idx_managed_students_student_id ON public.managed_students (student_id);

-- Trigger for updated_at
CREATE TRIGGER update_managed_students_updated_at
  BEFORE UPDATE ON public.managed_students
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.managed_students ENABLE ROW LEVEL SECURITY;

-- RLS: Admins can do everything on their own rows
CREATE POLICY "Admins can view their managed students"
  ON public.managed_students FOR SELECT
  TO authenticated
  USING (auth.uid() = admin_id);

CREATE POLICY "Admins can insert managed students"
  ON public.managed_students FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = admin_id);

CREATE POLICY "Admins can update their managed students"
  ON public.managed_students FOR UPDATE
  TO authenticated
  USING (auth.uid() = admin_id);

CREATE POLICY "Admins can delete their managed students"
  ON public.managed_students FOR DELETE
  TO authenticated
  USING (auth.uid() = admin_id);

-- RLS: Students can see invites targeting them
CREATE POLICY "Students can view their invites"
  ON public.managed_students FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

-- RLS: Students can accept/decline invites matching their email
CREATE POLICY "Students can update invites for their email"
  ON public.managed_students FOR UPDATE
  TO authenticated
  USING (
    invite_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND status = 'pending'
  );

-- Security definer function to check admin relationship
CREATE OR REPLACE FUNCTION public.is_admin_of(_admin_id UUID, _student_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.managed_students
    WHERE admin_id = _admin_id
      AND student_id = _student_id
      AND status = 'accepted'
  )
$$;

-- Update assignments RLS: add admin access policies
CREATE POLICY "Admins can view student assignments"
  ON public.assignments FOR SELECT
  TO authenticated
  USING (public.is_admin_of(auth.uid(), user_id));

CREATE POLICY "Admins can update student assignments"
  ON public.assignments FOR UPDATE
  TO authenticated
  USING (public.is_admin_of(auth.uid(), user_id));

CREATE POLICY "Admins can delete student assignments"
  ON public.assignments FOR DELETE
  TO authenticated
  USING (public.is_admin_of(auth.uid(), user_id));

CREATE POLICY "Admins can insert assignments for students"
  ON public.assignments FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_of(auth.uid(), user_id));

-- Update folders RLS: add admin access policies
CREATE POLICY "Admins can view student folders"
  ON public.folders FOR SELECT
  TO authenticated
  USING (public.is_admin_of(auth.uid(), user_id));

CREATE POLICY "Admins can update student folders"
  ON public.folders FOR UPDATE
  TO authenticated
  USING (public.is_admin_of(auth.uid(), user_id));

CREATE POLICY "Admins can delete student folders"
  ON public.folders FOR DELETE
  TO authenticated
  USING (public.is_admin_of(auth.uid(), user_id));

CREATE POLICY "Admins can insert folders for students"
  ON public.folders FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_of(auth.uid(), user_id));

-- Allow service role full access for edge functions
CREATE POLICY "Service role can manage managed_students"
  ON public.managed_students FOR ALL
  TO authenticated
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
