"use server"

import { stripe } from "@/lib/stripe"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { createClient as createServiceClient } from "@supabase/supabase-js"

const supabaseAdmin = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

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
