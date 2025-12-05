import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const email = searchParams.get("email") || "arsami.uk@gmail.com"

  const cookieStore = await cookies()
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
      },
    },
  })

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, email, organization_id, role")
    .eq("email", email)
    .single()

  if (profileError || !profile) {
    return NextResponse.json({
      error: "User not found",
      email,
      details: profileError,
    })
  }

  const { data: allSubs, error: subsError } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("organization_id", profile.organization_id)
    .order("created_at", { ascending: false })

  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .select("*")
    .eq("organization_id", profile.organization_id)
    .single()

  let stripeData = null
  if (allSubs && allSubs.length > 0 && allSubs[0].stripe_customer_id) {
    try {
      const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)
      const customer = await stripe.customers.retrieve(allSubs[0].stripe_customer_id)
      const subscriptions = await stripe.subscriptions.list({
        customer: allSubs[0].stripe_customer_id,
        limit: 10,
      })

      stripeData = {
        customer: {
          id: customer.id,
          email: customer.email,
          metadata: customer.metadata,
        },
        subscriptions: subscriptions.data.map((sub: any) => ({
          id: sub.id,
          status: sub.status,
          plan: sub.items.data[0]?.price?.nickname || "Unknown",
          current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          trial_end: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
          metadata: sub.metadata,
        })),
      }
    } catch (err: any) {
      stripeData = { error: err.message }
    }
  }

  return NextResponse.json({
    success: true,
    user: {
      email: profile.email,
      id: profile.id,
      organization_id: profile.organization_id,
      role: profile.role,
    },
    organization: org || { error: orgError },
    subscriptions_in_database: allSubs || [],
    subscriptions_count: allSubs?.length || 0,
    stripe_data: stripeData,
    diagnosis: {
      has_subscriptions: (allSubs?.length || 0) > 0,
      has_multiple_subscriptions: (allSubs?.length || 0) > 1,
      active_subscription: allSubs?.find((sub) => sub.status === "active" || sub.status === "trialing"),
      issue:
        (allSubs?.length || 0) === 0
          ? "NO_SUBSCRIPTION_IN_DB"
          : (allSubs?.length || 0) > 1
            ? "MULTIPLE_SUBSCRIPTIONS"
            : allSubs?.[0]?.plan_name !== "growth-yearly"
              ? "WRONG_PLAN"
              : "OK",
    },
  })
}
