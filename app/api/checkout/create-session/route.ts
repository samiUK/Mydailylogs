import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { supabaseAdmin } from "@/lib/supabase/admin"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productType, interval, organizationId, userEmail, userId, userName } = body

    console.log("[v0] Create checkout session API called:", { productType, interval, organizationId, userEmail })

    // Validate inputs
    if (!productType || !interval || !organizationId || !userEmail || !userId) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

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

    // Get price IDs from environment
    const priceId =
      productType === "growth"
        ? interval === "month"
          ? process.env.STRIPE_GROWTH_MONTHLY_PRICE_ID
          : process.env.STRIPE_GROWTH_YEARLY_PRICE_ID
        : interval === "month"
          ? process.env.STRIPE_SCALE_MONTHLY_PRICE_ID
          : process.env.STRIPE_SCALE_YEARLY_PRICE_ID

    if (!priceId) {
      console.error("[v0] Price ID not found for:", { productType, interval })
      return NextResponse.json({ error: "Price configuration error" }, { status: 500 })
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/admin/profile/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/admin/profile/billing`,
      metadata: {
        organizationId,
        userId,
        productType,
        interval,
      },
      subscription_data: {
        metadata: {
          organizationId,
          userId,
          productType,
        },
        trial_period_days: 30,
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
