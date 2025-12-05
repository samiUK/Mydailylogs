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
    const isTrialing = subscription.status === "trialing"

    if (isTrialing) {
      console.log("[v0] Immediately cancelling trial subscription:", subscription.id)

      // Immediately cancel the Stripe subscription for trial users
      await stripe.subscriptions.cancel(stripeSubId)

      // Update database to reflect immediate cancellation
      await supabase
        .from("subscriptions")
        .update({
          status: "cancelled",
          cancel_at_period_end: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", subscription.id)
    } else {
      console.log("[v0] Scheduling cancellation at period end for paid subscription:", subscription.id)

      // Schedule cancellation at period end for paid users
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
    }

    try {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", user.id)
        .single()

      if (profileData?.email) {
        const periodEndDate = subscription.current_period_end
          ? new Date(subscription.current_period_end).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })
          : "the end of your billing period"

        const template = emailTemplates.subscriptionCancelled({
          customerName: profileData.full_name || "Customer",
          planName: subscription.plan_name.includes("growth") ? "Growth" : "Scale",
          accessUntilDate: subscription.current_period_end,
          isTrialing: isTrialing,
          downgradeWarning: !isTrialing,
          billingUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/admin/billing`,
        })

        await sendEmail(profileData.email, template)
        console.log("[v0] Cancellation confirmation email sent to:", profileData.email)
      }
    } catch (emailError) {
      console.error("[v0] Failed to send cancellation email:", emailError)
    }

    const responseMessage = isTrialing
      ? "Subscription cancelled successfully. You have been immediately downgraded to the free Starter plan. You can upgrade again anytime from the billing page."
      : `Subscription will be cancelled on ${
          subscription.current_period_end
            ? new Date(subscription.current_period_end).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })
            : "the end of your billing period"
        }. You'll continue to have full access until then. You can reactivate anytime before this date.`

    return NextResponse.json({
      success: true,
      message: responseMessage,
      immediate: isTrialing,
    })
  } catch (error: any) {
    console.error("[v0] Error cancelling subscription:", error)
    return NextResponse.json({ error: error.message || "Failed to cancel subscription" }, { status: 500 })
  }
}
