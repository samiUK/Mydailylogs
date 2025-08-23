-- Create checklist templates table
CREATE TABLE IF NOT EXISTS public.checklist_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  frequency text NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'custom')),
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create checklist tasks table
CREATE TABLE IF NOT EXISTS public.checklist_tasks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  checklist_template_id uuid REFERENCES public.checklist_templates(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  task_type text NOT NULL CHECK (task_type IN ('boolean', 'numeric', 'text', 'photo')),
  validation_rules jsonb, -- e.g., {"min": 0, "max": 5, "required": true}
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create checklist submissions table
CREATE TABLE IF NOT EXISTS public.checklist_submissions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  checklist_template_id uuid REFERENCES public.checklist_templates(id) ON DELETE CASCADE,
  submitted_by uuid REFERENCES public.profiles(id),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  submission_date date NOT NULL,
  status text DEFAULT 'completed' CHECK (status IN ('in_progress', 'completed')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(checklist_template_id, submitted_by, submission_date)
);

-- Create task responses table
CREATE TABLE IF NOT EXISTS public.task_responses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id uuid REFERENCES public.checklist_submissions(id) ON DELETE CASCADE,
  task_id uuid REFERENCES public.checklist_tasks(id) ON DELETE CASCADE,
  response_value text,
  photo_url text,
  notes text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for checklist_templates
CREATE POLICY "Users can view templates from their organization" ON public.checklist_templates
  FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Admins can manage templates in their organization" ON public.checklist_templates
  FOR ALL TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- RLS Policies for checklist_tasks
CREATE POLICY "Users can view tasks from their organization templates" ON public.checklist_tasks
  FOR SELECT TO authenticated
  USING (checklist_template_id IN (
    SELECT id FROM public.checklist_templates WHERE organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Admins can manage tasks in their organization templates" ON public.checklist_tasks
  FOR ALL TO authenticated
  USING (checklist_template_id IN (
    SELECT id FROM public.checklist_templates WHERE organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  ));

-- RLS Policies for checklist_submissions
CREATE POLICY "Users can view submissions from their organization" ON public.checklist_submissions
  FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can create submissions in their organization" ON public.checklist_submissions
  FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  ) AND submitted_by = auth.uid());

CREATE POLICY "Users can update their own submissions" ON public.checklist_submissions
  FOR UPDATE TO authenticated
  USING (submitted_by = auth.uid());

-- RLS Policies for task_responses
CREATE POLICY "Users can view responses from their organization submissions" ON public.task_responses
  FOR SELECT TO authenticated
  USING (submission_id IN (
    SELECT id FROM public.checklist_submissions WHERE organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Users can manage responses for their submissions" ON public.task_responses
  FOR ALL TO authenticated
  USING (submission_id IN (
    SELECT id FROM public.checklist_submissions WHERE submitted_by = auth.uid()
  ));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_checklist_templates_organization_id ON public.checklist_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_checklist_tasks_template_id ON public.checklist_tasks(checklist_template_id);
CREATE INDEX IF NOT EXISTS idx_checklist_submissions_template_date ON public.checklist_submissions(checklist_template_id, submission_date);
CREATE INDEX IF NOT EXISTS idx_task_responses_submission_id ON public.task_responses(submission_id);
