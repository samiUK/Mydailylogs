"use server"

import { stripe } from "@/lib/stripe"
import { SUBSCRIPTION_PRODUCTS } from "@/lib/subscription-products"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { createClient as createServiceClient } from "@supabase/supabase-js"

const supabaseAdmin = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function startCheckoutSession(
  productId: string,
  billingInterval: "month" | "year" = "month",
  organizationId: string,
  userEmail: string,
  userId: string,
  userName?: string,
) {
  console.log("[v0] Server action called - startCheckoutSession:", { productId, billingInterval, organizationId })

  try {
    const product = SUBSCRIPTION_PRODUCTS.find((p) => p.id === productId)

    if (!product) {
      console.error("[v0] Product not found:", productId)
      throw new Error(`Product with id "${productId}" not found`)
    }

    if (product.priceMonthly === 0) {
      console.error("[v0] Cannot create checkout for free plan")
      throw new Error("Cannot create checkout session for free plan")
    }

    console.log("[v0] Product validated:", product.name)

    const { data: existingSubscription, error: subError } = await supabaseAdmin
      .from("subscriptions")
      .select("id, plan_name, status")
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .maybeSingle()

    if (subError) {
      console.error("[v0] Subscription query error:", subError)
    }

    console.log("[v0] Existing subscription check:", existingSubscription)

    if (existingSubscription && existingSubscription.plan_name.toLowerCase() !== "starter") {
      throw new Error("You already have an active paid subscription. Please manage it from your billing page.")
    }

    const { data: org } = await supabaseAdmin
      .from("organizations")
      .select("organization_name")
      .eq("organization_id", organizationId)
      .single()

    console.log("[v0] Organization name:", org?.organization_name)

    let customerId: string

    console.log("[v0] Looking up Stripe customer by email:", userEmail)

    const customers = await stripe.customers.list({
      email: userEmail,
      limit: 1,
    })

    if (customers.data.length > 0) {
      customerId = customers.data[0].id
      console.log("[v0] Found existing Stripe customer:", customerId)
    } else {
      console.log("[v0] Creating new Stripe customer")
      const customer = await stripe.customers.create({
        email: userEmail,
        name: userName || org?.organization_name || "Unknown",
        metadata: {
          organization_id: organizationId,
          user_id: userId,
        },
      })
      customerId = customer.id
      console.log("[v0] Created Stripe customer:", customerId)
    }

    const price = billingInterval === "year" ? product.priceYearly : product.priceMonthly
    console.log("[v0] Creating Stripe checkout session - Price:", price, "pence, Interval:", billingInterval)

    const session = await stripe.checkout.sessions.create({
      ui_mode: "embedded",
      redirect_on_completion: "never",
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: {
              name: product.name,
              description: product.description,
            },
            unit_amount: price,
            recurring: {
              interval: billingInterval,
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
          product_id: productId,
          plan_name: product.name,
          billing_interval: billingInterval,
        },
      },
      metadata: {
        organization_id: organizationId,
        product_id: productId,
        user_id: userId,
        plan_name: product.name,
        billing_interval: billingInterval,
      },
    })

    console.log("[v0] Stripe session created successfully:", session.id)
    console.log("[v0] Client secret exists:", !!session.client_secret)

    if (!session.client_secret) {
      throw new Error("Failed to generate payment session - no client secret returned")
    }

    return session.client_secret
  } catch (error) {
    console.error("[v0] FATAL ERROR in startCheckoutSession:", error)
    console.error("[v0] Error name:", error instanceof Error ? error.name : typeof error)
    console.error("[v0] Error message:", error instanceof Error ? error.message : String(error))
    console.error("[v0] Error stack:", error instanceof Error ? error.stack : "No stack trace")

    if (error instanceof Error) {
      throw error
    }
    throw new Error("An unexpected error occurred. Please try again or contact support.")
  }
}

export async function cancelSubscription(subscriptionId: string) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw new Error("Unauthorized")
    }

    const { data: profile } = await supabase.from("profiles").select("organization_id, role").eq("id", user.id).single()

    if (!profile?.organization_id || (profile.role !== "admin" && profile.role !== "manager")) {
      throw new Error("Only admins and managers can cancel subscriptions")
    }

    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("id, organization_id")
      .eq("id", subscriptionId)
      .eq("organization_id", profile.organization_id)
      .single()

    if (!subscription) {
      throw new Error("Subscription not found or access denied")
    }

    await stripe.subscriptions.cancel(subscriptionId)

    return { success: true }
  } catch (error) {
    console.error("Error cancelling subscription:", error)
    throw error
  }
}

