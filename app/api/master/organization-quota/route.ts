import { createClient } from "@/lib/supabase/server"
import { getSubscriptionLimits, getCurrentUsage } from "@/lib/subscription-limits"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { organizationId } = await request.json()

    if (!organizationId) {
      return Response.json({ error: "Organization ID is required" }, { status: 400 })
    }

    const [limits, usage, subscriptionResult, customLimitsResult] = await Promise.all([
      getSubscriptionLimits(organizationId),
      getCurrentUsage(organizationId),
      supabase
        .from("subscriptions")
        .select("plan_name, status, created_at")
        .eq("organization_id", organizationId)
        .in("status", ["active", "trialing"])
        .maybeSingle(),
      supabase
        .from("organizations")
        .select("custom_template_limit, custom_team_limit, custom_manager_limit, custom_monthly_submissions")
        .eq("organization_id", organizationId)
        .maybeSingle(),
    ])

    const subscription = subscriptionResult.data
    const customLimits = customLimitsResult.data
    const planName = subscription?.plan_name?.toLowerCase() || "starter"

    // Calculate monthly submissions for Starter plan
    let monthlySubmissionsUsed = 0
    let submissionPeriodReset = null

    if (planName === "starter" && subscription && limits.maxReportSubmissions) {
      const subscriptionCreatedAt = new Date(subscription.created_at)
      const now = new Date()

      const daysSinceSignup = Math.floor((now.getTime() - subscriptionCreatedAt.getTime()) / (1000 * 60 * 60 * 24))
      const currentCycle = Math.floor(daysSinceSignup / 30)
      const periodStart = new Date(subscriptionCreatedAt)
      periodStart.setDate(periodStart.getDate() + currentCycle * 30)

      const nextReset = new Date(periodStart)
      nextReset.setDate(nextReset.getDate() + 30)

      const { count } = await supabase
        .from("submitted_reports")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .gte("submitted_at", periodStart.toISOString())
        .is("deleted_at", null)

      monthlySubmissionsUsed = count || 0
      submissionPeriodReset = nextReset.toISOString()
    }

    return Response.json({
      templatesLimit: limits.maxTemplates,
      templatesUsed: usage.templateCount,
      isCustomTemplates:
        customLimits?.custom_template_limit !== null && customLimits?.custom_template_limit !== undefined,
      teamMembersLimit: limits.maxTeamMembers,
      teamMembersUsed: usage.teamMemberCount,
      isCustomTeamMembers: customLimits?.custom_team_limit !== null && customLimits?.custom_team_limit !== undefined,
      managersLimit: limits.maxAdminAccounts,
      managersUsed: usage.adminManagerCount,
      isCustomManagers: customLimits?.custom_manager_limit !== null && customLimits?.custom_manager_limit !== undefined,
      monthlySubmissionsLimit: planName === "starter" ? limits.maxReportSubmissions : null,
      monthlySubmissionsUsed,
      isCustomMonthlySubmissions:
        customLimits?.custom_monthly_submissions !== null && customLimits?.custom_monthly_submissions !== undefined,
      submissionPeriodReset,
      planName: limits.planName,
    })
  } catch (error) {
    console.error("[v0] Error fetching organization quota:", error)
    return Response.json({ error: "Failed to fetch quota" }, { status: 500 })
  }
}
