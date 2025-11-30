"use server"

import { stripe } from "@/lib/stripe"
import { SUBSCRIPTION_PRODUCTS } from "@/lib/subscription-products"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { createClient as createServiceClient } from "@supabase/supabase-js"

const supabaseAdmin = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function startCheckoutSession(productId: string, billingInterval: "month" | "year" = "month") {
  try {
    console.log("[v0] Starting checkout session:", { productId, billingInterval })

    const product = SUBSCRIPTION_PRODUCTS.find((p) => p.id === productId)

    if (!product) {
      console.error("[v0] Product not found:", productId)
      throw new Error(`Product with id "${productId}" not found`)
    }

    if (product.priceMonthly === 0) {
      console.error("[v0] Cannot create checkout for free plan")
      throw new Error("Cannot create checkout session for free plan")
    }

    console.log("[v0] Product found:", product.name)

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      console.error("[v0] User not authenticated")
      redirect("/auth/login")
    }

    console.log("[v0] User authenticated:", user.id)

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("organization_id, email, full_name")
      .eq("id", user.id)
      .single()

    if (profileError || !profile?.organization_id) {
      console.error("[v0] Profile error:", profileError)
      throw new Error("Organization not found or invalid profile")
    }

    console.log("[v0] Profile found:", profile.email, "Org:", profile.organization_id)

    const { data: existingSubscription } = await supabase
      .from("subscriptions")
      .select("id, plan_name, status")
      .eq("organization_id", profile.organization_id)
      .eq("status", "active")
      .single()

    console.log("[v0] Existing subscription:", existingSubscription)

    if (existingSubscription && existingSubscription.plan_name.toLowerCase() !== "starter") {
      throw new Error("You already have an active paid subscription. Please manage or cancel it before upgrading.")
    }

    let customerId: string | undefined

    const { data: org } = await supabase
      .from("organizations")
      .select("organization_name")
      .eq("organization_id", profile.organization_id)
      .single()

    console.log("[v0] Organization found:", org?.organization_name)

    const customers = await stripe.customers.list({
      email: profile.email,
      limit: 1,
    })

    if (customers.data.length > 0) {
      customerId = customers.data[0].id
      console.log("[v0] Existing Stripe customer found:", customerId)
    } else {
      const customer = await stripe.customers.create({
        email: profile.email,
        name: profile.full_name || org?.organization_name || "Unknown",
        metadata: {
          organization_id: profile.organization_id,
          user_id: user.id,
        },
      })
      customerId = customer.id
      console.log("[v0] New Stripe customer created:", customerId)
    }

    const price = billingInterval === "year" ? product.priceYearly : product.priceMonthly
    console.log("[v0] Creating checkout session with price:", price, "GBP pence")

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
          organization_id: profile.organization_id,
          product_id: productId,
          plan_name: product.name,
          billing_interval: billingInterval,
        },
      },
      metadata: {
        organization_id: profile.organization_id,
        product_id: productId,
        user_id: user.id,
        plan_name: product.name,
        billing_interval: billingInterval,
      },
    })

    console.log("[v0] Checkout session created:", session.id, "Client secret:", session.client_secret ? "Yes" : "No")

    return session.client_secret
  } catch (error) {
    console.error("[v0] Error creating checkout session:", error)
    throw error
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

    const { data: existingSubscription } = await supabase
      .from("subscriptions")
      .select("id, plan_name, status, stripe_subscription_id")
      .eq("organization_id", profile.organization_id)
      .eq("status", "active")
      .single()

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

    await supabase
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
