import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { cookies } from "next/headers"
import { stripe } from "@/lib/stripe"

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const masterAdminImpersonation = cookieStore.get("masterAdminImpersonation")?.value
    const masterAdminEmail = cookieStore.get("masterAdminEmail")?.value

    console.log("[v0] Master admin auth check:", {
      masterAdminImpersonation,
      masterAdminEmail,
      isValidImpersonation: masterAdminImpersonation === "true",
      isValidEmail: masterAdminEmail === "arsami.uk@gmail.com",
    })

    if (masterAdminImpersonation !== "true" || masterAdminEmail !== "arsami.uk@gmail.com") {
      console.log("[v0] Master admin check failed:", { masterAdminImpersonation, masterAdminEmail })
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] Master admin authorized:", masterAdminEmail)

    const body = await request.json()
    const { action, organizationId, planName, organizationName } = body

    console.log("[v0] Subscription action:", { action, organizationId, planName })

    const supabase = createAdminClient()

    if (action === "upgrade") {
      // Calculate trial end date (30 days from now)
      const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

      // Check if subscription exists
      const { data: existingSub } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("organization_id", organizationId)
        .maybeSingle()

      console.log("[v0] Existing subscription:", existingSub)

      if (existingSub) {
        // Update existing subscription
        const { error } = await supabase
          .from("subscriptions")
          .update({
            plan_name: planName.toLowerCase(),
            status: "active",
            is_trial: true,
            is_masteradmin_trial: true,
            trial_ends_at: trialEndsAt.toISOString(),
            current_period_start: new Date().toISOString(),
            current_period_end: trialEndsAt.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingSub.id)

        if (error) {
          console.error("[v0] Subscription update error:", error)
          throw error
        }
      } else {
        // Create new subscription without trial columns (they don't exist yet)
        const { error } = await supabase.from("subscriptions").insert({
          organization_id: organizationId,
          plan_name: planName.toLowerCase(),
          status: "active",
          is_trial: true,
          is_masteradmin_trial: true,
          trial_ends_at: trialEndsAt.toISOString(),
          current_period_start: new Date().toISOString(),
          current_period_end: trialEndsAt.toISOString(),
        })

        if (error) {
          console.error("[v0] Subscription insert error:", error)
          throw error
        }
      }

      console.log("[v0] Masteradmin test trial created successfully")

      return NextResponse.json({
        success: true,
        message: `30-day ${planName} TEST TRIAL started for ${organizationName} (will auto-downgrade to Starter)`,
      })
    } else if (action === "cancel") {
      const { subscriptionId } = body

      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("status, current_period_end")
        .or(`stripe_subscription_id.eq.${subscriptionId},id.eq.${subscriptionId}`)
        .single()

      if (!subscription) {
        return NextResponse.json({ error: "Subscription not found" }, { status: 404 })
      }

      try {
        console.log("[v0] Marking subscription for cancellation at period end:", subscriptionId)

        await stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true,
        })

        await supabase
          .from("subscriptions")
          .update({
            cancel_at_period_end: true,
            updated_at: new Date().toISOString(),
          })
          .or(`stripe_subscription_id.eq.${subscriptionId},id.eq.${subscriptionId}`)

        const periodEndDate = subscription.current_period_end
          ? new Date(subscription.current_period_end).toLocaleDateString()
          : "end of period"

        return NextResponse.json({
          success: true,
          message: `Subscription will be cancelled on ${periodEndDate}. Full access continues until then.`,
        })
      } catch (stripeError: any) {
        console.error("[v0] Stripe cancellation failed:", stripeError)
        return NextResponse.json({ error: stripeError.message }, { status: 500 })
      }
    } else if (action === "downgrade") {
      const { subscriptionId } = body

      try {
        await stripe.subscriptions.cancel(subscriptionId)
        console.log("[v0] Stripe subscription cancelled immediately:", subscriptionId)
      } catch (stripeError: any) {
        console.error("[v0] Stripe immediate cancellation failed:", stripeError)
      }

      const { error } = await supabase
        .from("subscriptions")
        .update({
          plan_name: "starter",
          status: "inactive",
          cancel_at_period_end: false,
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_subscription_id", subscriptionId)
        .or(`id.eq.${subscriptionId}`)

      if (error) throw error

      return NextResponse.json({
        success: true,
        message: `Downgraded to Starter plan`,
      })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error: any) {
    console.error("[v0] Subscription management error:", error)
    return NextResponse.json({ error: error.message || "Failed to manage subscription" }, { status: 500 })
  }
}
