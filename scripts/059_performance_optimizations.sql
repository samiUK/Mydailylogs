-- Adding database indexes for frequently queried columns to improve performance
-- Performance optimization indexes for faster queries

-- Profiles table indexes (most frequently queried)
CREATE INDEX IF NOT EXISTS idx_profiles_organization_id ON profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_reports_to ON profiles(reports_to);

-- Template assignments indexes
CREATE INDEX IF NOT EXISTS idx_template_assignments_assigned_to ON template_assignments(assigned_to);
CREATE INDEX IF NOT EXISTS idx_template_assignments_template_id ON template_assignments(template_id);
CREATE INDEX IF NOT EXISTS idx_template_assignments_organization_id ON template_assignments(organization_id);
CREATE INDEX IF NOT EXISTS idx_template_assignments_status ON template_assignments(status);
CREATE INDEX IF NOT EXISTS idx_template_assignments_assigned_at ON template_assignments(assigned_at DESC);

-- Submitted reports indexes
CREATE INDEX IF NOT EXISTS idx_submitted_reports_organization_id ON submitted_reports(organization_id);
CREATE INDEX IF NOT EXISTS idx_submitted_reports_submitted_by ON submitted_reports(submitted_by);
CREATE INDEX IF NOT EXISTS idx_submitted_reports_submitted_at ON submitted_reports(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_submitted_reports_status ON submitted_reports(status);
CREATE INDEX IF NOT EXISTS idx_submitted_reports_deleted_at ON submitted_reports(deleted_at);

-- Daily checklists indexes
CREATE INDEX IF NOT EXISTS idx_daily_checklists_assigned_to ON daily_checklists(assigned_to);
CREATE INDEX IF NOT EXISTS idx_daily_checklists_date ON daily_checklists(date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_checklists_organization_id ON daily_checklists(organization_id);
CREATE INDEX IF NOT EXISTS idx_daily_checklists_status ON daily_checklists(status);

-- Checklist templates indexes
CREATE INDEX IF NOT EXISTS idx_checklist_templates_organization_id ON checklist_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_checklist_templates_is_active ON checklist_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_checklist_templates_created_by ON checklist_templates(created_by);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Checklist items indexes
CREATE INDEX IF NOT EXISTS idx_checklist_items_template_id ON checklist_items(template_id);
CREATE INDEX IF NOT EXISTS idx_checklist_items_order_index ON checklist_items(order_index);

-- Checklist responses indexes
CREATE INDEX IF NOT EXISTS idx_checklist_responses_checklist_id ON checklist_responses(checklist_id);
CREATE INDEX IF NOT EXISTS idx_checklist_responses_item_id ON checklist_responses(item_id);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_profiles_org_role ON profiles(organization_id, role);
CREATE INDEX IF NOT EXISTS idx_template_assignments_org_status ON template_assignments(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_submitted_reports_org_date ON submitted_reports(organization_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_daily_checklists_user_date ON daily_checklists(assigned_to, date DESC);
