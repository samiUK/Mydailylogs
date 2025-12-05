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

    const [{ data: profiles, error: profileError }, { data: templates }, { data: assignments }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, email, full_name, role, organization_id, created_at")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase.from("checklist_templates").select("*", { count: "exact", head: true }),
      supabase.from("template_assignments").select("*", { count: "exact", head: true }),
    ])

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
        custom_template_limit,
        custom_team_limit,
        custom_manager_limit,
        custom_monthly_submissions,
        subscriptions(plan_name, status, is_masteradmin_trial, is_trial)
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
        cancel_at_period_end,
        created_at,
        organizations(organization_name)
      `,
      )
      .order("created_at", { ascending: false })
      .limit(100)

    if (subError) throw subError

    const arsamiSubscription = subscriptions?.find((s) => {
      const email = orgAdminEmailMap.get(s.organization_id)
      return email === "arsami.uk@gmail.com"
    })

    if (arsamiSubscription) {
      console.log("[v0] arsami.uk@gmail.com subscription found:", {
        id: arsamiSubscription.id,
        plan_name: arsamiSubscription.plan_name,
        status: arsamiSubscription.status,
        stripe_subscription_id: arsamiSubscription.stripe_subscription_id,
        organization_id: arsamiSubscription.organization_id,
      })
    }

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

    const [{ data: superusersTable }, { data: superuserProfiles }] = await Promise.all([
      supabase
        .from("superusers")
        .select("id, email, created_at")
        .eq("is_active", true)
        .order("created_at", { ascending: false }),
      supabase
        .from("profiles")
        .select("id, email, full_name, created_at")
        .eq("role", "superuser")
        .order("created_at", { ascending: false }),
    ])

    // Combine both sources, with profiles taking precedence for full_name
    const superusersMap = new Map()

    // Add from superusers table
    superusersTable?.forEach((su) => {
      superusersMap.set(su.email, {
        id: su.id,
        email: su.email,
        created_at: su.created_at,
        full_name: null,
      })
    })

    // Add/update from profiles (includes full_name)
    superuserProfiles?.forEach((profile) => {
      superusersMap.set(profile.email, {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        created_at: profile.created_at,
      })
    })

    const superusers = Array.from(superusersMap.values())

    console.log(
      "[v0] Superusers found:",
      superusers.length,
      superusers.map((s) => s.email),
    )

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

    const stripeCustomersWithoutPayments = flatSubscriptions
      .filter((sub) => {
        // Include subscriptions with Stripe ID (actual Stripe customers)
        if (!sub.stripe_subscription_id) return false

        // Check if they already have a payment record
        const hasPayment = payments?.some((p: any) => p.subscription_id === sub.id)
        return !hasPayment
      })
      .map((sub) => ({
        id: `pending-${sub.id}`,
        subscription_id: sub.id,
        amount: 0, // No payment yet
        status: sub.status === "trialing" ? "upcoming" : "pending",
        created_at: sub.trial_ends_at || sub.current_period_end || sub.created_at,
        transaction_id: `stripe-${sub.stripe_subscription_id}`,
        currency: "gbp",
        organization_name: sub.organization_name,
        user_email: sub.user_email,
        // Additional fields for trial customers
        is_trial_customer: true,
        trial_ends_at: sub.trial_ends_at,
        next_payment_date: sub.trial_ends_at || sub.current_period_end,
        subscription_plan: sub.plan_name,
      }))

    // Combine actual payments and upcoming trial conversions
    const allPaymentsAndUpcoming = [...flatPayments, ...stripeCustomersWithoutPayments]

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const newSignupsThisMonth = profiles?.filter((p) => new Date(p.created_at) >= startOfMonth).length || 0

    // Get all subscriptions that started as trials (both Stripe trials and master admin trials)
    const allTrialSubscriptions = flatSubscriptions.filter(
      (s) => s.is_trial || s.is_masteradmin_trial || s.stripe_subscription_id,
    )

    // Get paid subscriptions (not currently on trial, have Stripe ID, and active)
    const convertedToPaid = flatSubscriptions.filter(
      (s) => s.status === "active" && s.stripe_subscription_id && !s.is_trial,
    ).length

    // Calculate conversion rate: converted subscriptions / total trials started
    const totalTrialsStarted = allTrialSubscriptions.length
    const conversionRate = totalTrialsStarted > 0 ? Math.round((convertedToPaid / totalTrialsStarted) * 100) : 0

    const stats = {
      totalOrgs: flatOrganizations.length,
      totalUsers: profiles?.length || 0,
      newSignupsThisMonth,
      conversionRate,
      totalTemplates: templates?.count || 0,
      totalChecklists: assignments?.count || 0,
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      organizations: flatOrganizations,
      profiles: profiles || [],
      subscriptions: flatSubscriptions,
      payments: allPaymentsAndUpcoming, // Include trial customers
      feedback: feedback || [],
      superusers: superusers || [], // Return superusers with full_name included
      stats,
      checklistsData: {},
      counts: {
        organizations: flatOrganizations.length,
        profiles: profiles?.length || 0,
        subscriptions: flatSubscriptions.length,
        payments: allPaymentsAndUpcoming.length, // Updated count
        feedback: feedback?.length || 0,
        superusers: superusers?.length || 0,
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
        superusers: [],
        stats: {},
        checklistsData: {},
      },
      { status: 500 },
    )
  }
}
