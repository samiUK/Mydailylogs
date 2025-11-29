import { createClient } from "@/lib/supabase/client"

export interface SubscriptionLimits {
  maxTemplates: number
  maxTeamMembers: number
  maxAdmins: number
  hasCustomBranding: boolean
  hasTaskAutomation: boolean
  maxReportSubmissions: number | null // null means unlimited
  hasContractorLinkShare: boolean
  hasPhotoUpload: boolean
  planName: string
}

export async function getSubscriptionLimits(organizationId: string): Promise<SubscriptionLimits> {
  const supabase = createClient()

  try {
    // Get organization's subscription
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("plan_name")
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .single()

    if (subscription?.plan_name) {
      const planLimits: Record<string, SubscriptionLimits> = {
        starter: {
          maxTemplates: 3,
          maxTeamMembers: 5,
          maxAdmins: 1,
          hasCustomBranding: false,
          hasTaskAutomation: false,
          maxReportSubmissions: 50,
          hasContractorLinkShare: false,
          hasPhotoUpload: false,
          planName: "Starter",
        },
        growth: {
          maxTemplates: 10,
          maxTeamMembers: 25,
          maxAdmins: 3,
          hasCustomBranding: true,
          hasTaskAutomation: true,
          maxReportSubmissions: null,
          hasContractorLinkShare: true,
          hasPhotoUpload: true,
          planName: "Growth",
        },
        scale: {
          maxTemplates: 20,
          maxTeamMembers: 75,
          maxAdmins: 10,
          hasCustomBranding: true,
          hasTaskAutomation: true,
          maxReportSubmissions: null,
          hasContractorLinkShare: true,
          hasPhotoUpload: true,
          planName: "Scale",
        },
      }

      return planLimits[subscription.plan_name.toLowerCase()] || planLimits.starter
    }
  } catch (error) {
    console.error("Error fetching subscription limits:", error)
  }

  // Default to starter plan limits
  return {
    maxTemplates: 3,
    maxTeamMembers: 5,
    maxAdmins: 1,
    hasCustomBranding: false,
    hasTaskAutomation: false,
    maxReportSubmissions: 50,
    hasContractorLinkShare: false,
    hasPhotoUpload: false,
    planName: "Starter",
  }
}

export async function getCurrentUsage(organizationId: string) {
  const supabase = createClient()

  try {
    // Get current template count
    const { count: templateCount } = await supabase
      .from("checklist_templates")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("is_active", true)

    // Get current team member count
    const { count: teamMemberCount } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)

    const { count: adminCount } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("role", "admin")

    const { count: reportSubmissionCount } = await supabase
      .from("submitted_reports")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)

    return {
      templateCount: templateCount || 0,
      teamMemberCount: teamMemberCount || 0,
      adminCount: adminCount || 0,
      reportSubmissionCount: reportSubmissionCount || 0,
    }
  } catch (error) {
    console.error("Error fetching current usage:", error)
    return {
      templateCount: 0,
      teamMemberCount: 0,
      adminCount: 0,
      reportSubmissionCount: 0,
    }
  }
}

export async function checkCanCreateTemplate(organizationId: string): Promise<{
  canCreate: boolean
  reason?: string
  currentCount: number
  maxAllowed: number
}> {
  const [limits, usage] = await Promise.all([getSubscriptionLimits(organizationId), getCurrentUsage(organizationId)])

  const canCreate = usage.templateCount < limits.maxTemplates

  return {
    canCreate,
    reason: canCreate
      ? undefined
      : `You've reached your plan limit of ${limits.maxTemplates} templates. Upgrade to create more.`,
    currentCount: usage.templateCount,
    maxAllowed: limits.maxTemplates,
  }
}

