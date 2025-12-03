import { createClient } from "@/lib/supabase/server"
import { getSubscriptionLimits } from "@/lib/subscription-limits"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { organizationId } = await request.json()

    if (!organizationId) {
      return Response.json({ error: "Organization ID is required" }, { status: 400 })
    }

    const { data: org } = await supabase
      .from("organizations")
      .select("custom_template_limit, custom_team_limit, custom_manager_limit, custom_monthly_submissions")
      .eq("organization_id", organizationId)
      .single()
    // </CHANGE>

    // Get organization subscription
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("plan_name, status, created_at")
      .eq("organization_id", organizationId)
      .single()

    if (!subscription) {
      return Response.json({ error: "No subscription found" }, { status: 404 })
    }

    const baseLimits = getSubscriptionLimits(subscription.plan_name)

    const limits = {
      maxTemplates: org?.custom_template_limit ?? baseLimits.maxTemplates,
      maxTeamMembers: org?.custom_team_limit ?? baseLimits.maxTeamMembers,
      maxAdminAccounts: org?.custom_manager_limit ?? baseLimits.maxAdminAccounts,
      maxReportSubmissions: org?.custom_monthly_submissions ?? baseLimits.maxReportSubmissions,
      planName: baseLimits.planName,
      // Track which limits are custom
      hasCustomTemplateLimit: org?.custom_template_limit !== null,
      hasCustomTeamLimit: org?.custom_team_limit !== null,
      hasCustomManagerLimit: org?.custom_manager_limit !== null,
      hasCustomMonthlySubmissions: org?.custom_monthly_submissions !== null,
    }
    // </CHANGE>

    // Get current usage counts
    const { data: profiles } = await supabase.from("profiles").select("role").eq("organization_id", organizationId)

    const { data: templates } = await supabase.from("log_templates").select("id").eq("organization_id", organizationId)

    const teamMemberCount = profiles?.length || 0
    const adminManagerCount = profiles?.filter((p) => p.role === "admin" || p.role === "manager").length || 0
    const templateCount = templates?.length || 0

    // For free users, get monthly submission count
    let monthlySubmissions = null
    if (baseLimits.planName === "Starter") {
      const subscriptionCreatedAt = new Date(subscription.created_at)
      const now = new Date()

      // Calculate billing period start (30-day cycle from signup)
      const daysSinceSignup = Math.floor((now.getTime() - subscriptionCreatedAt.getTime()) / (1000 * 60 * 60 * 24))
      const currentCycle = Math.floor(daysSinceSignup / 30)
      const periodStart = new Date(subscriptionCreatedAt)
      periodStart.setDate(periodStart.getDate() + currentCycle * 30)

      const nextReset = new Date(periodStart)
      nextReset.setDate(nextReset.getDate() + 30)

      const { count } = await supabase
        .from("submitted_reports")
        .select("*", { count: "only", head: true })
        .eq("organization_id", organizationId)
        .gte("submitted_at", periodStart.toISOString())
        .is("deleted_at", null)

      monthlySubmissions = {
        count: count || 0,
        limit: limits.maxReportSubmissions,
        nextReset: nextReset.toISOString(),
      }
      // </CHANGE>
    }

    return Response.json({
      limits,
      usage: {
        teamMemberCount,
        adminManagerCount,
        templateCount,
      },
      monthlySubmissions,
    })
  } catch (error) {
    console.error("Error fetching organization quota:", error)
    return Response.json({ error: "Failed to fetch quota" }, { status: 500 })
  }
}
