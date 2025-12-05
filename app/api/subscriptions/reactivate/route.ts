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
      .single()

    if (!subscription) {
      return NextResponse.json({ error: "No subscription found" }, { status: 404 })
    }

    const stripeSubId = subscription.stripe_subscription_id

    if (!stripeSubId) {
      return NextResponse.json({ error: "No Stripe subscription found" }, { status: 404 })
    }

    console.log("[v0] Reactivating subscription:", subscription.id)

    // Reactivate the subscription
    await stripe.subscriptions.update(stripeSubId, {
      cancel_at_period_end: false,
    })

    await supabase
      .from("subscriptions")
      .update({
        cancel_at_period_end: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", subscription.id)

    return NextResponse.json({
      success: true,
      message: "Subscription reactivated successfully. You'll continue to have full access.",
    })
  } catch (error: any) {
    console.error("[v0] Error reactivating subscription:", error)
    return NextResponse.json({ error: error.message || "Failed to reactivate subscription" }, { status: 500 })
  }
}
