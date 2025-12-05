import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { createClient } from "@supabase/supabase-js"
import type Stripe from "stripe"
import { sendEmail, emailTemplates } from "@/lib/email/smtp"
import { handleSubscriptionDowngrade } from "@/lib/subscription-limits"
import { logSubscriptionActivity } from "@/lib/subscription-activity-logger"

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

        console.log("[v0] Checkout session completed:", {
          sessionId: session.id,
          subscriptionId: session.subscription,
          customerId: session.customer,
          metadata: session.metadata,
        })

        const organizationId = session.metadata?.organization_id
        const subscriptionType = session.metadata?.subscription_type

        if (!organizationId || !subscriptionType) {
          console.error("[v0] Missing required metadata in session:", session.metadata)
          throw new Error("Invalid session metadata")
        }

        const subscriptionId = session.subscription as string
        const customerId = session.customer as string

        if (!subscriptionId || !customerId) {
          console.error("[v0] No subscription ID or customer ID in session")
          throw new Error("Missing subscription or customer ID")
        }

        const subscription = await stripe.subscriptions.retrieve(subscriptionId)

        const { data: deletedSubs } = await supabaseAdmin
          .from("subscriptions")
          .delete()
          .eq("organization_id", organizationId)
          .select()

        console.log(
          "[v0] Deleted",
          deletedSubs?.length || 0,
          "existing subscriptions for organization:",
          organizationId,
        )

        const isTrial = subscription.trial_end ? subscription.trial_end > Math.floor(Date.now() / 1000) : false

        const planName = subscriptionType.split("-")[0]

        console.log("[v0] Creating subscription with plan_name:", planName, "from type:", subscriptionType)

        const { error: subError } = await supabaseAdmin.from("subscriptions").insert({
          id: subscriptionId,
          stripe_subscription_id: subscriptionId,
          stripe_customer_id: customerId,
          organization_id: organizationId,
          plan_name: planName, // Use extracted plan name ("growth", "scale") not full type
          status: subscription.status,
          is_trial: isTrial,
          has_used_trial: true,
          trial_ends_at: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end || false,
          is_masteradmin_trial: false,
        })

        if (subError) {
          console.error("[v0] Error inserting subscription:", subError)
          throw subError
        }

        console.log(
          "[v0] Successfully created subscription with plan:",
          planName,
          "(type:",
          subscriptionType,
          ") for organization:",
          organizationId,
        )

        if (isTrial) {
          const { error: profileError } = await supabaseAdmin
            .from("profiles")
            .update({ has_used_trial: true })
            .eq("organization_id", organizationId)

          if (profileError) {
            console.error("[v0] Error marking user trial usage:", profileError)
          }
        }

        const { error: paymentError } = await supabaseAdmin.from("payments").insert({
          subscription_id: subscriptionId,
          amount: (session.amount_total || 0) / 100,
          currency: session.currency || "gbp",
          status: "completed",
          transaction_id: session.payment_intent as string,
          payment_method: "card",
        })

        if (paymentError) {
          console.error("[v0] Error recording payment:", paymentError)
        }

        if (subscriptionType !== "starter") {
          const { error: resetError } = await supabaseAdmin
            .from("organizations")
            .update({ last_submission_reset_at: new Date().toISOString() })
            .eq("id", organizationId)

          if (resetError) {
            console.error("[v0] Error resetting submission quota:", resetError)
          } else {
            console.log("[v0] Reset submission quota for organization:", organizationId)
          }
        }

        if (session.customer_email && session.amount_total) {
          try {
            const template = emailTemplates.paymentConfirmation({
              customerName: session.customer_details?.name || "Customer",
              amount: `${session.currency === "usd" ? "$" : "£"}${((session.amount_total || 0) / 100).toFixed(2)}`,
              planName: subscriptionType.replace("-", " ").replace(/\b\w/g, (l) => l.toUpperCase()),
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

      case "customer.subscription.created": {
        const subscription = event.data.object as Stripe.Subscription

        console.log("[v0] Subscription created event received:", {
          subscriptionId: subscription.id,
          status: subscription.status,
        })

        const { data: existingSub } = await supabaseAdmin
          .from("subscriptions")
          .select("id")
          .eq("stripe_subscription_id", subscription.id)
          .maybeSingle()

        if (existingSub) {
          console.log("[v0] Subscription already exists, skipping duplicate creation")
          break
        }

        // If no metadata (not from our checkout), skip it
        if (!subscription.metadata?.organization_id || !subscription.metadata?.subscription_type) {
          console.log("[v0] Subscription created without our metadata, skipping")
          break
        }

        const organizationId = subscription.metadata.organization_id
        const subscriptionType = subscription.metadata.subscription_type
        const isTrial = subscription.trial_end ? subscription.trial_end > Math.floor(Date.now() / 1000) : false

        const { data: deletedSubs } = await supabaseAdmin
          .from("subscriptions")
          .delete()
          .eq("organization_id", organizationId)
          .select()

        console.log(
          "[v0] Deleted",
          deletedSubs?.length || 0,
          "existing subscriptions for organization:",
          organizationId,
        )

        const planName = subscriptionType.split("-")[0]

        console.log("[v0] Creating subscription with plan_name:", planName, "from type:", subscriptionType)

        const { error: subError } = await supabaseAdmin.from("subscriptions").insert({
          id: subscription.id,
          stripe_subscription_id: subscription.id,
          stripe_customer_id: subscription.customer as string,
          organization_id: organizationId,
          plan_name: planName,
          status: subscription.status,
          is_trial: isTrial,
          has_used_trial: true,
          trial_ends_at: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end || false,
          is_masteradmin_trial: false,
        })

        if (subError) {
          console.error("[v0] Error inserting subscription:", subError)
          throw subError
        }

        await logSubscriptionActivity({
          organizationId,
          subscriptionId: subscription.id,
          stripeSubscriptionId: subscription.id,
          eventType: isTrial ? "trial_started" : "created",
          toPlan: subscriptionType,
          toStatus: subscription.status,
          amount: (subscription.items.data[0]?.price?.unit_amount || 0) / 100,
          currency: subscription.currency,
          triggeredBy: "stripe_webhook",
          details: {
            trial_end: subscription.trial_end,
            billing_cycle: subscription.items.data[0]?.price?.recurring?.interval,
          },
        })

        console.log("[v0] Successfully created subscription from customer.subscription.created event")
        break
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription
        console.log("[v0] Subscription updated:", subscription.id)

        const { data: existingSubscription } = await supabaseAdmin
          .from("subscriptions")
          .select("plan_name, organization_id, status")
          .eq("stripe_subscription_id", subscription.id)
          .single()

        const newPlanName = subscription.metadata.plan_name || "growth-monthly"
        const isUpgrade =
          existingSubscription && existingSubscription.plan_name.includes("growth") && newPlanName.includes("scale")
        const isDowngrade =
          existingSubscription && existingSubscription.plan_name.includes("scale") && newPlanName.includes("growth")

        const { error } = await supabaseAdmin
          .from("subscriptions")
          .update({
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            plan_name: newPlanName,
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id)

        if (error) {
          console.error("[v0] Error updating subscription:", error)
          throw error
        }

        if (existingSubscription) {
          let eventType: any = "status_changed"
          if (isUpgrade) eventType = "upgraded"
          else if (isDowngrade) eventType = "downgraded"
          else if (existingSubscription.status !== subscription.status) eventType = "status_changed"

          await logSubscriptionActivity({
            organizationId: existingSubscription.organization_id,
            subscriptionId: subscription.id,
            stripeSubscriptionId: subscription.id,
            eventType,
            fromPlan: existingSubscription.plan_name,
            toPlan: newPlanName,
            fromStatus: existingSubscription.status,
            toStatus: subscription.status,
            amount: (subscription.items.data[0]?.price?.unit_amount || 0) / 100,
            currency: subscription.currency,
            triggeredBy: "stripe_webhook",
            details: {
              is_upgrade: isUpgrade,
              is_downgrade: isDowngrade,
              billing_cycle: subscription.items.data[0]?.price?.recurring?.interval,
            },
          })
        }

        if ((isUpgrade || isDowngrade) && existingSubscription) {
          try {
            const customer = (await stripe.customers.retrieve(subscription.customer as string)) as Stripe.Customer
            const amount = `${subscription.currency.toUpperCase() === "GBP" ? "£" : "$"}${((subscription.items.data[0]?.price?.unit_amount || 0) / 100).toFixed(2)}`

            if (customer.email) {
              if (isUpgrade) {
                // Send upgrade email
                const template = emailTemplates.subscriptionUpgraded({
                  customerName: customer.name || "Customer",
                  previousPlan: existingSubscription.plan_name.includes("growth") ? "Growth" : "Scale",
                  newPlan: "Scale",
                  amount: amount,
                  nextBillingDate: new Date(subscription.current_period_end * 1000).toISOString(),
                  newFeatures: [
                    "Increased to 20 templates (from 10)",
                    "Up to 75 team members (from 25)",
                    "Up to 7 admin/manager accounts (from 3)",
                    "Advanced team collaboration",
                    "Priority support",
                    "Custom branding options",
                  ],
                  quickActions: [
                    "Create more templates for your growing team",
                    "Invite additional team members",
                    "Add more managers to distribute admin work",
                    "Customize your branding in settings",
                  ],
                  dashboardUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/admin`,
                })

                await sendEmail(customer.email, template.subject, template.html)
                console.log("[v0] Upgrade email sent to:", customer.email)
              } else if (isDowngrade) {
                // Send downgrade email and handle data cleanup
                await handleSubscriptionDowngrade(existingSubscription.organization_id)

                const template = emailTemplates.subscriptionDowngraded({
                  customerName: customer.name || "Customer",
                  previousPlan: "Scale",
                  newPlan: "Growth",
                  amount: amount,
                  effectiveDate: new Date(subscription.current_period_start * 1000).toISOString(),
                  removedFeatures: [
                    "Extra templates beyond 10",
                    "Team members beyond 25",
                    "Admin/manager accounts beyond 3",
                  ],
                  dataRemoved: [
                    "Extra templates archived (kept first 10)",
                    "Extra team members removed (kept first 25)",
                    "Extra manager accounts removed (kept first 3)",
                  ],
                  retainedFeatures: [
                    "Unlimited reports and submissions",
                    "10 active templates",
                    "25 team members",
                    "3 admin/manager accounts",
                    "Contractor link sharing",
                    "Photo uploads",
                    "Custom branding",
                  ],
                  showUpgradeOption: true,
                  upgradeUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/admin/profile/billing`,
                })

                await sendEmail(customer.email, template.subject, template.html)
                console.log("[v0] Downgrade email sent to:", customer.email)
              }
            }
          } catch (emailError) {
            console.error("[v0] Failed to send plan change email:", emailError)
          }
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
        console.log("[v0] Subscription cancelled/deleted:", subscription.id)

        const { data: subData } = await supabaseAdmin
          .from("subscriptions")
          .select("organization_id, plan_name")
          .eq("stripe_subscription_id", subscription.id)
          .or(`id.eq.${subscription.id}`)
          .single()

        const { error } = await supabaseAdmin
          .from("subscriptions")
          .update({
            plan_name: "starter",
            status: "canceled",
            cancel_at_period_end: false,
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id)
          .or(`id.eq.${subscription.id}`)

        if (error) {
          console.error("[v0] Error cancelling subscription:", error)
          throw error
        }

        if (subData?.organization_id) {
          await logSubscriptionActivity({
            organizationId: subData.organization_id,
            subscriptionId: subscription.id,
            stripeSubscriptionId: subscription.id,
            eventType: "cancelled",
            fromPlan: subData.plan_name,
            toPlan: "starter",
            fromStatus: subscription.status,
            toStatus: "canceled",
            triggeredBy: "stripe_webhook",
            details: {
              reason: "Subscription period ended or cancelled by customer",
            },
          })

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

          const { data: teamMembers } = await supabaseAdmin
            .from("profiles")
            .select("id, created_at, role")
            .eq("organization_id", subData.organization_id)
            .eq("role", "staff")
            .order("created_at", { ascending: true })

          if (teamMembers && teamMembers.length > 5) {
            const membersToDelete = teamMembers.slice(5).map((m) => m.id)

            const { error: deleteMembersError } = await supabaseAdmin
              .from("profiles")
              .delete()
              .in("id", membersToDelete)

            if (deleteMembersError) {
              console.error("[v0] Error deleting team members:", deleteMembersError)
            } else {
              console.log("[v0] Deleted", membersToDelete.length, "team members")
            }
          }

          const { data: managers } = await supabaseAdmin
            .from("profiles")
            .select("id, created_at, role")
            .eq("organization_id", subData.organization_id)
            .eq("role", "manager")
            .order("created_at", { ascending: true })

          if (managers && managers.length > 0) {
            const managersToDelete = managers.map((m) => m.id)

            const { error: deleteManagersError } = await supabaseAdmin
              .from("profiles")
              .delete()
              .in("id", managersToDelete)

            if (deleteManagersError) {
              console.error("[v0] Error deleting managers:", deleteManagersError)
            } else {
              console.log("[v0] Deleted", managersToDelete.length, "manager accounts")
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
            status: "completed",
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

          const gracePeriodEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

          const { error: subError } = await supabaseAdmin
            .from("subscriptions")
            .update({
              status: "past_due",
              payment_failed_at: new Date().toISOString(),
              grace_period_ends_at: gracePeriodEnd.toISOString(),
              payment_retry_count: invoice.attempt_count || 1,
              updated_at: new Date().toISOString(),
            })
            .eq("id", invoice.subscription as string)

          if (subError) {
            console.error("[v0] Error updating subscription status:", subError)
          }

          if (invoice.customer_email) {
            try {
              const { data: orgData } = await supabaseAdmin
                .from("subscriptions")
                .select("organization_id")
                .eq("id", invoice.subscription as string)
                .single()

              const template = emailTemplates.paymentFailed({
                customerName: invoice.customer_name || "Customer",
                amount: `${invoice.currency === "usd" ? "$" : "£"}${((invoice.amount_due || 0) / 100).toFixed(2)}`,
                planName: invoice.lines.data[0]?.description || "Subscription",
                failureReason: invoice.last_finalization_error?.message || "Card was declined",
                retryDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                updatePaymentUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/admin/profile/billing`,
                gracePeriodDays: 7,
              })

              await sendEmail(invoice.customer_email, template.subject, template.html)
              console.log("[v0] Payment failure email sent to:", invoice.customer_email)
            } catch (emailError) {
              console.error("[v0] Failed to send payment failure email:", emailError)
            }
          }

          console.log("[v0] Set 7-day grace period for subscription due to payment failure:", invoice.subscription)
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
