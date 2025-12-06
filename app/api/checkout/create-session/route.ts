import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { getSubscriptionTypeFromPriceId } from "@/lib/stripe-prices"
import { getSubscriptionType } from "@/lib/subscription-types"
import { checkCheckoutRateLimit, checkCancellationCooldown } from "@/lib/anti-fraud"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { priceId } = await request.json()

    console.log("[v0] Received priceId in API:", priceId)

    if (!priceId?.startsWith("price_")) {
      console.log("[v0] priceId validation failed - doesn't start with 'price_'")
      return NextResponse.json({ error: "Invalid price ID" }, { status: 400 })
    }

    const subscriptionInfo = getSubscriptionTypeFromPriceId(priceId)
    console.log("[v0] Subscription info from priceId:", subscriptionInfo)

    if (!subscriptionInfo) {
      console.log("[v0] Could not find subscription info for priceId:", priceId)
      return NextResponse.json({ error: "Invalid price ID" }, { status: 400 })
    }

    const subscriptionType = getSubscriptionType(subscriptionInfo.plan, subscriptionInfo.period)

    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id, email, full_name, has_used_trial, is_email_verified")
      .eq("id", user.id)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: "Profile not found" }, { status: 400 })
    }

    if (!profile.is_email_verified) {
      return NextResponse.json(
        {
          error: "Please verify your email address before subscribing. Check your inbox for the verification link.",
        },
        { status: 403 },
      )
    }

    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"
    const rateLimit = await checkCheckoutRateLimit(profile.email || user.email!, ipAddress)

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: rateLimit.reason,
        },
        { status: 429 },
      )
    }

    const cooldown = await checkCancellationCooldown(profile.organization_id)

    if (cooldown.inCooldown) {
      return NextResponse.json(
        {
          error: cooldown.reason,
          cooldownDaysRemaining: cooldown.daysRemaining,
        },
        { status: 403 },
      )
    }

    const userHasUsedTrial = profile.has_used_trial || false

    const { data: existingSub } = await supabaseAdmin
      .from("subscriptions")
      .select("stripe_customer_id, has_used_trial")
      .eq("organization_id", profile.organization_id)
      .single()

    let customerId = existingSub?.stripe_customer_id
    const orgHasUsedTrial = existingSub?.has_used_trial || false

    const hasUsedTrial = userHasUsedTrial || orgHasUsedTrial

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile.email || user.email!,
        name: profile.full_name,
        metadata: {
          organization_id: profile.organization_id,
          user_id: user.id,
        },
      })
      customerId = customer.id
    }

    const subscriptionData: any = {
      metadata: {
        organization_id: profile.organization_id,
        subscription_type: subscriptionType,
      },
    }

    const sessionConfig: any = {
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      subscription_data: subscriptionData,
      payment_method_collection: "always",
      ui_mode: "embedded",
      redirect_on_completion: "never",
      allow_promotion_codes: true,
      metadata: {
        organization_id: profile.organization_id,
        user_id: user.id,
        subscription_type: subscriptionType,
        user_email: profile.email || user.email!,
        ip_address: ipAddress,
        user_agent: request.headers.get("user-agent") || "unknown",
      },
    }

    if (!hasUsedTrial) {
      subscriptionData.trial_period_days = 30
    }

    const session = await stripe.checkout.sessions.create(sessionConfig)

    console.log("[v0] Checkout session created with rate limit - attempts remaining:", rateLimit.attemptsRemaining)

    return NextResponse.json({ clientSecret: session.client_secret })
  } catch (error: any) {
    console.error("Checkout error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
