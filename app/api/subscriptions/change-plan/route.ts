import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { stripe } from "@/lib/stripe"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { getStripePriceId } from "@/lib/stripe-prices"

const supabaseAdmin = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("profiles").select("organization_id, role").eq("id", user.id).single()

    if (!profile?.organization_id || (profile.role !== "admin" && profile.role !== "manager")) {
      return NextResponse.json({ error: "Only admins and managers can change plans" }, { status: 403 })
    }

    const { newPlan } = await req.json()

    if (!newPlan || typeof newPlan !== "string") {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 })
    }

    const { data: subscription } = await supabaseAdmin
      .from("subscriptions")
      .select("*")
      .eq("organization_id", profile.organization_id)
      .eq("status", "active")
      .single()

    if (!subscription || !subscription.stripe_subscription_id) {
      return NextResponse.json({ error: "No active subscription found" }, { status: 404 })
    }

    const currentPlanType = subscription.plan_name.split("-")[0]
    const newPlanType = newPlan.split("-")[0]
    const billingPeriod = newPlan.includes("yearly") ? "yearly" : "monthly"

    if (currentPlanType === newPlanType) {
      return NextResponse.json({ error: "Already on this plan" }, { status: 400 })
    }

    // Get currency from organization or default to GBP
    const { data: org } = await supabaseAdmin
      .from("organizations")
      .select("currency")
      .eq("organization_id", profile.organization_id)
      .single()

    const currency = (org?.currency as "GBP" | "USD") || "GBP"

    // Get the Stripe price ID for the new plan
    const priceId = getStripePriceId(newPlanType as "growth" | "scale", billingPeriod, currency)

    if (!priceId) {
      return NextResponse.json({ error: "Invalid price configuration" }, { status: 400 })
    }

    // Get the current subscription from Stripe
    const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id)

    const isUpgrade = currentPlanType === "growth" && newPlanType === "scale"

    // Update the subscription in Stripe
    const updatedSubscription = await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      items: [
        {
          id: stripeSubscription.items.data[0].id,
          price: priceId,
        },
      ],
      proration_behavior: isUpgrade ? "always_invoice" : "create_prorations",
      metadata: {
        organization_id: profile.organization_id,
        plan_name: newPlan,
      },
    })

    // Update the subscription in our database
    await supabaseAdmin
      .from("subscriptions")
      .update({
        plan_name: newPlan,
        updated_at: new Date().toISOString(),
      })
      .eq("id", subscription.id)

    return NextResponse.json({
      success: true,
      message: isUpgrade ? "Plan upgraded successfully" : "Plan downgrade scheduled",
      subscription: updatedSubscription,
    })
  } catch (error) {
    console.error("Error changing plan:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to change plan" },
      { status: 500 },
    )
  }
}
