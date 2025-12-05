import { NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@supabase/supabase-js"

export async function POST(request: Request) {
  try {
    const { organizationId, userEmail } = await request.json()

    if (!organizationId || !userEmail) {
      return NextResponse.json({ error: "Organization ID and user email are required" }, { status: 400 })
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY_MYDAYLOGS || process.env.STRIPE_SECRET_KEY

    if (!stripeKey) {
      console.error("[v0] No Stripe API key found in environment variables")
      return NextResponse.json({ error: "Stripe API key not configured" }, { status: 500 })
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2024-11-20.acacia",
    })

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    console.log("[v0] Force syncing subscription for:", { organizationId, userEmail })

    let matchingSubscription: Stripe.Subscription | null = null
    let bindingMethod = "none"

    // PRIMARY: Search by organization_id in metadata
    console.log("[v0] Step 1: Searching by organization_id in metadata")
    const allSubscriptions = await stripe.subscriptions.list({
      limit: 100,
    })

    for (const sub of allSubscriptions.data) {
      if (sub.metadata?.organization_id === organizationId && (sub.status === "active" || sub.status === "trialing")) {
        matchingSubscription = sub
        bindingMethod = "metadata"
        console.log("[v0] ✅ Found subscription via METADATA:", sub.id)
        break
      }
    }

    // FALLBACK: Search by customer email
    if (!matchingSubscription) {
      console.log("[v0] Step 2: Searching by customer email")
      const customers = await stripe.customers.list({
        email: userEmail,
        limit: 10,
      })

      console.log("[v0] Found Stripe customers with email:", customers.data.length)

      if (customers.data.length > 0) {
        for (const customer of customers.data) {
          const subscriptions = await stripe.subscriptions.list({
            customer: customer.id,
            limit: 10,
          })

          console.log("[v0] Customer", customer.id, "has subscriptions:", subscriptions.data.length)

          const activeSub = subscriptions.data.find((sub) => sub.status === "active" || sub.status === "trialing")

          if (activeSub) {
            matchingSubscription = activeSub
            bindingMethod = "email"
            console.log("[v0] ✅ Found subscription via EMAIL:", activeSub.id)
            break
          }
        }
      }
    }

    if (!matchingSubscription) {
      return NextResponse.json(
        {
          error: "No active Stripe subscription found via metadata or email",
          debug: { organizationId, userEmail, bindingAttempted: ["metadata", "email"] },
        },
        { status: 404 },
      )
    }

    let planName = "starter"
    const subscriptionType = matchingSubscription.metadata?.subscription_type || ""

    if (subscriptionType) {
      planName = subscriptionType.split("-")[0]
    } else {
      const priceId = matchingSubscription.items.data[0]?.price?.id || ""
      if (priceId.includes("growth") || priceId.includes("Growth")) {
        planName = "growth"
      } else if (priceId.includes("scale") || priceId.includes("Scale")) {
        planName = "scale"
      }
    }

    console.log("[v0] Determined plan:", planName, "via binding method:", bindingMethod)

    // Delete all existing subscriptions for this organization
    await supabase.from("subscriptions").delete().eq("organization_id", organizationId)

    // Create new subscription record
    const { data: newSub, error: insertError } = await supabase
      .from("subscriptions")
      .insert({
        organization_id: organizationId,
        stripe_subscription_id: matchingSubscription.id,
        stripe_customer_id: matchingSubscription.customer as string,
        plan_name: planName,
        status: matchingSubscription.status,
        current_period_start: new Date(matchingSubscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(matchingSubscription.current_period_end * 1000).toISOString(),
        trial_ends_at: matchingSubscription.trial_end
          ? new Date(matchingSubscription.trial_end * 1000).toISOString()
          : null,
        is_trial: matchingSubscription.status === "trialing",
        cancel_at_period_end: matchingSubscription.cancel_at_period_end || false,
      })
      .select()
      .single()

    if (insertError) {
      console.error("[v0] Error creating subscription:", insertError)
      return NextResponse.json({ error: "Failed to create subscription record", details: insertError }, { status: 500 })
    }

    console.log("[v0] ✅ Successfully force-synced via", bindingMethod.toUpperCase(), "->", planName)

    // Log to activity
    await supabase.from("subscription_activity_logs").insert({
      organization_id: organizationId,
      subscription_id: newSub.id,
      event_type: "manual_sync",
      from_plan: "starter",
      to_plan: planName,
      from_status: "active",
      to_status: matchingSubscription.status,
      triggered_by: "admin_force_sync",
      admin_email: userEmail,
      stripe_subscription_id: matchingSubscription.id,
      details: {
        reason: "Manual force sync from master dashboard",
        binding_method: bindingMethod,
        stripe_data: {
          subscription_id: matchingSubscription.id,
          customer_id: matchingSubscription.customer,
          status: matchingSubscription.status,
        },
      },
    })

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${planName} subscription from Stripe using ${bindingMethod} binding`,
      subscription: newSub,
      bindingMethod,
    })
  } catch (error: any) {
    console.error("[v0] Force sync error:", error)
    return NextResponse.json({ error: error.message || "Failed to sync subscription" }, { status: 500 })
  }
}