export async function checkCanCreateTeamMember(organizationId: string): Promise<{
  canCreate: boolean
  reason?: string
  currentCount: number
  maxAllowed: number
}> {
  const [limits, usage] = await Promise.all([getSubscriptionLimits(organizationId), getCurrentUsage(organizationId)])

  const canCreate = usage.teamMemberCount < limits.maxTeamMembers

  return {
    canCreate,
    reason: canCreate
      ? undefined
      : `You've reached your plan limit of ${limits.maxTeamMembers} team members. Upgrade to add more.`,
    currentCount: usage.teamMemberCount,
    maxAllowed: limits.maxTeamMembers,
  }
}

export async function checkCanCreateAdmin(organizationId: string): Promise<{
  canCreate: boolean
  reason?: string
  currentCount: number
  maxAllowed: number
  requiresUpgrade: boolean
}> {
  const [limits, usage] = await Promise.all([getSubscriptionLimits(organizationId), getCurrentUsage(organizationId)])

  const canCreate = usage.adminCount < limits.maxAdmins

  return {
    canCreate,
    reason: canCreate
      ? undefined
      : limits.planName === "Starter"
        ? "Starter plan only includes 1 admin account. Upgrade to Growth or Scale to add more admins."
        : `You've reached your plan limit of ${limits.maxAdmins} admin accounts. Upgrade to add more.`,
    currentCount: usage.adminCount,
    maxAllowed: limits.maxAdmins,
    requiresUpgrade: !canCreate,
  }
}

export async function checkCanSubmitReport(organizationId: string): Promise<{
  canSubmit: boolean
  reason?: string
  currentCount: number
  maxAllowed: number | null
}> {
  const [limits, usage] = await Promise.all([getSubscriptionLimits(organizationId), getCurrentUsage(organizationId)])

  // null means unlimited
  const canSubmit = limits.maxReportSubmissions === null || usage.reportSubmissionCount < limits.maxReportSubmissions

  return {
    canSubmit,
    reason: canSubmit
      ? undefined
      : `You've reached your plan limit of ${limits.maxReportSubmissions} report submissions. Upgrade to Growth or Scale for unlimited reports.`,
    currentCount: usage.reportSubmissionCount,
    maxAllowed: limits.maxReportSubmissions,
  }
}

export async function checkCanUseContractorLinkShare(organizationId: string): Promise<{
  canUse: boolean
  reason?: string
}> {
  const limits = await getSubscriptionLimits(organizationId)

  const canUse = limits.hasContractorLinkShare

  return {
    canUse,
    reason: canUse
      ? undefined
      : "Your current plan does not include contractor link share. Upgrade to Growth or Scale to access this feature.",
  }
}

export async function checkCanUploadPhotos(organizationId: string): Promise<{
  canUpload: boolean
  reason?: string
}> {
  const limits = await getSubscriptionLimits(organizationId)

  const canUpload = limits.hasPhotoUpload

  return {
    canUpload,
    reason: canUpload
      ? undefined
      : "Your current plan does not include photo uploads. Upgrade to Growth or Scale to access this feature.",
  }
}

export async function checkReportSubmissionLimit(organizationId: string): Promise<{
  canSubmit: boolean
  currentCount: number
  limit: number
  message?: string
}> {
  const supabase = createClient()
  const limits = await getSubscriptionLimits(organizationId)

  // Paid plans have unlimited submissions
  if (limits.maxReportSubmissions === null) {
    return {
      canSubmit: true,
      currentCount: 0,
      limit: -1,
    }
  }

  // Count submissions in current month for free plans
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { count } = await supabase
    .from("submitted_reports")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .gte("submitted_at", startOfMonth.toISOString())

  const currentCount = count || 0
  const canSubmit = currentCount < limits.maxReportSubmissions

  return {
    canSubmit,
    currentCount,
    limit: limits.maxReportSubmissions,
    message: canSubmit
      ? undefined
      : `You've reached your monthly limit of ${limits.maxReportSubmissions} report submissions. Upgrade to Growth or Scale for unlimited submissions.`,
  }
}
