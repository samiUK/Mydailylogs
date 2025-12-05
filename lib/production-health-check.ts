// Production Health Check Utility
// Run this periodically to verify system health

import { createClient } from "@supabase/supabase-js"
import Stripe from "stripe"

export interface HealthCheckResult {
  status: "healthy" | "degraded" | "unhealthy"
  checks: {
    database: boolean
    stripe: boolean
    email: boolean
    subscriptionSync: boolean
    rlsPolicies: boolean
  }
  issues: string[]
  timestamp: string
}

async function checkDatabase(): Promise<{ healthy: boolean; issues: string[] }> {
  const issues: string[] = []

  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    // Check connection
    const { error: connectionError } = await supabase.from("organizations").select("count").limit(1)
    if (connectionError) {
      issues.push(`Database connection failed: ${connectionError.message}`)
      return { healthy: false, issues }
    }

    // Check for duplicate subscriptions
    const { data: duplicates } = await supabase.rpc("check_duplicate_subscriptions")
    if (duplicates && duplicates.length > 0) {
      issues.push(`Found ${duplicates.length} organizations with duplicate active subscriptions`)
    }

    // Check RLS is enabled
    const { data: rlsCheck } = await supabase.rpc("check_rls_enabled")
    if (rlsCheck && rlsCheck.some((t: any) => !t.rowsecurity)) {
      issues.push("Some critical tables don't have RLS enabled")
    }

    return { healthy: issues.length === 0, issues }
  } catch (error: any) {
    issues.push(`Database health check failed: ${error.message}`)
    return { healthy: false, issues }
  }
}

async function checkStripe(): Promise<{ healthy: boolean; issues: string[] }> {
  const issues: string[] = []

  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      issues.push("STRIPE_SECRET_KEY not configured")
      return { healthy: false, issues }
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

    // Check API connection
    await stripe.balance.retrieve()

    // Verify webhook endpoint
    const webhooks = await stripe.webhookEndpoints.list({ limit: 100 })
    const productionWebhook = webhooks.data.find((wh) => wh.url.includes(process.env.NEXT_PUBLIC_SITE_URL || ""))

    if (!productionWebhook) {
      issues.push("Production webhook not configured in Stripe")
    } else if (!productionWebhook.enabled_events.includes("checkout.session.completed")) {
      issues.push("Webhook missing critical events")
    }

    // Check all required prices exist
    const requiredPrices = [
      "growth-monthly-GBP",
      "growth-monthly-USD",
      "growth-yearly-GBP",
      "growth-yearly-USD",
      "scale-monthly-GBP",
      "scale-monthly-USD",
      "scale-yearly-GBP",
      "scale-yearly-USD",
    ]

    const prices = await stripe.prices.list({ limit: 100, active: true })
    const configuredPrices = Object.values(require("./stripe-prices").STRIPE_PRICES)
      .flatMap((plan: any) => Object.values(plan))
      .flatMap((period: any) => Object.values(period))

    const missingPrices = configuredPrices.filter(
      (id: any) => id.includes("MISSING") || !prices.data.find((p) => p.id === id),
    )

    if (missingPrices.length > 0) {
      issues.push(`${missingPrices.length} Stripe prices not configured or missing`)
    }

    return { healthy: issues.length === 0, issues }
  } catch (error: any) {
    issues.push(`Stripe health check failed: ${error.message}`)
    return { healthy: false, issues }
  }
}

async function checkEmailSystem(): Promise<{ healthy: boolean; issues: string[] }> {
  const issues: string[] = []

  // Check SMTP configuration
  if (!process.env.SMTP_HOST) issues.push("SMTP_HOST not configured")
  if (!process.env.SMTP_USER) issues.push("SMTP_USER not configured")
  if (!process.env.SMTP_PASSWORD) issues.push("SMTP_PASSWORD not configured")

  // Check Resend fallback
  if (!process.env.RESEND_API_KEY) {
    issues.push("RESEND_API_KEY not configured (no fallback)")
  }

  return { healthy: issues.length === 0, issues }
}

async function checkSubscriptionSync(): Promise<{ healthy: boolean; issues: string[] }> {
  const issues: string[] = []

  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    // Check for subscriptions without Stripe IDs (master admin trials are OK)
    const { data: orphanedSubs } = await supabase
      .from("subscriptions")
      .select("id, organization_id, plan_name")
      .is("stripe_subscription_id", null)
      .eq("is_masteradmin_trial", false)
      .in("status", ["active", "trialing"])

    if (orphanedSubs && orphanedSubs.length > 0) {
      issues.push(`Found ${orphanedSubs.length} active subscriptions without Stripe subscription IDs`)
    }

    return { healthy: issues.length === 0, issues }
  } catch (error: any) {
    issues.push(`Subscription sync check failed: ${error.message}`)
    return { healthy: false, issues }
  }
}

export async function runProductionHealthCheck(): Promise<HealthCheckResult> {
  console.log("[v0] Running production health check...")

  const [database, stripe, email, subscriptionSync] = await Promise.all([
    checkDatabase(),
    checkStripe(),
    checkEmailSystem(),
    checkSubscriptionSync(),
  ])

  const allIssues = [...database.issues, ...stripe.issues, ...email.issues, ...subscriptionSync.issues]

  const healthyChecks = [database.healthy, stripe.healthy, email.healthy, subscriptionSync.healthy].filter(
    Boolean,
  ).length

  let status: "healthy" | "degraded" | "unhealthy"
  if (healthyChecks === 4) status = "healthy"
  else if (healthyChecks >= 2) status = "degraded"
  else status = "unhealthy"

  const result: HealthCheckResult = {
    status,
    checks: {
      database: database.healthy,
      stripe: stripe.healthy,
      email: email.healthy,
      subscriptionSync: subscriptionSync.healthy,
      rlsPolicies: database.healthy, // Included in database check
    },
    issues: allIssues,
    timestamp: new Date().toISOString(),
  }

  console.log("[v0] Health check complete:", result.status)
  if (allIssues.length > 0) {
    console.warn("[v0] Issues found:", allIssues)
  }

  return result
}
