import { createClient } from "@/lib/supabase/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia",
})

export async function syncSubscriptionFromStripe(organizationId: string): Promise<{
  success: boolean
  subscription?: any
  error?: string
}> {
  try {
    console.log("[v0] Syncing subscription from Stripe for organization:", organizationId)

    const supabase = await createClient()

    const { data: existingSubs } = await supabase
      .from("subscriptions")
      .select("stripe_subscription_id, stripe_customer_id, id")
      .eq("organization_id", organizationId)

    if (!existingSubs || existingSubs.length === 0) {
      console.log("[v0] No subscriptions found for organization")
      return { success: true, subscription: null }
    }

    const stripeSubscription = existingSubs.find((sub) => sub.stripe_subscription_id)

    if (!stripeSubscription?.stripe_subscription_id) {
      console.log("[v0] No Stripe subscription found, keeping master admin trial")
      return { success: true, subscription: null }
    }

    const subscription = await stripe.subscriptions.retrieve(stripeSubscription.stripe_subscription_id)

    console.log("[v0] Retrieved subscription from Stripe:", {
      id: subscription.id,
      status: subscription.status,
      plan: subscription.items.data[0]?.price?.id,
      trial_end: subscription.trial_end,
    })

    if (existingSubs.length > 1) {
      console.log(`[v0] Found ${existingSubs.length} subscriptions, removing duplicates`)

      const duplicateIds = existingSubs.filter((sub) => sub.id !== stripeSubscription.id).map((sub) => sub.id)

      if (duplicateIds.length > 0) {
        await supabase.from("subscriptions").delete().in("id", duplicateIds)

        console.log(`[v0] Deleted ${duplicateIds.length} duplicate subscriptions`)
      }
    }

    const priceId = subscription.items.data[0]?.price?.id
    let planName = "starter"

    // Map Stripe price ID to plan name
    const priceToPlansMap: Record<string, string> = {
      // Growth plans
      [process.env.STRIPE_PRICE_GROWTH_MONTHLY_GBP!]: "growth-monthly",
      [process.env.STRIPE_PRICE_GROWTH_YEARLY_GBP!]: "growth-yearly",
      [process.env.STRIPE_PRICE_GROWTH_MONTHLY_USD!]: "growth-monthly",
      [process.env.STRIPE_PRICE_GROWTH_YEARLY_USD!]: "growth-yearly",
      // Scale plans
      [process.env.STRIPE_PRICE_SCALE_MONTHLY_GBP!]: "scale-monthly",
      [process.env.STRIPE_PRICE_SCALE_YEARLY_GBP!]: "scale-yearly",
      [process.env.STRIPE_PRICE_SCALE_MONTHLY_USD!]: "scale-monthly",
      [process.env.STRIPE_PRICE_SCALE_YEARLY_USD!]: "scale-yearly",
    }

    if (priceId && priceToPlansMap[priceId]) {
      planName = priceToPlansMap[priceId]
    }

    const isTrial = subscription.trial_end ? subscription.trial_end > Math.floor(Date.now() / 1000) : false

    const { error: updateError } = await supabase
      .from("subscriptions")
      .update({
        status: subscription.status,
        plan_name: planName,
        is_trial: isTrial,
        trial_ends_at: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end || false,
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_subscription_id", subscription.id)

    if (updateError) {
      console.error("[v0] Error updating subscription:", updateError)
      return { success: false, error: updateError.message }
    }

    console.log("[v0] Successfully synced subscription:", {
      planName,
      status: subscription.status,
      isTrial,
    })

    return { success: true, subscription: { plan_name: planName, status: subscription.status } }
  } catch (error: any) {
    console.error("[v0] Error syncing subscription from Stripe:", error)
    return { success: false, error: error.message }
  }
}

export async function deduplicateSubscriptions(organizationId: string): Promise<void> {
  try {
    const supabase = await createClient()

    const { data: subs } = await supabase
      .from("subscriptions")
      .select("id, stripe_subscription_id, status, created_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })

    if (!subs || subs.length <= 1) {
      return // No duplicates
    }

    console.log(`[v0] Found ${subs.length} subscriptions for organization ${organizationId}, deduplicating...`)

    const stripeSubscription =
      subs.find((sub) => sub.stripe_subscription_id && sub.status === "active") ||
      subs.find((sub) => sub.stripe_subscription_id && sub.status === "trialing") ||
      subs.find((sub) => sub.stripe_subscription_id)

    const subscriptionToKeep = stripeSubscription || subs[0]

    const duplicateIds = subs.filter((sub) => sub.id !== subscriptionToKeep.id).map((sub) => sub.id)

    if (duplicateIds.length > 0) {
      await supabase.from("subscriptions").delete().in("id", duplicateIds)

      console.log(`[v0] Deleted ${duplicateIds.length} duplicate subscriptions, kept:`, subscriptionToKeep.id)
    }
  } catch (error) {
    console.error("[v0] Error deduplicating subscriptions:", error)
  }
}
