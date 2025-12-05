import { createClient } from "@supabase/supabase-js"
import Stripe from "stripe"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const email = searchParams.get("email")

  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  // Get all subscriptions from database
  const { data: dbSubscriptions, error: dbError } = await supabaseAdmin
    .from("subscriptions")
    .select("*")
    .order("created_at", { ascending: false })

  // Get all organizations
  const { data: organizations } = await supabaseAdmin.from("organizations").select("organization_id, organization_name")

  // Get profiles
  let profiles = []
  if (email) {
    const { data } = await supabaseAdmin.from("profiles").select("*").eq("email", email)
    profiles = data || []
  } else {
    const { data } = await supabaseAdmin.from("profiles").select("*")
    profiles = data || []
  }

  // Initialize Stripe
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2024-11-20.acacia",
  })

  // Get all Stripe subscriptions
  const stripeSubscriptions = await stripe.subscriptions.list({
    limit: 100,
    expand: ["data.customer"],
  })

  // Analyze paid customers
  const paidCustomers = []
  const missingInDB = []
  const missingInStripe = []

  for (const stripeSub of stripeSubscriptions.data) {
    const customer = stripeSub.customer as Stripe.Customer
    const metadata = stripeSub.metadata || {}
    const organizationId = metadata.organization_id

    // Find in database
    const dbSub = dbSubscriptions?.find((s) => s.stripe_subscription_id === stripeSub.id)

    const org = organizations?.find((o) => o.organization_id === organizationId)
    const profile = profiles.find((p) => p.organization_id === organizationId)

    const customerInfo = {
      stripe_subscription_id: stripeSub.id,
      stripe_customer_id: stripeSub.customer,
      customer_email: customer.email,
      organization_id: organizationId,
      organization_name: org?.organization_name || "Unknown",
      stripe_status: stripeSub.status,
      stripe_plan: stripeSub.items.data[0]?.price.id,
      stripe_amount: stripeSub.items.data[0]?.price.unit_amount,
      stripe_currency: stripeSub.items.data[0]?.price.currency,
      current_period_end: new Date(stripeSub.current_period_end * 1000).toISOString(),
      trial_end: stripeSub.trial_end ? new Date(stripeSub.trial_end * 1000).toISOString() : null,
      db_exists: !!dbSub,
      db_plan_name: dbSub?.plan_name || "NOT IN DB",
      db_status: dbSub?.status || "NOT IN DB",
      profile_email: profile?.email || "No profile found",
      sync_status: dbSub
        ? dbSub.plan_name === metadata.subscription_type?.split("-")[0]
          ? "SYNCED"
          : "MISMATCH"
        : "MISSING",
    }

    paidCustomers.push(customerInfo)

    if (!dbSub) {
      missingInDB.push(customerInfo)
    }
  }

  // Check for orphaned DB subscriptions
  for (const dbSub of dbSubscriptions || []) {
    if (dbSub.stripe_subscription_id) {
      const stripeExists = stripeSubscriptions.data.find((s) => s.id === dbSub.stripe_subscription_id)
      if (!stripeExists) {
        missingInStripe.push({
          db_subscription_id: dbSub.id,
          stripe_subscription_id: dbSub.stripe_subscription_id,
          organization_id: dbSub.organization_id,
          plan_name: dbSub.plan_name,
          status: dbSub.status,
          issue: "Exists in DB but not in Stripe",
        })
      }
    }
  }

  return Response.json(
    {
      summary: {
        total_stripe_subscriptions: stripeSubscriptions.data.length,
        total_db_subscriptions: dbSubscriptions?.length || 0,
        paid_customers: paidCustomers.length,
        missing_in_db: missingInDB.length,
        missing_in_stripe: missingInStripe.length,
        synced: paidCustomers.filter((c) => c.sync_status === "SYNCED").length,
        mismatched: paidCustomers.filter((c) => c.sync_status === "MISMATCH").length,
      },
      paid_customers: paidCustomers,
      missing_in_db: missingInDB,
      missing_in_stripe: missingInStripe,
      all_db_subscriptions: dbSubscriptions,
    },
    { status: 200 },
  )
}
