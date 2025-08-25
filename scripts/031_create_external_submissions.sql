-- Create external_submissions table for storing external contractor submissions
CREATE TABLE IF NOT EXISTS public.external_submissions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id uuid REFERENCES public.checklist_templates(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  submitter_name text NOT NULL,
  submission_type text DEFAULT 'external' CHECK (submission_type IN ('external')),
  status text DEFAULT 'completed' CHECK (status IN ('in_progress', 'completed')),
  submitted_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create external_responses table for storing individual question responses
CREATE TABLE IF NOT EXISTS public.external_responses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id uuid REFERENCES public.external_submissions(id) ON DELETE CASCADE,
  item_id uuid REFERENCES public.checklist_items(id) ON DELETE CASCADE,
  response_value text,
  response_type text NOT NULL CHECK (response_type IN ('boolean', 'numeric', 'text', 'photo')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on external tables
ALTER TABLE public.external_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for external_submissions
-- Allow public insert for external forms (no authentication required)
CREATE POLICY "Allow public insert for external submissions" ON public.external_submissions
  FOR INSERT TO anon
  WITH CHECK (true);

-- Allow authenticated users to view submissions from their organization
CREATE POLICY "Users can view external submissions from their organization" ON public.external_submissions
  FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  ));

-- Allow authenticated users to update submissions from their organization (for admin purposes)
CREATE POLICY "Admins can update external submissions in their organization" ON public.external_submissions
  FOR UPDATE TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- RLS Policies for external_responses
-- Allow public insert for external forms (no authentication required)
CREATE POLICY "Allow public insert for external responses" ON public.external_responses
  FOR INSERT TO anon
  WITH CHECK (true);

-- Allow authenticated users to view responses from their organization submissions
CREATE POLICY "Users can view external responses from their organization" ON public.external_responses
  FOR SELECT TO authenticated
  USING (submission_id IN (
    SELECT id FROM public.external_submissions WHERE organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  ));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_external_submissions_template_id ON public.external_submissions(template_id);
CREATE INDEX IF NOT EXISTS idx_external_submissions_organization_id ON public.external_submissions(organization_id);
CREATE INDEX IF NOT EXISTS idx_external_submissions_submitted_at ON public.external_submissions(submitted_at);
CREATE INDEX IF NOT EXISTS idx_external_responses_submission_id ON public.external_responses(submission_id);
CREATE INDEX IF NOT EXISTS idx_external_responses_item_id ON public.external_responses(item_id);

-- Add comments for documentation
COMMENT ON TABLE public.external_submissions IS 'Stores submissions from external contractors who fill out forms without authentication';
COMMENT ON TABLE public.external_responses IS 'Stores individual question responses for external submissions';
COMMENT ON COLUMN public.external_submissions.submitter_name IS 'Full name of the external person who submitted the form';
COMMENT ON COLUMN public.external_submissions.submission_type IS 'Type of submission - currently only external is supported';
COMMENT ON COLUMN public.external_responses.response_value IS 'The actual response value as text (converted from various types)';
COMMENT ON COLUMN public.external_responses.response_type IS 'Original type of the response for proper display and validation';
