import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { createClient } from "@supabase/supabase-js"
import type Stripe from "stripe"

// Initialize Supabase with service role for admin operations
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get("stripe-signature")

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error("Webhook signature verification failed:", err)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  console.log("[v0] Stripe webhook received:", event.type)

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        console.log("[v0] Checkout completed:", session.id)

        // Get subscription details
        const subscriptionId = session.subscription as string
        const subscription = await stripe.subscriptions.retrieve(subscriptionId)

        const organizationId = session.metadata?.organization_id
        const productId = session.metadata?.product_id
        const userId = session.metadata?.user_id

        if (!organizationId || !productId) {
          console.error("[v0] Missing metadata in session")
          break
        }

        // Update or create subscription record
        const { error: subError } = await supabaseAdmin.from("subscriptions").upsert({
          id: subscriptionId,
          organization_id: organizationId,
          plan_name: productId.charAt(0).toUpperCase() + productId.slice(1),
          status: subscription.status,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })

        if (subError) {
          console.error("[v0] Error updating subscription:", subError)
        }

        // Record the payment
        const { error: paymentError } = await supabaseAdmin.from("payments").insert({
          subscription_id: subscriptionId,
          amount: (session.amount_total || 0) / 100,
          currency: session.currency || "gbp",
          status: "succeeded",
          transaction_id: session.payment_intent as string,
          payment_method: "card",
        })

        if (paymentError) {
          console.error("[v0] Error recording payment:", paymentError)
        }

        break
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription
        console.log("[v0] Subscription updated:", subscription.id)

        const { error } = await supabaseAdmin
          .from("subscriptions")
          .update({
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", subscription.id)

        if (error) {
          console.error("[v0] Error updating subscription:", error)
        }

        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription
        console.log("[v0] Subscription cancelled:", subscription.id)

        const { error } = await supabaseAdmin
          .from("subscriptions")
          .update({
            status: "canceled",
            updated_at: new Date().toISOString(),
          })
          .eq("id", subscription.id)

        if (error) {
          console.error("[v0] Error cancelling subscription:", error)
        }

        break
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice
        console.log("[v0] Payment succeeded for invoice:", invoice.id)

        if (invoice.subscription) {
          const { error } = await supabaseAdmin.from("payments").insert({
            subscription_id: invoice.subscription as string,
            amount: (invoice.amount_paid || 0) / 100,
            currency: invoice.currency || "gbp",
            status: "succeeded",
            transaction_id: invoice.payment_intent as string,
            payment_method: "card",
          })

          if (error) {
            console.error("[v0] Error recording payment:", error)
          }
        }

        break
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice
        console.log("[v0] Payment failed for invoice:", invoice.id)

        if (invoice.subscription) {
          const { error } = await supabaseAdmin.from("payments").insert({
            subscription_id: invoice.subscription as string,
            amount: (invoice.amount_due || 0) / 100,
            currency: invoice.currency || "gbp",
            status: "failed",
            transaction_id: invoice.payment_intent as string,
            payment_method: "card",
          })

          if (error) {
            console.error("[v0] Error recording failed payment:", error)
          }
        }

        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("[v0] Error processing webhook:", error)
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
}
