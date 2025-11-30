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
    console.log("[v0] Fetching subscription for organization:", organizationId)

    // Get organization's subscription
    const { data: subscription, error } = await supabase
      .from("subscriptions")
      .select("plan_name, status")
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .single()

    console.log("[v0] Subscription query result:", { subscription, error })

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

      const planKey = subscription.plan_name.toLowerCase()
      const limits = planLimits[planKey] || planLimits.starter

      console.log("[v0] Subscription limits for plan:", {
        planName: subscription.plan_name,
        planKey,
        limits,
      })

      return limits
    }
  } catch (error) {
    console.error("[v0] Error fetching subscription limits:", error)
  }

  console.log("[v0] No active subscription found, returning starter limits")

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

export async function handleSubscriptionDowngrade(organizationId: string): Promise<void> {
  const supabase = createClient()

  try {
    console.log("[v0] Handling subscription downgrade for organization:", organizationId)

    // Get current subscription limits
    const limits = await getSubscriptionLimits(organizationId)

    // If on free tier (Starter), disable all templates except the last 3
    if (limits.planName === "Starter") {
      // Get all active templates ordered by creation date (newest first)
      const { data: templates } = await supabase
        .from("checklist_templates")
        .select("id, created_at")
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .order("created_at", { ascending: false })

      if (templates && templates.length > limits.maxTemplates) {
        // Keep the 3 most recent, disable the rest
        const templatesToDisable = templates.slice(limits.maxTemplates).map((t) => t.id)

        const { error } = await supabase
          .from("checklist_templates")
          .update({ is_active: false })
          .in("id", templatesToDisable)

        if (error) {
          console.error("[v0] Error disabling templates:", error)
        } else {
          console.log(`[v0] Disabled ${templatesToDisable.length} templates due to downgrade`)
        }
      }
    }
  } catch (error) {
    console.error("[v0] Error handling subscription downgrade:", error)
  }
}
