import { createServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const supabase = await createServerClient()

  const url = new URL(request.url)
  const email = url.searchParams.get("email") || "arsami.uk@gmail.com"

  console.log(`[v0] Verifying subscription sync for ${email}`)

  try {
    // Step 1: Find user and organization
    const { data: profile } = await supabase.from("profiles").select("*, organizations(*)").eq("email", email).single()

    if (!profile) {
      return NextResponse.json({
        success: false,
        error: "User not found",
        email,
      })
    }

    console.log(`[v0] Found profile for ${email}, org: ${profile.organization_id}`)

    // Step 2: Check subscriptions table
    const { data: subscriptions } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("organization_id", profile.organization_id)
      .order("created_at", { ascending: false })

    console.log(`[v0] Found ${subscriptions?.length || 0} subscriptions in DB`)

    // Step 3: Check active_subscriptions view
    const { data: activeView } = await supabase
      .from("active_subscriptions")
      .select("*")
      .eq("organization_id", profile.organization_id)
      .single()

    console.log(`[v0] Active subscription view:`, activeView?.plan_name || "NONE")

    // Step 4: Check subscription limits
    const { data: limitsCheck } = await supabase
      .rpc("get_organization_limits", {
        org_id: profile.organization_id,
      })
      .single()

    // Step 5: Check recent activity logs
    const { data: activityLogs } = await supabase
      .from("subscription_activity_logs")
      .select("*")
      .eq("organization_id", profile.organization_id)
      .order("created_at", { ascending: false })
      .limit(5)

    // Step 6: Verification status
    const hasPaidSubscription = subscriptions?.some((s) => s.stripe_subscription_id && s.status === "active")

    const correctPlanShowing = activeView?.plan_name && activeView.plan_name !== "starter"

    const allChecks = {
      userFound: !!profile,
      organizationFound: !!profile.organization_id,
      hasSubscriptions: (subscriptions?.length || 0) > 0,
      hasPaidSubscription,
      activeViewWorking: !!activeView,
      correctPlanShowing,
      activityLogsExist: (activityLogs?.length || 0) > 0,
      limitsWorking: !!limitsCheck,
    }

    const allPassed = Object.values(allChecks).every((v) => v === true)

    return NextResponse.json({
      success: allPassed,
      email,
      organizationId: profile.organization_id,
      organizationName: profile.organizations?.organization_name,
      checks: allChecks,
      currentPlan: activeView?.plan_name || "No active subscription",
      subscriptionCount: subscriptions?.length || 0,
      subscriptions: subscriptions?.map((s) => ({
        id: s.id,
        plan_name: s.plan_name,
        status: s.status,
        stripe_subscription_id: s.stripe_subscription_id,
        created_at: s.created_at,
        is_trial: s.is_trial,
      })),
      activeSubscriptionView: activeView,
      recentActivity: activityLogs,
      message: allPassed
        ? "✅ All subscription sync checks passed!"
        : "❌ Some checks failed - review the details above",
    })
  } catch (error) {
    console.error("[v0] Verification error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
