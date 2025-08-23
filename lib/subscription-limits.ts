import { createClient } from "@/lib/supabase/client"

export interface SubscriptionLimits {
  maxTemplates: number
  maxTeamMembers: number
  hasCustomBranding: boolean
  planName: string
}

export async function getSubscriptionLimits(organizationId: string): Promise<SubscriptionLimits> {
  const supabase = createClient()

  try {
    // Get organization's subscription
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select(`
        subscription_plans (
          name,
          max_templates,
          max_team_members,
          features
        )
      `)
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .single()

    if (subscription?.subscription_plans) {
      const plan = subscription.subscription_plans
      return {
        maxTemplates: plan.max_templates,
        maxTeamMembers: plan.max_team_members,
        hasCustomBranding: plan.features?.reports_branding === "custom",
        planName: plan.name,
      }
    }
  } catch (error) {
    console.error("Error fetching subscription limits:", error)
  }

  // Default to free plan limits
  return {
    maxTemplates: 3,
    maxTeamMembers: 5,
    hasCustomBranding: false,
    planName: "Free",
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

    return {
      templateCount: templateCount || 0,
      teamMemberCount: teamMemberCount || 0,
    }
  } catch (error) {
    console.error("Error fetching current usage:", error)
    return {
      templateCount: 0,
      teamMemberCount: 0,
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
