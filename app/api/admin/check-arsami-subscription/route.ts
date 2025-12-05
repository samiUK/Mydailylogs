import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  try {
    // Check auth
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const targetEmail = "arsami.uk@gmail.com"

    // Get profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*, organizations(*)")
      .eq("email", targetEmail)
      .single()

    if (!profile) {
      return NextResponse.json(
        {
          error: "Profile not found",
          email: targetEmail,
        },
        { status: 404 },
      )
    }

    // Get all subscriptions for this organization
    const { data: subscriptions } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("organization_id", profile.organization_id)
      .order("created_at", { ascending: false })

    // Get from active_subscriptions view
    const { data: activeView } = await supabase
      .from("active_subscriptions")
      .select("*")
      .eq("organization_id", profile.organization_id)
      .single()

    // Check what getSubscriptionLimits would return
    const { data: limitsCheck } = await supabase
      .from("subscriptions")
      .select("plan_name, status, is_trial, current_period_end, stripe_subscription_id")
      .eq("organization_id", profile.organization_id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    return NextResponse.json({
      email: targetEmail,
      organization: {
        id: profile.organization_id,
        name: profile.organizations?.organization_name,
      },
      subscriptions: {
        count: subscriptions?.length || 0,
        all: subscriptions || [],
        active: activeView || null,
        limits_check: limitsCheck || null,
      },
      diagnosis: {
        has_subscription: (subscriptions?.length || 0) > 0,
        has_active_view: !!activeView,
        plan_in_db: limitsCheck?.plan_name || "none",
        stripe_sub_id: limitsCheck?.stripe_subscription_id || "none",
        status: limitsCheck?.status || "none",
        is_trial: limitsCheck?.is_trial || false,
      },
    })
  } catch (error: any) {
    console.error("[v0] Error checking arsami subscription:", error)
    return NextResponse.json(
      {
        error: "Failed to check subscription",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
