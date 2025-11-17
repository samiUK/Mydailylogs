"use server"

import { stripe } from "@/lib/stripe"
import { SUBSCRIPTION_PRODUCTS } from "@/lib/subscription-products"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export async function startCheckoutSession(productId: string) {
  const product = SUBSCRIPTION_PRODUCTS.find((p) => p.id === productId)

  if (!product) {
    throw new Error(`Product with id "${productId}" not found`)
  }

  if (product.priceMonthly === 0) {
    throw new Error("Cannot create checkout session for free plan")
  }

  // Get the current user and organization
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("profiles").select("organization_id, email").eq("id", user.id).single()

  if (!profile?.organization_id) {
    throw new Error("Organization not found")
  }

  // Create Checkout Session
  const session = await stripe.checkout.sessions.create({
    ui_mode: "embedded",
    redirect_on_completion: "never",
    line_items: [
      {
        price_data: {
          currency: "gbp",
          product_data: {
            name: product.name,
            description: product.description,
          },
          unit_amount: product.priceMonthly,
          recurring: {
            interval: "month",
          },
        },
        quantity: 1,
      },
    ],
    mode: "subscription",
    customer_email: profile.email,
    metadata: {
      organization_id: profile.organization_id,
      product_id: productId,
      user_id: user.id,
    },
  })

  return session.client_secret
}

export async function createBillingPortalSession() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single()

  if (!profile?.organization_id) {
    throw new Error("Organization not found")
  }

  // Get the subscription to find the Stripe customer ID
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("organization_id", profile.organization_id)
    .eq("status", "active")
    .single()

  if (!subscription) {
    throw new Error("No active subscription found")
  }

  // Create portal session
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: subscription.id, // This should be the Stripe customer ID
    return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/admin/profile/billing`,
  })

  return portalSession.url
}
