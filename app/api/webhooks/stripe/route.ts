import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { createClient } from "@supabase/supabase-js"
import type Stripe from "stripe"
import { sendEmail, emailTemplates } from "@/lib/email/smtp"

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get("stripe-signature")

  if (!signature) {
    console.error("[v0] Missing Stripe signature")
    return NextResponse.json({ error: "No signature" }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: any) {
    console.error("[v0] Webhook signature verification failed:", err.message)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  console.log("[v0] Stripe webhook received:", event.type, event.id)

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        console.log("[v0] Checkout completed:", session.id)

        const organizationId = session.metadata?.organization_id
        const productId = session.metadata?.product_id
        const planName = session.metadata?.plan_name

        if (!organizationId || !productId || !planName) {
          console.error("[v0] Missing required metadata in session:", session.metadata)
          throw new Error("Invalid session metadata")
        }

        const subscriptionId = session.subscription as string
        if (!subscriptionId) {
          console.error("[v0] No subscription ID in session")
          throw new Error("Missing subscription ID")
        }

        const subscription = await stripe.subscriptions.retrieve(subscriptionId)

        const { error: subError } = await supabaseAdmin.from("subscriptions").upsert(
          {
            id: subscriptionId,
            organization_id: organizationId,
            plan_name: planName,
            status: subscription.status,
            stripe_subscription_id: subscriptionId,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "id",
          },
        )

        if (subError) {
          console.error("[v0] Error upserting subscription:", subError)
          throw subError
        }

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

        if (session.customer_email && session.amount_total) {
          try {
            const template = emailTemplates.paymentConfirmation({
              customerName: session.customer_details?.name || "Customer",
              amount: `£${((session.amount_total || 0) / 100).toFixed(2)}`,
              planName: planName || "Premium Plan",
              transactionId: session.id,
              date: new Date().toISOString(),
              paymentMethod: session.payment_method_types?.[0] || "card",
              invoiceUrl: session.invoice ? `https://invoice.stripe.com/i/${session.invoice}` : undefined,
            })

            await sendEmail(session.customer_email, template.subject, template.html)
            console.log("[v0] Payment confirmation email sent to:", session.customer_email)
          } catch (emailError) {
            console.error("[v0] Failed to send payment confirmation email:", emailError)
          }
        }

        console.log("[v0] Subscription created successfully:", subscriptionId)
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
          throw error
        }

        // Check if trial is ending in 3 days and send reminder
        if (subscription.status === "trialing" && subscription.trial_end) {
          const trialEndDate = new Date(subscription.trial_end * 1000)
          const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
          const twoDaysFromNow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)

          // Send reminder if trial ends in exactly 3 days (within 24-hour window)
          if (trialEndDate >= twoDaysFromNow && trialEndDate <= threeDaysFromNow) {
            try {
              const customer = (await stripe.customers.retrieve(subscription.customer as string)) as Stripe.Customer
              const planName =
                subscription.items.data[0]?.price?.nickname || subscription.metadata.plan_name || "Premium"
              const amount = `£${((subscription.items.data[0]?.price?.unit_amount || 0) / 100).toFixed(2)}`

              if (customer.email) {
                const template = emailTemplates.trialEndingReminder({
                  customerName: customer.name || "Customer",
                  planName: planName,
                  trialEndDate: trialEndDate.toISOString(),
                  nextBillingDate: new Date(subscription.current_period_end * 1000).toISOString(),
                  amount: amount,
                  billingUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/admin/profile/billing`,
                  features: [
                    "Advanced task management",
                    "Team collaboration tools",
                    "Professional reporting",
                    "Priority email support",
                    "Custom branding (Scale plan)",
                  ],
                })

                await sendEmail(customer.email, template.subject, template.html)
                console.log("[v0] Trial ending reminder sent to:", customer.email)
              }
            } catch (emailError) {
              console.error("[v0] Failed to send trial ending reminder:", emailError)
            }
          }
        }

        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription
        console.log("[v0] Subscription cancelled:", subscription.id)

        const { data: subData } = await supabaseAdmin
          .from("subscriptions")
          .select("organization_id")
          .eq("id", subscription.id)
          .single()

        const { error } = await supabaseAdmin
          .from("subscriptions")
          .update({
            status: "canceled",
            updated_at: new Date().toISOString(),
          })
          .eq("id", subscription.id)

        if (error) {
          console.error("[v0] Error cancelling subscription:", error)
          throw error
        }

        if (subData?.organization_id) {
          console.log("[v0] Processing downgrade cleanup for organization:", subData.organization_id)

          // Keep only last 3 templates, archive the rest
          const { data: templates } = await supabaseAdmin
            .from("checklist_templates")
            .select("id, created_at")
            .eq("organization_id", subData.organization_id)
            .eq("is_active", true)
            .order("created_at", { ascending: false })

          if (templates && templates.length > 3) {
            const templatesToArchive = templates.slice(3).map((t) => t.id)

            const { error: archiveError } = await supabaseAdmin
              .from("checklist_templates")
              .update({ is_active: false })
              .in("id", templatesToArchive)

            if (archiveError) {
              console.error("[v0] Error archiving templates:", archiveError)
            } else {
              console.log("[v0] Archived", templatesToArchive.length, "templates")
            }
          }

          // Keep only last 50 reports, delete the rest
          const { data: reports } = await supabaseAdmin
            .from("submitted_reports")
            .select("id, submitted_at")
            .eq("organization_id", subData.organization_id)
            .is("deleted_at", null)
            .order("submitted_at", { ascending: false })

          if (reports && reports.length > 50) {
            const reportsToDelete = reports.slice(50).map((r) => r.id)

            const { error: deleteError } = await supabaseAdmin
              .from("submitted_reports")
              .update({
                deleted_at: new Date().toISOString(),
                deleted_by: null, // System deletion
              })
              .in("id", reportsToDelete)

            if (deleteError) {
              console.error("[v0] Error deleting reports:", deleteError)
            } else {
              console.log("[v0] Soft-deleted", reportsToDelete.length, "reports")
            }
          }

          console.log("[v0] Downgrade cleanup completed for organization:", subData.organization_id)
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
            stripe_invoice_url: invoice.hosted_invoice_url || undefined,
            stripe_invoice_pdf: invoice.invoice_pdf || undefined,
          })

          if (error) {
            console.error("[v0] Error recording payment:", error)
          }

          if (invoice.customer_email && invoice.billing_reason === "subscription_cycle") {
            try {
              const periodStart = new Date(invoice.period_start * 1000)
              const periodEnd = new Date(invoice.period_end * 1000)

              const template = emailTemplates.monthlyInvoice({
                customerName: invoice.customer_name || "Customer",
                invoiceNumber: invoice.number || invoice.id,
                planName: invoice.lines.data[0]?.description || "Subscription",
                period: `${periodStart.toLocaleDateString("en-GB")} - ${periodEnd.toLocaleDateString("en-GB")}`,
                amount: `£${((invoice.amount_paid || 0) / 100).toFixed(2)}`,
                paymentDate: new Date(invoice.status_transitions.paid_at! * 1000).toISOString(),
                invoiceUrl: invoice.hosted_invoice_url || undefined,
              })

              await sendEmail(invoice.customer_email, template.subject, template.html)
              console.log("[v0] Monthly invoice email sent to:", invoice.customer_email)
            } catch (emailError) {
              console.error("[v0] Failed to send monthly invoice email:", emailError)
            }
          }
        }

        break
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice
        console.log("[v0] Payment failed for invoice:", invoice.id)

        if (invoice.subscription) {
          const { error: paymentError } = await supabaseAdmin.from("payments").insert({
            subscription_id: invoice.subscription as string,
            amount: (invoice.amount_due || 0) / 100,
            currency: invoice.currency || "gbp",
            status: "failed",
            transaction_id: invoice.payment_intent as string,
            payment_method: "card",
          })

          if (paymentError) {
            console.error("[v0] Error recording failed payment:", paymentError)
          }

          const { error: subError } = await supabaseAdmin
            .from("subscriptions")
            .update({
              status: "past_due",
              updated_at: new Date().toISOString(),
            })
            .eq("id", invoice.subscription as string)

          if (subError) {
            console.error("[v0] Error updating subscription status:", subError)
          }

          if (invoice.customer_email) {
            try {
              const template = emailTemplates.paymentFailed({
                customerName: invoice.customer_name || "Customer",
                planName: invoice.lines.data[0]?.description || "Subscription",
                amount: `£${((invoice.amount_due || 0) / 100).toFixed(2)}`,
                date: new Date().toISOString(),
                reason: invoice.last_finalization_error?.message || "Payment was declined by your bank",
                updatePaymentUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/admin/profile/billing`,
              })

              await sendEmail(invoice.customer_email, template.subject, template.html)
              console.log("[v0] Payment failed email sent to:", invoice.customer_email)
            } catch (emailError) {
              console.error("[v0] Failed to send payment failed email:", emailError)
            }
          }
        }

        break
      }

      default:
        console.log("[v0] Unhandled event type:", event.type)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error("[v0] Error processing webhook:", error)
    return NextResponse.json({ error: "Webhook processing failed", details: error.message }, { status: 500 })
  }
}
