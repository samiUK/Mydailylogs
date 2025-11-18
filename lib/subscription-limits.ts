import { createClient } from "@/lib/supabase/client"

export interface SubscriptionLimits {
  maxTemplates: number
  maxTeamMembers: number
  maxAdmins: number // Added admin limit
  hasCustomBranding: boolean
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
          planName: "Starter",
        },
        growth: {
          maxTemplates: 10,
          maxTeamMembers: 30,
          maxAdmins: 3,
          hasCustomBranding: false,
          planName: "Growth",
        },
        scale: {
          maxTemplates: 30,
          maxTeamMembers: 100,
          maxAdmins: 10,
          hasCustomBranding: true,
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

    return {
      templateCount: templateCount || 0,
      teamMemberCount: teamMemberCount || 0,
      adminCount: adminCount || 0,
    }
  } catch (error) {
    console.error("Error fetching current usage:", error)
    return {
      templateCount: 0,
      teamMemberCount: 0,
      adminCount: 0,
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