export async function createBillingPortalSession() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      redirect("/auth/login")
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id, email")
      .eq("id", user.id)
      .single()

    if (!profile?.organization_id) {
      throw new Error("Organization not found")
    }

    const customers = await stripe.customers.list({
      email: profile.email,
      limit: 1,
    })

    if (customers.data.length === 0) {
      throw new Error("No Stripe customer found. Please contact support.")
    }

    const customerId = customers.data[0].id

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/admin/profile/billing`,
    })

    return portalSession.url
  } catch (error) {
    console.error("Error creating billing portal session:", error)
    throw error
  }
}

export async function processRefund(paymentId: string, amount?: number, reason?: string) {
  try {
    const { data: payment } = await supabaseAdmin
      .from("payments")
      .select("transaction_id, amount, subscription_id, subscriptions(organization_id)")
      .eq("id", paymentId)
      .single()

    if (!payment || !payment.transaction_id) {
      throw new Error("Payment not found")
    }

    const refund = await stripe.refunds.create({
      payment_intent: payment.transaction_id,
      amount: amount ? Math.round(amount * 100) : undefined,
      reason: reason as any,
    })

    await supabaseAdmin.from("payments").insert({
      subscription_id: payment.subscription_id,
      amount: -(refund.amount / 100),
      currency: refund.currency,
      status: "refunded",
      transaction_id: refund.id,
      payment_method: "refund",
    })

    return { success: true, refund }
  } catch (error) {
    console.error("Error processing refund:", error)
    throw error
  }
}

export async function changeSubscriptionPlan(newProductId: string) {
  try {
    const newProduct = SUBSCRIPTION_PRODUCTS.find((p) => p.id === newProductId)

    if (!newProduct) {
      throw new Error(`Product with id "${newProductId}" not found`)
    }

    if (newProduct.priceMonthly === 0) {
      throw new Error("Cannot change to free plan. Please contact support to downgrade to Starter.")
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      redirect("/auth/login")
    }

    const { data: profile } = await supabase.from("profiles").select("organization_id, role").eq("id", user.id).single()

    if (!profile?.organization_id || (profile.role !== "admin" && profile.role !== "manager")) {
      throw new Error("Only admins and managers can manage subscriptions")
    }

    const { data: existingSubscription } = await supabaseAdmin
      .from("subscriptions")
      .select("id, plan_name, status, stripe_subscription_id")
      .eq("organization_id", profile.organization_id)
      .eq("status", "active")
      .maybeSingle()

    if (!existingSubscription || !existingSubscription.stripe_subscription_id) {
      throw new Error("No active subscription found. Please upgrade first.")
    }

    const currentPlanName = existingSubscription.plan_name.toLowerCase()

    if (currentPlanName === "starter") {
      throw new Error("Please use the upgrade button to switch from Starter plan")
    }

    if (currentPlanName === newProductId) {
      throw new Error("You are already on this plan")
    }

    const stripeSubscription = await stripe.subscriptions.retrieve(existingSubscription.stripe_subscription_id)

    const updatedSubscription = await stripe.subscriptions.update(existingSubscription.stripe_subscription_id, {
      items: [
        {
          id: stripeSubscription.items.data[0].id,
          price_data: {
            currency: "gbp",
            product_data: {
              name: newProduct.name,
              description: newProduct.description,
            },
            unit_amount: newProduct.priceMonthly,
            recurring: {
              interval: "month",
            },
          },
        },
      ],
      proration_behavior: "always_invoice",
      metadata: {
        organization_id: profile.organization_id,
        product_id: newProductId,
        plan_name: newProduct.name,
      },
    })

    await supabaseAdmin
      .from("subscriptions")
      .update({
        plan_name: newProductId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingSubscription.id)

    return { success: true, subscription: updatedSubscription }
  } catch (error) {
    console.error("Error changing subscription plan:", error)
    throw error
  }
}
