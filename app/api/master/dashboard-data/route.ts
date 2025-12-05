import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getMasterAuthPayload } from "@/lib/master-auth-jwt"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const payload = await getMasterAuthPayload()

    if (!payload || (payload.role !== "masteradmin" && payload.role !== "superuser")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()

    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("id, email, full_name, role, organization_id, created_at")
      .order("created_at", { ascending: false })
      .limit(200)

    if (profileError) throw profileError

    const orgAdminEmailMap = new Map<string, string>()
    const orgNameMap = new Map<string, string>()

    profiles?.forEach((profile: any) => {
      if (profile.role === "admin" && !orgAdminEmailMap.has(profile.organization_id)) {
        orgAdminEmailMap.set(profile.organization_id, profile.email)
      }
    })

    const { data: organizations, error: orgError } = await supabase
      .from("organizations")
      .select(
        `
        organization_id,
        organization_name,
        slug,
        created_at,
        staff_reports_page_enabled,
        subscriptions!inner(
          plan_name,
          status,
          is_masteradmin_trial,
          is_trial
        )
      `,
      )
      .order("created_at", { ascending: false })
      .limit(100)

    if (orgError) throw orgError

    // Build org name map
    organizations?.forEach((org: any) => {
      orgNameMap.set(org.organization_id, org.organization_name)
    })

    const { data: subscriptions, error: subError } = await supabase
      .from("subscriptions")
      .select(
        `
        id,
        organization_id,
        stripe_subscription_id,
        status,
        plan_name,
        current_period_start,
        current_period_end,
        trial_ends_at,
        is_masteradmin_trial,
        is_trial,
        organizations!inner(organization_name)
      `,
      )
      .order("created_at", { ascending: false })
      .limit(100)

    if (subError) throw subError

    const { data: payments, error: paymentError } = await supabase
      .from("payments")
      .select("id, subscription_id, amount, status, created_at, transaction_id")
      .order("created_at", { ascending: false })
      .limit(100)

    if (paymentError) throw paymentError

    const { data: feedback, error: feedbackError } = await supabase
      .from("feedback")
      .select("id, email, name, subject, message, status, created_at")
      .order("created_at", { ascending: false })
      .limit(50)

    if (feedbackError) throw feedbackError

    const { data: superusers, error: superuserError } = await supabase
      .from("profiles")
      .select("id, email, created_at")
      .eq("role", "superuser")
      .order("created_at", { ascending: false })

    if (superuserError) throw superuserError

    const subToEmailMap = new Map<string, string>()
    subscriptions?.forEach((sub: any) => {
      const email = orgAdminEmailMap.get(sub.organization_id)
      if (email) {
        subToEmailMap.set(sub.id, email)
      }
    })

    const flatOrganizations = (organizations || []).map((org: any) => ({
      ...org,
      plan_name: org.subscriptions?.[0]?.plan_name || "starter",
      subscription_status: org.subscriptions?.[0]?.status || "inactive",
      is_trial: org.subscriptions?.[0]?.is_trial || false,
      is_masteradmin_trial: org.subscriptions?.[0]?.is_masteradmin_trial || false,
      trial_type: org.subscriptions?.[0]?.is_masteradmin_trial
        ? "complimentary"
        : org.subscriptions?.[0]?.is_trial
          ? "paid"
          : null,
      admin_email: orgAdminEmailMap.get(org.organization_id) || "N/A",
    }))

    const flatSubscriptions = (subscriptions || []).map((sub: any) => ({
      ...sub,
      organization_name: sub.organizations?.organization_name || "Unknown",
      user_email: orgAdminEmailMap.get(sub.organization_id) || "N/A",
      payment_source: sub.stripe_subscription_id ? "stripe" : "manual",
      trial_type: sub.is_masteradmin_trial ? "complimentary" : sub.is_trial ? "paid_stripe" : null,
    }))

    const flatPayments = (payments || []).map((payment: any) => {
      // Find subscription for this payment
      const subscription = subscriptions?.find((s: any) => s.id === payment.subscription_id)
      const orgId = subscription?.organization_id

      return {
        ...payment,
        organization_name: orgId ? orgNameMap.get(orgId) : "Unknown",
        user_email: orgId ? orgAdminEmailMap.get(orgId) : "N/A", // Email as identifier
      }
    })

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      organizations: flatOrganizations,
      profiles: profiles || [],
      subscriptions: flatSubscriptions,
      payments: flatPayments,
      feedback: feedback || [],
      superusers: superusers || [], // Include superusers in response
      counts: {
        organizations: flatOrganizations.length,
        profiles: profiles?.length || 0,
        subscriptions: flatSubscriptions.length,
        payments: flatPayments.length,
        feedback: feedback?.length || 0,
        superusers: superusers?.length || 0, // Add superuser count
      },
    })
  } catch (error: any) {
    console.error("[v0] Dashboard Data Error:", error.message)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch dashboard data",
        organizations: [],
        profiles: [],
        subscriptions: [],
        payments: [],
        feedback: [],
        superusers: [], // Ensure superusers array is included in error response
      },
      { status: 500 },
    )
  }
}
