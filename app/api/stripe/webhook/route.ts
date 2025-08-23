import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { createClient } from "@/lib/supabase/server"
import { headers } from "next/headers"

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const headersList = await headers()
    const signature = headersList.get("stripe-signature")!

    let event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error("Webhook signature verification failed:", err)
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    const supabase = await createClient()

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as any
        const organizationId = session.metadata.organizationId
        const customerId = session.customer

        // Get subscription details
        const subscription = await stripe.subscriptions.retrieve(session.subscription)

        // Get plan details
        const priceId = subscription.items.data[0].price.id
        const { data: plan } = await supabase
          .from("subscription_plans")
          .select("*")
          .eq("stripe_price_id", priceId)
          .single()

        if (plan) {
          // Create subscription record
          const { error } = await supabase.from("subscriptions").insert({
            organization_id: organizationId,
            plan_id: plan.id,
            stripe_subscription_id: subscription.id,
            stripe_customer_id: customerId,
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000),
            current_period_end: new Date(subscription.current_period_end * 1000),
          })

          if (error) {
            console.error("Error creating subscription:", error)
          }

          // Update organization with subscription
          await supabase.from("organizations").update({ subscription_id: subscription.id }).eq("id", organizationId)
        }
        break
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as any
        const customerId = invoice.customer

        // Get customer metadata
        const customer = await stripe.customers.retrieve(customerId)
        const organizationId = (customer as any).metadata?.organizationId

        if (organizationId) {
          // Record billing history
          await supabase.from("billing_history").insert({
            organization_id: organizationId,
            stripe_invoice_id: invoice.id,
            amount: invoice.amount_paid / 100, // Convert from cents
            currency: invoice.currency,
            status: "paid",
            invoice_date: new Date(invoice.created * 1000),
          })
        }
        break
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as any

        // Update subscription status
        await supabase
          .from("subscriptions")
          .update({
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000),
            current_period_end: new Date(subscription.current_period_end * 1000),
            cancel_at_period_end: subscription.cancel_at_period_end,
          })
          .eq("stripe_subscription_id", subscription.id)
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Webhook error:", error)
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 })
  }
}
