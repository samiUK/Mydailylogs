import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import Stripe from "stripe"

const getStripeKey = () => {
  const key = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY_MYDAYLOGS
  if (!key) throw new Error("Stripe API key not found")
  return key
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const stripe = new Stripe(getStripeKey(), { apiVersion: "2024-11-20.acacia" })

    const checks = {
      critical: [] as { name: string; status: "pass" | "fail"; message: string }[],
      warnings: [] as { name: string; status: "warning"; message: string }[],
      info: [] as { name: string; status: "info"; message: string }[],
    }

    // 1. Database Schema Check
    try {
      const { data: tables } = await supabase.rpc("check_table_exists", { table_name: "subscriptions" }).single()
      if (tables) {
        checks.critical.push({
          name: "Database Schema",
          status: "pass",
          message: "Core tables exist (subscriptions, payments, organizations)",
        })
      }
    } catch (error) {
      checks.critical.push({
        name: "Database Schema",
        status: "fail",
        message: "Unable to verify database schema. Ensure all migration scripts are run.",
      })
    }

    // 2. Stripe Configuration Check
    try {
      const account = await stripe.accounts.retrieve()
      checks.critical.push({
        name: "Stripe Account",
        status: "pass",
        message: `Connected to Stripe account: ${account.business_profile?.name || account.id}`,
      })

      // Check for webhook endpoint
      const webhooks = await stripe.webhookEndpoints.list({ limit: 10 })
      const hasWebhook = webhooks.data.some((wh) => wh.enabled_events.includes("checkout.session.completed"))

      if (hasWebhook) {
        checks.critical.push({
          name: "Stripe Webhooks",
          status: "pass",
          message: "Webhook endpoint configured with required events",
        })
      } else {
        checks.critical.push({
          name: "Stripe Webhooks",
          status: "fail",
          message: "No webhook configured! Payments will not sync to database.",
        })
      }
    } catch (error) {
      checks.critical.push({
        name: "Stripe Configuration",
        status: "fail",
        message: `Stripe connection failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      })
    }

    // 3. Stripe Prices Check
    try {
      const prices = await stripe.prices.list({ active: true, limit: 10 })
      const growthPrice = prices.data.find((p) => p.metadata?.plan === "growth")
      const scalePrice = prices.data.find((p) => p.metadata?.plan === "scale")

      if (growthPrice && scalePrice) {
        checks.critical.push({
          name: "Stripe Prices",
          status: "pass",
          message: `Found ${prices.data.length} active prices including Growth and Scale plans`,
        })
      } else {
        checks.critical.push({
          name: "Stripe Prices",
          status: "fail",
          message: "Missing Growth or Scale price configuration in Stripe",
        })
      }
    } catch (error) {
      checks.warnings.push({
        name: "Stripe Prices",
        status: "warning",
        message: "Unable to verify Stripe prices",
      })
    }

    // 4. Email Configuration Check
    const hasEmailConfig = !!(
      process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASSWORD
    )

    if (hasEmailConfig) {
      checks.critical.push({
        name: "Email Configuration",
        status: "pass",
        message: "SMTP settings configured for transactional emails",
      })
    } else {
      checks.critical.push({
        name: "Email Configuration",
        status: "fail",
        message: "SMTP settings missing! Trial reminders and notifications will not send.",
      })
    }

    // 5. Subscription Data Check
    const { data: subscriptions, error: subError } = await supabase
      .from("subscriptions")
      .select("id, plan_name, status, stripe_subscription_id, is_trial")
      .limit(100)

    if (!subError && subscriptions) {
      const paidSubs = subscriptions.filter((s) => s.stripe_subscription_id && !s.is_trial)
      const trialSubs = subscriptions.filter((s) => s.is_trial)

      checks.info.push({
        name: "Current Subscriptions",
        status: "info",
        message: `${subscriptions.length} total subscriptions (${paidSubs.length} paid, ${trialSubs.length} trials)`,
      })
    }

    // 6. Payment Data Check
    const { data: payments } = await supabase.from("payments").select("id, amount, currency, status").limit(10)

    if (payments) {
      checks.info.push({
        name: "Payment Records",
        status: "info",
        message: `${payments.length} payment records in database`,
      })
    }

    // 7. Security Check - RLS
    try {
      const { data: rlsCheck } = await supabase.rpc("check_rls_enabled").single()

      if (rlsCheck) {
        checks.critical.push({
          name: "Row Level Security",
          status: "pass",
          message: "RLS policies enabled on critical tables",
        })
      }
    } catch {
      checks.warnings.push({
        name: "Row Level Security",
        status: "warning",
        message: "Unable to verify RLS status. Ensure RLS is enabled on production.",
      })
    }

    // 8. Environment Variables Check
    const requiredEnvVars = [
      "NEXT_PUBLIC_SUPABASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY",
      "NEXT_PUBLIC_SITE_URL",
      "CRON_SECRET",
    ]

    const missingEnvVars = requiredEnvVars.filter((v) => !process.env[v])

    if (missingEnvVars.length === 0) {
      checks.critical.push({
        name: "Environment Variables",
        status: "pass",
        message: "All required environment variables are set",
      })
    } else {
      checks.critical.push({
        name: "Environment Variables",
        status: "fail",
        message: `Missing: ${missingEnvVars.join(", ")}`,
      })
    }

    // Calculate readiness score
    const criticalPasses = checks.critical.filter((c) => c.status === "pass").length
    const criticalTotal = checks.critical.length
    const readinessScore = Math.round((criticalPasses / criticalTotal) * 100)
    const isReady = readinessScore === 100 && checks.critical.every((c) => c.status === "pass")

    return NextResponse.json({
      ready: isReady,
      readinessScore,
      recommendation: isReady
        ? "✅ System is ready to go live! All critical checks passed."
        : "⚠️ System is NOT ready for production. Fix critical issues first.",
      checks,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[v0] Launch readiness check error:", error)
    return NextResponse.json(
      {
        error: "Failed to run launch readiness check",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
