import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import Stripe from "stripe"
import { upsertSubscription } from "@/lib/subscription-realtime-sync"

export async function POST(request: Request) {
  try {
    const { organizationId } = await request.json()

    if (!organizationId) {
      return NextResponse.json({ error: "Organization ID required" }, { status: 400 })
    }

    console.log(`[v0] [Sync API] Syncing subscription for org: ${organizationId}`)

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY_MYDAYLOGS!, {
      apiVersion: "2024-11-20.acacia",
    })

    const supabase = await createClient()

    // Get current subscription
    const { data: currentSub } = await supabase
      .from("subscriptions")
      .select("stripe_subscription_id")
      .eq("organization_id", organizationId)
      .in("status", ["active", "trialing"])
      .maybeSingle()

    if (!currentSub?.stripe_subscription_id) {
      return NextResponse.json({ error: "No Stripe subscription found" }, { status: 404 })
    }

    // Fetch from Stripe
    const stripeSubscription = await stripe.subscriptions.retrieve(currentSub.stripe_subscription_id)

    // Extract plan name from metadata or price
    const subscriptionType = stripeSubscription.metadata?.subscription_type || "starter"
    const planName = subscriptionType.split("-")[0] // "growth-yearly" -> "growth"

    console.log(`[v0] [Sync API] Fetched from Stripe:`, {
      id: stripeSubscription.id,
      status: stripeSubscription.status,
      plan: planName,
    })

    // Upsert subscription
    const result = await upsertSubscription(
      {
        organization_id: organizationId,
        stripe_subscription_id: stripeSubscription.id,
        stripe_customer_id: stripeSubscription.customer as string,
        plan_name: planName,
        status: stripeSubscription.status,
        current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
        trial_ends_at: stripeSubscription.trial_end
          ? new Date(stripeSubscription.trial_end * 1000).toISOString()
          : null,
        is_trial: stripeSubscription.status === "trialing",
        cancel_at_period_end: stripeSubscription.cancel_at_period_end,
      },
      "manual_sync",
    )

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ success: true, subscription: result.data })
  } catch (error) {
    console.error("[v0] [Sync API] Error:", error)
    return NextResponse.json({ error: "Failed to sync subscription" }, { status: 500 })
  }
}
