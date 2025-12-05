export async function syncSubscriptionOnLogin(organizationId: string, userEmail: string): Promise<void> {
  console.log(`[v0] [LOGIN-SYNC] Syncing subscription for org ${organizationId}, email ${userEmail}`)

  const { createClient } = await import("@supabase/supabase-js")
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const Stripe = (await import("stripe")).default
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2024-11-20.acacia",
  })

  // Search for customer by email
  const customers = await stripe.customers.list({
    email: userEmail,
    limit: 1,
  })

  if (customers.data.length === 0) {
    console.log(`[v0] [LOGIN-SYNC] No Stripe customer found for ${userEmail}`)
    return
  }

  const customer = customers.data[0]
  console.log(`[v0] [LOGIN-SYNC] Found Stripe customer: ${customer.id}`)

  // Get active subscriptions from Stripe
  const subscriptions = await stripe.subscriptions.list({
    customer: customer.id,
    status: "all",
    limit: 10,
  })

  console.log(`[v0] [LOGIN-SYNC] Found ${subscriptions.data.length} Stripe subscriptions`)

  // Find active or trialing subscription
  const activeSubscription = subscriptions.data.find((sub) => sub.status === "active" || sub.status === "trialing")

  if (!activeSubscription) {
    console.log(`[v0] [LOGIN-SYNC] No active Stripe subscription found`)
    // Delete any stale subscriptions in DB
    await supabase.from("subscriptions").delete().eq("organization_id", organizationId)
    return
  }

  console.log(`[v0] [LOGIN-SYNC] Found active Stripe subscription: ${activeSubscription.id}`)

  // Extract plan from price ID
  const priceId = activeSubscription.items.data[0]?.price.id
  let planName = "starter"
  let billingPeriod = "monthly"

  const { STRIPE_PRICES } = await import("./stripe-prices")

  if (priceId === STRIPE_PRICES.growth.monthly.GBP || priceId === STRIPE_PRICES.growth.monthly.USD) {
    planName = "growth"
    billingPeriod = "monthly"
  } else if (priceId === STRIPE_PRICES.growth.yearly.GBP || priceId === STRIPE_PRICES.growth.yearly.USD) {
    planName = "growth"
    billingPeriod = "yearly"
  } else if (priceId === STRIPE_PRICES.scale.monthly.GBP || priceId === STRIPE_PRICES.scale.monthly.USD) {
    planName = "scale"
    billingPeriod = "monthly"
  } else if (priceId === STRIPE_PRICES.scale.yearly.GBP || priceId === STRIPE_PRICES.scale.yearly.USD) {
    planName = "scale"
    billingPeriod = "yearly"
  }

  console.log(`[v0] [LOGIN-SYNC] Detected plan from price ID ${priceId}: ${planName} (${billingPeriod})`)

  if (userEmail === "arsami.uk@gmail.com") {
    console.log(`[v0] [LOGIN-SYNC] ⭐ ARSAMI SUBSCRIPTION CHECK ⭐`)
    console.log(`[v0] [LOGIN-SYNC] Stripe Subscription ID: ${activeSubscription.id}`)
    console.log(`[v0] [LOGIN-SYNC] Price ID: ${priceId}`)
    console.log(`[v0] [LOGIN-SYNC] Plan: ${planName}`)
    console.log(`[v0] [LOGIN-SYNC] Billing Period: ${billingPeriod}`)
    console.log(`[v0] [LOGIN-SYNC] Status: ${activeSubscription.status}`)
  }

  await supabase.from("subscriptions").delete().eq("organization_id", organizationId)

  const { error: insertError } = await supabase.from("subscriptions").insert({
    organization_id: organizationId,
    plan_name: planName,
    status: activeSubscription.status,
    stripe_subscription_id: activeSubscription.id,
    stripe_customer_id: customer.id,
    stripe_price_id: priceId,
    current_period_start: new Date(activeSubscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(activeSubscription.current_period_end * 1000).toISOString(),
    trial_end: activeSubscription.trial_end ? new Date(activeSubscription.trial_end * 1000).toISOString() : null,
  })

  if (insertError) {
    console.error(`[v0] [LOGIN-SYNC] Failed to sync subscription:`, insertError)
    throw insertError
  }

  console.log(`[v0] [LOGIN-SYNC] ✅ Successfully synced ${planName} (${billingPeriod}) subscription`)

  await supabase.from("subscription_activity_logs").insert({
    organization_id: organizationId,
    action: "sync",
    details: `Subscription synced from Stripe on login: ${planName} (${billingPeriod})`,
    triggered_by: "system_login",
  })
}
