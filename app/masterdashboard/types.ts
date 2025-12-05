// Unified User type matching profiles table schema
export interface User {
  id: string
  email: string
  full_name: string
  role: string
  organization_id: string | null
  organization_name?: string
  created_at: string
  is_email_verified?: boolean
}

// Unified Organization type with JOIN from subscriptions
export interface Organization {
  organization_id: string
  organization_name: string
  slug: string
  created_at: string
  staff_reports_page_enabled?: boolean
  // From subscription JOIN
  plan_name: string
  subscription_status: string
  is_masteradmin_trial: boolean
  admin_email?: string // Email of organization admin - primary identifier
  // Computed fields
  user_count?: number
  admin_emails?: string[]
  staff_count?: number
}

// Unified Subscription type with JOINs from organizations and profiles
export interface Subscription {
  id: string
  organization_id: string
  stripe_subscription_id: string | null
  status: string
  plan_name: string
  current_period_start: string
  current_period_end: string
  trial_ends_at: string | null
  is_trial: boolean
  is_masteradmin_trial: boolean
  // From organization JOIN
  organization_name: string
  // From profile JOIN
  user_email: string
}

// Unified Payment type
export interface Payment {
  id: string
  subscription_id: string
  amount: number
  status: string
  created_at: string
  transaction_id: string
  currency?: string
  // From subscription JOIN (if needed)
  organization_name?: string
  user_email?: string // Admin email - primary identifier
}

// Unified Feedback type
export interface Feedback {
  id: string
  email: string
  name: string
  subject: string
  message: string
  status: string
  created_at: string
  organization_id?: string
}

export interface DashboardData {
  organizations: Organization[]
  profiles: User[]
  subscriptions: Subscription[]
  payments: Payment[]
  feedback: Feedback[]
  superusers?: Superuser[] // Add superusers array to DashboardData
  counts: {
    organizations: number
    profiles: number
    subscriptions: number
    payments: number
    feedback: number
    superusers?: number // Add superusers count
  }
  stats?: {
    totalOrgs: number
    totalUsers: number
    totalRevenue: number
    newSignupsThisMonth: number
    conversionRate: number
    paidCustomers: number
    totalReports: number
    totalTemplates: number
    totalChecklists: number
  }
  checklistsData?: {
    totalAssignments: number
    completed: number
    pending: number
    activeTemplates: number
  }
  timestamp?: string
}

export interface NotificationState {
  show: boolean
  message: string
  type: "success" | "error" | "info"
}

export interface ConfirmDialogState {
  show: boolean
  title: string
  message: string
  onConfirm: () => void
}

export interface Superuser {
  id: string
  email: string
  full_name?: string // Added full_name field from profiles table
  role: string
  is_active?: boolean // Made optional since profiles table doesn't have this
  created_at: string
  last_login?: string
}

// Quota types matching database exactly
export interface OrganizationQuota {
  organization_id: string
  organization_name: string
  plan_name: string
  custom_template_limit: number | null
  custom_team_limit: number | null
  custom_manager_limit: number | null
  custom_monthly_submissions: number | null
  current_usage: {
    templates: number
    team_members: number
    managers: number
    monthly_submissions: number
  }
  plan_defaults: {
    templates: number
    team_members: number
    managers: number
    monthly_submissions: number
  }
  effective_limits?: {
    templates: number
    team_members: number
    managers: number
    monthly_submissions: number
  }
}
