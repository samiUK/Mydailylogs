import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { supabaseAdmin } from "@/lib/supabase/admin"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productType, interval, organizationId, userEmail, userId, userName, currency = "GBP" } = body // Added currency parameter

    console.log("[v0] Received checkout request with parameters:", {
      productType,
      interval,
      organizationId,
      userEmail,
      userId,
      userName,
      currency,
    })

    // Validate inputs - userName is optional
    if (!productType || !interval || !organizationId || !userEmail || !userId) {
      const missing = []
      if (!productType) missing.push("productType")
      if (!interval) missing.push("interval")
      if (!organizationId) missing.push("organizationId")
      if (!userEmail) missing.push("userEmail")
      if (!userId) missing.push("userId")

      console.error("[v0] Missing required parameters:", missing.join(", "))
      return NextResponse.json(
        {
          error: "Missing required parameters",
          missing: missing,
        },
        { status: 400 },
      )
    }

    console.log("[v0] All required parameters present, creating checkout session")

    // Get organization details
    const { data: org, error: orgError } = await supabaseAdmin
      .from("organizations")
      .select("*")
      .eq("id", organizationId)
      .single()

    if (orgError || !org) {
      console.error("[v0] Organization not found:", orgError)
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    // Get or create Stripe customer
    let customerId = org.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userEmail,
        name: userName || org.name,
        metadata: {
          organizationId: organizationId,
          userId: userId,
        },
      })
      customerId = customer.id

      // Update organization with Stripe customer ID
      await supabaseAdmin.from("organizations").update({ stripe_customer_id: customerId }).eq("id", organizationId)

      console.log("[v0] Created new Stripe customer:", customerId)
    } else {
      console.log("[v0] Using existing Stripe customer:", customerId)
    }

    const prices = {
      GBP: {
        growth: {
          month: 1000, // £10/month
          year: 9600, // £96/year
        },
        scale: {
          month: 1700, // £17/month
          year: 18000, // £180/year
        },
      },
      USD: {
        growth: {
          month: 1000, // $10/month
          year: 10800, // $108/year (9*12)
        },
        scale: {
          month: 1700, // $17/month
          year: 19200, // $192/year (16*12)
        },
      },
    }

    const selectedCurrency = (currency as "GBP" | "USD") || "GBP"
    const amount = prices[selectedCurrency][productType as "growth" | "scale"][interval as "month" | "year"]

    if (!amount) {
      console.error("[v0] Invalid product type or interval:", { productType, interval })
      return NextResponse.json({ error: "Invalid product configuration" }, { status: 400 })
    }

    const planName = productType.charAt(0).toUpperCase() + productType.slice(1)

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: selectedCurrency.toLowerCase(),
            product_data: {
              name: `${planName} Plan`,
              description: interval === "year" ? "Billed annually" : "Billed monthly",
            },
            unit_amount: amount,
            recurring: {
              interval: interval === "year" ? "year" : "month",
              interval_count: 1,
            },
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      subscription_data: {
        trial_period_days: 30,
        metadata: {
          organization_id: organizationId,
          plan_name: productType,
          billing_interval: interval,
        },
      },
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/admin/profile/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/admin/profile/billing?canceled=true`,
      metadata: {
        organization_id: organizationId,
        user_id: userId,
        plan_name: productType,
        billing_interval: interval,
      },
    })

    console.log("[v0] Checkout session created:", session.id)

    return NextResponse.json({
      clientSecret: session.client_secret,
      sessionId: session.id,
    })
  } catch (error: any) {
    console.error("[v0] Error creating checkout session:", error)
    return NextResponse.json({ error: error.message || "Failed to create checkout session" }, { status: 500 })
  }
}
