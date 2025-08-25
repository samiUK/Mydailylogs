-- Remove the unused organizations table since organization_id in profiles contains the organization name directly

-- First, check if there are any foreign key constraints referencing the organizations table
-- and drop them if they exist

-- Drop foreign key constraints that reference organizations table
DO $$ 
BEGIN
    -- Drop foreign key constraint from profiles table if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'profiles_organization_id_fkey' 
        AND table_name = 'profiles'
    ) THEN
        ALTER TABLE profiles DROP CONSTRAINT profiles_organization_id_fkey;
        RAISE NOTICE 'Dropped foreign key constraint profiles_organization_id_fkey';
    END IF;

    -- Drop foreign key constraint from subscriptions table if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'subscriptions_organization_id_fkey' 
        AND table_name = 'subscriptions'
    ) THEN
        ALTER TABLE subscriptions DROP CONSTRAINT subscriptions_organization_id_fkey;
        RAISE NOTICE 'Dropped foreign key constraint subscriptions_organization_id_fkey';
    END IF;

    -- Drop foreign key constraint from checklist_templates table if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'checklist_templates_organization_id_fkey' 
        AND table_name = 'checklist_templates'
    ) THEN
        ALTER TABLE checklist_templates DROP CONSTRAINT checklist_templates_organization_id_fkey;
        RAISE NOTICE 'Dropped foreign key constraint checklist_templates_organization_id_fkey';
    END IF;

    -- Drop foreign key constraint from daily_checklists table if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'daily_checklists_organization_id_fkey' 
        AND table_name = 'daily_checklists'
    ) THEN
        ALTER TABLE daily_checklists DROP CONSTRAINT daily_checklists_organization_id_fkey;
        RAISE NOTICE 'Dropped foreign key constraint daily_checklists_organization_id_fkey';
    END IF;

    -- Drop foreign key constraint from external_submissions table if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'external_submissions_organization_id_fkey' 
        AND table_name = 'external_submissions'
    ) THEN
        ALTER TABLE external_submissions DROP CONSTRAINT external_submissions_organization_id_fkey;
        RAISE NOTICE 'Dropped foreign key constraint external_submissions_organization_id_fkey';
    END IF;

    -- Drop foreign key constraint from feedback table if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'feedback_organization_id_fkey' 
        AND table_name = 'feedback'
    ) THEN
        ALTER TABLE feedback DROP CONSTRAINT feedback_organization_id_fkey;
        RAISE NOTICE 'Dropped foreign key constraint feedback_organization_id_fkey';
    END IF;

    -- Drop foreign key constraint from holidays table if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'holidays_organization_id_fkey' 
        AND table_name = 'holidays'
    ) THEN
        ALTER TABLE holidays DROP CONSTRAINT holidays_organization_id_fkey;
        RAISE NOTICE 'Dropped foreign key constraint holidays_organization_id_fkey';
    END IF;

    -- Drop foreign key constraint from report_audit_logs table if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'report_audit_logs_organization_id_fkey' 
        AND table_name = 'report_audit_logs'
    ) THEN
        ALTER TABLE report_audit_logs DROP CONSTRAINT report_audit_logs_organization_id_fkey;
        RAISE NOTICE 'Dropped foreign key constraint report_audit_logs_organization_id_fkey';
    END IF;

    -- Drop foreign key constraint from report_backups table if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'report_backups_organization_id_fkey' 
        AND table_name = 'report_backups'
    ) THEN
        ALTER TABLE report_backups DROP CONSTRAINT report_backups_organization_id_fkey;
        RAISE NOTICE 'Dropped foreign key constraint report_backups_organization_id_fkey';
    END IF;

    -- Drop foreign key constraint from staff_unavailability table if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'staff_unavailability_organization_id_fkey' 
        AND table_name = 'staff_unavailability'
    ) THEN
        ALTER TABLE staff_unavailability DROP CONSTRAINT staff_unavailability_organization_id_fkey;
        RAISE NOTICE 'Dropped foreign key constraint staff_unavailability_organization_id_fkey';
    END IF;

    -- Drop foreign key constraint from submitted_reports table if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'submitted_reports_organization_id_fkey' 
        AND table_name = 'submitted_reports'
    ) THEN
        ALTER TABLE submitted_reports DROP CONSTRAINT submitted_reports_organization_id_fkey;
        RAISE NOTICE 'Dropped foreign key constraint submitted_reports_organization_id_fkey';
    END IF;

    -- Drop foreign key constraint from template_assignments table if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'template_assignments_organization_id_fkey' 
        AND table_name = 'template_assignments'
    ) THEN
        ALTER TABLE template_assignments DROP CONSTRAINT template_assignments_organization_id_fkey;
        RAISE NOTICE 'Dropped foreign key constraint template_assignments_organization_id_fkey';
    END IF;

    -- Drop foreign key constraint from template_schedule_exclusions table if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'template_schedule_exclusions_organization_id_fkey' 
        AND table_name = 'template_schedule_exclusions'
    ) THEN
        ALTER TABLE template_schedule_exclusions DROP CONSTRAINT template_schedule_exclusions_organization_id_fkey;
        RAISE NOTICE 'Dropped foreign key constraint template_schedule_exclusions_organization_id_fkey';
    END IF;

END $$;

-- Now drop the organizations table
DROP TABLE IF EXISTS organizations CASCADE;

-- Update organization_id columns to be text instead of uuid since they contain organization names
-- Converting organization_id from uuid to text in all tables since it stores organization names directly

-- profiles table
ALTER TABLE profiles ALTER COLUMN organization_id TYPE text USING organization_id::text;

-- checklist_templates table  
ALTER TABLE checklist_templates ALTER COLUMN organization_id TYPE text USING organization_id::text;

-- daily_checklists table
ALTER TABLE daily_checklists ALTER COLUMN organization_id TYPE text USING organization_id::text;

-- external_submissions table
ALTER TABLE external_submissions ALTER COLUMN organization_id TYPE text USING organization_id::text;

-- feedback table
ALTER TABLE feedback ALTER COLUMN organization_id TYPE text USING organization_id::text;

-- holidays table
ALTER TABLE holidays ALTER COLUMN organization_id TYPE text USING organization_id::text;

-- report_audit_logs table
ALTER TABLE report_audit_logs ALTER COLUMN organization_id TYPE text USING organization_id::text;

-- report_backups table
ALTER TABLE report_backups ALTER COLUMN organization_id TYPE text USING organization_id::text;

-- staff_unavailability table
ALTER TABLE staff_unavailability ALTER COLUMN organization_id TYPE text USING organization_id::text;

-- submitted_reports table
ALTER TABLE submitted_reports ALTER COLUMN organization_id TYPE text USING organization_id::text;

-- subscriptions table
ALTER TABLE subscriptions ALTER COLUMN organization_id TYPE text USING organization_id::text;

-- template_assignments table
ALTER TABLE template_assignments ALTER COLUMN organization_id TYPE text USING organization_id::text;

-- template_schedule_exclusions table
ALTER TABLE template_schedule_exclusions ALTER COLUMN organization_id TYPE text USING organization_id::text;

RAISE NOTICE 'Successfully removed organizations table and updated organization_id columns to text type';
