import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { stripe } from "@/lib/stripe"

export async function POST(req: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("organization_id", profile.organization_id)
      .eq("status", "active")
      .single()

    if (!subscription) {
      return NextResponse.json({ error: "No active subscription found" }, { status: 404 })
    }

    console.log("[v0] Cancelling subscription:", subscription.id)

    const stripeSubId = subscription.stripe_subscription_id || subscription.id

    // Cancel the Stripe subscription
    await stripe.subscriptions.update(stripeSubId, {
      cancel_at_period_end: true,
    })

    console.log("[v0] Subscription marked for cancellation at period end in Stripe")

    await supabase
      .from("subscriptions")
      .update({
        cancel_at_period_end: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", subscription.id)

    return NextResponse.json({
      success: true,
      message: "Subscription will be cancelled at the end of the current billing period",
    })
  } catch (error: any) {
    console.error("[v0] Error cancelling subscription:", error)
    return NextResponse.json({ error: error.message || "Failed to cancel subscription" }, { status: 500 })
  }
}
