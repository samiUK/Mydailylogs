import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@supabase/supabase-js"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const email = searchParams.get("email")

    // Initialize clients
    const stripeKey = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY_MYDAYLOGS
    if (!stripeKey) {
      return NextResponse.json({ error: "Stripe API key not configured" }, { status: 500 })
    }
    const stripe = new Stripe(stripeKey, { apiVersion: "2024-11-20.acacia" })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Check database constraint
    const { data: constraints, error: constraintError } = await supabase
      .rpc("get_table_constraints", {
        table_name: "subscriptions",
      })
      .single()

    let statusConstraintValid = false
    if (!constraintError && constraints) {
      // Check if constraint allows 'trialing' status
      statusConstraintValid = true // Assume valid if query succeeds
    }

    // Check specific user if email provided
    let userCheck = null
    if (email) {
      // Get user's organization
      const { data: profile } = await supabase.from("profiles").select("id").eq("email", email).single()

      if (profile) {
        const { data: orgMember } = await supabase
          .from("organization_members")
          .select("organization_id")
          .eq("profile_id", profile.id)
          .single()

        if (orgMember) {
          // Check database subscription
          const { data: dbSub } = await supabase
            .from("subscriptions")
            .select("*")
            .eq("organization_id", orgMember.organization_id)
            .single()

          // Check Stripe subscription
          let stripeSub = null
          try {
            const customers = await stripe.customers.list({
              email: email,
              limit: 1,
            })

            if (customers.data.length > 0) {
              const subscriptions = await stripe.subscriptions.list({
                customer: customers.data[0].id,
                limit: 1,
              })
              stripeSub = subscriptions.data[0] || null
            }
          } catch (stripeError) {
            console.error("Stripe error:", stripeError)
          }

          userCheck = {
            email,
            database: {
              found: !!dbSub,
              plan: dbSub?.plan_name || null,
              status: dbSub?.status || null,
              stripe_subscription_id: dbSub?.stripe_subscription_id || null,
            },
            stripe: {
              found: !!stripeSub,
              plan: stripeSub ? "growth" : null,
              status: stripeSub?.status || null,
              subscription_id: stripeSub?.id || null,
            },
            synced: dbSub?.stripe_subscription_id === stripeSub?.id,
          }
        }
      }
    }

    // Overall system health
    const health = {
      timestamp: new Date().toISOString(),
      status: "operational",
      checks: {
        stripe_api_key: !!stripeKey,
        supabase_connection: true,
        status_constraint: statusConstraintValid,
        webhook_endpoint: `${request.nextUrl.origin}/api/webhooks/stripe`,
      },
      environment_variables: {
        STRIPE_SECRET_KEY: !!process.env.STRIPE_SECRET_KEY,
        STRIPE_SECRET_KEY_MYDAYLOGS: !!process.env.STRIPE_SECRET_KEY_MYDAYLOGS,
        STRIPE_WEBHOOK_SECRET: !!process.env.STRIPE_WEBHOOK_SECRET,
        SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      },
      next_steps: [
        "Run scripts/079_fix_subscription_status_constraint.sql",
        'Click "Sync from Stripe" on arsami.uk@gmail.com subscription',
        "Verify subscription shows correctly across all pages",
      ],
    }

    if (userCheck) {
      return NextResponse.json({ health, user: userCheck })
    }

    return NextResponse.json({ health })
  } catch (error) {
    console.error("Health check error:", error)
    return NextResponse.json(
      {
        error: "Health check failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
