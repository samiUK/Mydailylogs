import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { stripe } from "@/lib/stripe"
import { sendEmail, emailTemplates } from "@/lib/email/smtp"

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
      .in("status", ["active", "trialing"])
      .single()

    if (!subscription) {
      return NextResponse.json({ error: "No active subscription found" }, { status: 404 })
    }

    const stripeSubId = subscription.stripe_subscription_id || subscription.id

    console.log("[v0] Marking subscription for cancellation at period end:", subscription.id)

    // Mark for cancellation at period end (works for both trialing and active)
    await stripe.subscriptions.update(stripeSubId, {
      cancel_at_period_end: true,
    })

    await supabase
      .from("subscriptions")
      .update({
        cancel_at_period_end: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", subscription.id)

    const isTrialing = subscription.status === "trialing"
    const periodEndDate = subscription.current_period_end
      ? new Date(subscription.current_period_end).toLocaleDateString()
      : "the end of your billing period"

    try {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", user.id)
        .single()

      if (profileData?.email) {
        const template = emailTemplates.subscriptionCancelled({
          customerName: profileData.full_name || "Customer",
          planName: subscription.plan_name.includes("growth") ? "Growth" : "Scale",
          accessUntilDate: subscription.current_period_end,
          isTrialing: subscription.status === "trialing",
          downgradeWarning: subscription.status !== "trialing",
          billingUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/admin/billing`, // Updated billing URL
        })

        await sendEmail(profileData.email, template)
        console.log("[v0] Cancellation confirmation email sent to:", profileData.email)
      }
    } catch (emailError) {
      console.error("[v0] Failed to send cancellation email:", emailError)
    }

    const responseMessage = isTrialing
      ? `Subscription cancelled successfully. Your trial continues with full access until ${periodEndDate} - no charges will be made.`
      : `Subscription will be cancelled on ${periodEndDate}. You'll continue to have full access until then, then be downgraded to Starter plan. We'll send you a reminder email 3 days before your subscription ends.`

    return NextResponse.json({
      success: true,
      message: responseMessage,
    })
  } catch (error: any) {
    console.error("[v0] Error cancelling subscription:", error)
    return NextResponse.json({ error: error.message || "Failed to cancel subscription" }, { status: 500 })
  }
}
