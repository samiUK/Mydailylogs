export async function syncSubscriptionOnLogin(organizationId: string, userEmail: string): Promise<void> {
  console.log(`[v0] [LOGIN-SYNC] Syncing subscription for org ${organizationId}, email ${userEmail}`)

  const { createClient } = await import("@supabase/supabase-js")
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const stripeKey = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY_MYDAYLOGS

  if (!stripeKey) {
    throw new Error("Stripe API key not found")
  }

  const Stripe = (await import("stripe")).default
  const stripe = new Stripe(stripeKey, {
    apiVersion: "2024-11-20.acacia",
  })

  let bindingMethod = "none"
  let activeSubscription: any = null

  // PRIMARY: Search by organization_id in metadata
  console.log(`[v0] [LOGIN-SYNC] Step 1: Searching Stripe by organization_id metadata`)
  const subscriptionsByMetadata = await stripe.subscriptions.list({
    limit: 100,
  })

  for (const sub of subscriptionsByMetadata.data) {
    if (sub.metadata?.organization_id === organizationId && (sub.status === "active" || sub.status === "trialing")) {
      activeSubscription = sub
      bindingMethod = "metadata"
      console.log(`[v0] [LOGIN-SYNC] ✅ Found subscription via METADATA:`, sub.id)
      break
    }
  }

  // FALLBACK: Search by customer email
  if (!activeSubscription) {
    console.log(`[v0] [LOGIN-SYNC] Step 2: Searching Stripe by customer email`)
    const customers = await stripe.customers.list({
      email: userEmail,
      limit: 10,
    })

    if (customers.data.length > 0) {
      for (const customer of customers.data) {
        const subscriptions = await stripe.subscriptions.list({
          customer: customer.id,
          status: "all",
          limit: 10,
        })

        const activeSub = subscriptions.data.find((sub) => sub.status === "active" || sub.status === "trialing")

        if (activeSub) {
          activeSubscription = activeSub
          bindingMethod = "email"
          console.log(`[v0] [LOGIN-SYNC] ✅ Found subscription via EMAIL:`, activeSub.id)
          break
        }
      }
    }
  }

  if (!activeSubscription) {
    console.log(`[v0] [LOGIN-SYNC] No active Stripe subscription found via metadata or email`)
    // Delete any stale subscriptions in DB
    await supabase.from("subscriptions").delete().eq("organization_id", organizationId)
    return
  }

  let planName = "starter"
  const subscriptionType = activeSubscription.metadata?.subscription_type

  if (subscriptionType) {
    planName = subscriptionType.split("-")[0]
  } else {
    const priceId = activeSubscription.items.data[0]?.price.id
    const { STRIPE_PRICES } = await import("./stripe-prices")

    if (priceId === STRIPE_PRICES.growth.monthly.GBP || priceId === STRIPE_PRICES.growth.monthly.USD) {
      planName = "growth"
    } else if (priceId === STRIPE_PRICES.growth.yearly.GBP || priceId === STRIPE_PRICES.growth.yearly.USD) {
      planName = "growth"
    } else if (priceId === STRIPE_PRICES.scale.monthly.GBP || priceId === STRIPE_PRICES.scale.monthly.USD) {
      planName = "scale"
    } else if (priceId === STRIPE_PRICES.scale.yearly.GBP || priceId === STRIPE_PRICES.scale.yearly.USD) {
      planName = "scale"
    }
  }

  if (userEmail === "arsami.uk@gmail.com") {
    console.log(`[v0] [LOGIN-SYNC] ⭐ ARSAMI DUAL-BINDING SYNC ⭐`)
    console.log(`[v0] [LOGIN-SYNC] Email: ${userEmail}`)
    console.log(`[v0] [LOGIN-SYNC] Binding Method: ${bindingMethod.toUpperCase()}`)
    console.log(`[v0] [LOGIN-SYNC] Stripe Subscription: ${activeSubscription.id}`)
    console.log(`[v0] [LOGIN-SYNC] Plan: ${planName}`)
    console.log(`[v0] [LOGIN-SYNC] Status: ${activeSubscription.status}`)
  }

  const { data: existingSubscription } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("organization_id", organizationId)
    .single()

  const subscriptionData = {
    organization_id: organizationId,
    plan_name: planName,
    status: activeSubscription.status,
    stripe_subscription_id: activeSubscription.id,
    stripe_customer_id: activeSubscription.customer as string,
    current_period_start: new Date(activeSubscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(activeSubscription.current_period_end * 1000).toISOString(),
    trial_ends_at: activeSubscription.trial_end ? new Date(activeSubscription.trial_end * 1000).toISOString() : null,
    is_trial: activeSubscription.status === "trialing",
    cancel_at_period_end: activeSubscription.cancel_at_period_end || false,
    updated_at: new Date().toISOString(),
  }

  let syncError = null

  if (existingSubscription) {
    // Update existing subscription
    const { error: updateError } = await supabase
      .from("subscriptions")
      .update(subscriptionData)
      .eq("id", existingSubscription.id)

    syncError = updateError
  } else {
    // Insert new subscription
    const { error: insertError } = await supabase.from("subscriptions").insert({
      ...subscriptionData,
      created_at: new Date().toISOString(),
    })

    syncError = insertError
  }

  if (syncError) {
    console.error(`[v0] [LOGIN-SYNC] Failed to sync subscription:`, syncError)
    throw syncError
  }

  console.log(
    `[v0] [LOGIN-SYNC] ✅ Successfully synced ${planName} subscription via ${bindingMethod.toUpperCase()} binding`,
  )

  const { data: dbSubscription } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("organization_id", organizationId)
    .single()

  // Log activity
  await supabase.from("subscription_activity_logs").insert({
    organization_id: organizationId,
    subscription_id: dbSubscription?.id || null,
    stripe_subscription_id: activeSubscription.id,
    event_type: "login_sync",
    to_plan: planName,
    to_status: activeSubscription.status,
    triggered_by: "system_login",
    details: {
      binding_method: bindingMethod,
      email: userEmail,
      customer_id: activeSubscription.customer,
      synced_at: new Date().toISOString(),
    },
  })
}
