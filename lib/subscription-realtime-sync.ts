import { createClient } from "@/lib/supabase/client"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

interface SubscriptionData {
  id: string
  organization_id: string
  plan_name: string
  status: string
  stripe_subscription_id: string | null
  stripe_customer_id: string | null
  current_period_start: string
  current_period_end: string
  trial_ends_at: string | null
  is_trial: boolean
  cancel_at_period_end: boolean | null
  created_at: string
  updated_at: string
}

/**
 * Gets the SINGLE active subscription for an organization
 * This is the source of truth for all subscription-related queries
 */
export async function getActiveSubscription(organizationId: string): Promise<SubscriptionData | null> {
  const supabase = createClient()

  console.log(`[v0] [Subscription Sync] Fetching subscription for org: ${organizationId}`)

  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("organization_id", organizationId)
    .in("status", ["active", "trialing"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error(`[v0] [Subscription Sync] Error fetching subscription:`, error)
    return null
  }

  if (!data) {
    console.log(`[v0] [Subscription Sync] No active subscription found for org: ${organizationId}`)
    return null
  }

  console.log(`[v0] [Subscription Sync] Found subscription:`, {
    id: data.id,
    plan: data.plan_name,
    status: data.status,
    stripe_id: data.stripe_subscription_id,
  })

  return data as SubscriptionData
}

/**
 * Server-side version of getActiveSubscription
 */
export async function getActiveSubscriptionServer(organizationId: string): Promise<SubscriptionData | null> {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        },
      },
    },
  )

  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("organization_id", organizationId)
    .in("status", ["active", "trialing"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) {
    return null
  }

  return data as SubscriptionData
}

/**
 * Updates subscription and ensures change is logged
 */
export async function updateSubscription(
  organizationId: string,
  updates: Partial<SubscriptionData>,
  triggeredBy = "system",
) {
  const supabase = createClient()

  console.log(`[v0] [Subscription Sync] Updating subscription for org: ${organizationId}`, updates)

  // Get current subscription
  const current = await getActiveSubscription(organizationId)

  if (!current) {
    console.error(`[v0] [Subscription Sync] Cannot update - no subscription found for org: ${organizationId}`)
    return { success: false, error: "No subscription found" }
  }

  // Update subscription
  const { data, error } = await supabase
    .from("subscriptions")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", current.id)
    .select()
    .single()

  if (error) {
    console.error(`[v0] [Subscription Sync] Error updating subscription:`, error)
    return { success: false, error: error.message }
  }

  // Log the change to activity table
  await supabase.from("subscription_activity_logs").insert({
    subscription_id: current.id,
    organization_id: organizationId,
    stripe_subscription_id: current.stripe_subscription_id,
    event_type: "update",
    from_plan: current.plan_name,
    to_plan: updates.plan_name || current.plan_name,
    from_status: current.status,
    to_status: updates.status || current.status,
    triggered_by: triggeredBy,
    details: {
      updates,
      timestamp: new Date().toISOString(),
    },
  })

  console.log(`[v0] [Subscription Sync] Successfully updated subscription`)

  return { success: true, data }
}

/**
 * Creates or replaces subscription (used by webhooks)
 */
export async function upsertSubscription(subscriptionData: Partial<SubscriptionData>, triggeredBy = "webhook") {
  const supabase = createClient()

  const organizationId = subscriptionData.organization_id!

  console.log(`[v0] [Subscription Sync] Upserting subscription for org: ${organizationId}`)

  // Delete ALL existing subscriptions for this organization first
  await supabase.from("subscriptions").delete().eq("organization_id", organizationId)

  console.log(`[v0] [Subscription Sync] Deleted all existing subscriptions for org: ${organizationId}`)

  // Insert the new subscription
  const { data, error } = await supabase
    .from("subscriptions")
    .insert({
      ...subscriptionData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    console.error(`[v0] [Subscription Sync] Error upserting subscription:`, error)
    return { success: false, error: error.message }
  }

  // Log the creation
  await supabase.from("subscription_activity_logs").insert({
    subscription_id: data.id,
    organization_id: organizationId,
    stripe_subscription_id: subscriptionData.stripe_subscription_id,
    event_type: "created",
    to_plan: subscriptionData.plan_name,
    to_status: subscriptionData.status,
    triggered_by: triggeredBy,
    details: {
      subscription: subscriptionData,
      timestamp: new Date().toISOString(),
    },
  })

  console.log(`[v0] [Subscription Sync] Successfully upserted subscription:`, data.id)

  return { success: true, data }
}

/**
 * Refreshes subscription data from Stripe (if stripe_subscription_id exists)
 */
export async function refreshSubscriptionFromStripe(organizationId: string) {
  const subscription = await getActiveSubscription(organizationId)

  if (!subscription?.stripe_subscription_id) {
    console.log(`[v0] [Subscription Sync] No Stripe subscription to refresh for org: ${organizationId}`)
    return { success: false, error: "No Stripe subscription ID" }
  }

  try {
    // Call internal API to refresh from Stripe
    const response = await fetch("/api/admin/sync-subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizationId }),
    })

    if (!response.ok) {
      throw new Error("Failed to sync from Stripe")
    }

    const result = await response.json()
    return { success: true, data: result }
  } catch (error) {
    console.error(`[v0] [Subscription Sync] Error refreshing from Stripe:`, error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}
