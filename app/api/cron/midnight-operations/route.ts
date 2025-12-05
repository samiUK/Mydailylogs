import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"
import { sendEmail } from "@/lib/email/smtp"
import { handleSubscriptionDowngrade } from "@/lib/subscription-limits"

export const runtime = "nodejs"
export const maxDuration = 60

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!cronSecret) {
      console.warn("[v0] CRON_SECRET not set - running without authentication (development mode)")
    }

    console.log("[v0] ========== MIDNIGHT OPERATIONS STARTED ==========")
    const startTime = Date.now()

    const supabase = await createClient()
    const adminSupabase = createAdminClient()
    const today = new Date().toISOString().split("T")[0]

    const results = {
      expiredTestTrials: 0,
      expiredGracePeriods: 0,
      expiredSubscriptions: 0,
      markedOverdue: 0,
      deletedOverdueTasks: 0,
      createdTasks: 0,
      skippedTasks: 0,
      deletedReports: 0,
      deletedPhotos: 0,
      deletedLogs: 0,
      cancelledJobs: 0,
      errors: [] as string[],
    }

    console.log("[v0] === SECTION 1: Checking expired test trials ===")
    try {
      const { data: expiredTrials } = await supabase
        .from("subscriptions")
        .select("id, plan_name, organization_id, organizations(name), profiles(email, first_name)")
        .eq("is_masteradmin_trial", true)
        .eq("status", "active")
        .lt("trial_ends_at", new Date().toISOString())

      if (expiredTrials && expiredTrials.length > 0) {
        for (const trial of expiredTrials) {
          await supabase
            .from("subscriptions")
            .update({
              plan_name: "starter",
              status: "active",
              is_trial: false,
              is_masteradmin_trial: false,
              trial_ends_at: null,
              current_period_start: new Date().toISOString(),
              current_period_end: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", trial.id)

          if (trial.profiles?.email) {
            await sendEmail(trial.profiles.email, {
              subject: "Test Trial Ended - Downgraded to Starter Plan",
              html: `
                <div style="padding: 30px; font-family: Arial, sans-serif; line-height: 1.6; color: #374151;">
                  <h2 style="color: #059669; margin-bottom: 20px;">Your Test Trial Has Ended</h2>
                  <p>Hi ${trial.profiles.first_name || "there"},</p>
                  <p>Your ${trial.plan_name} test trial for <strong>${trial.organizations?.name}</strong> has ended and your account has been downgraded to the free Starter plan.</p>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${process.env.NEXT_PUBLIC_SITE_URL}/admin/billing" style="background-color: #059669; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Pricing & Upgrade</a>
                  </div>
                  <p>Best regards,<br><strong>The MyDayLogs Team</strong></p>
                </div>
              `,
            })
          }
          results.expiredTestTrials++
        }
        console.log(`[v0] ✓ Expired ${results.expiredTestTrials} masteradmin test trials`)
      }
    } catch (error) {
      results.errors.push(`Section 1 error: ${error}`)
      console.error("[v0] ✗ Section 1 failed:", error)
    }

    console.log("[v0] === SECTION 2: Checking grace periods and subscriptions ===")
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const { data: expiredSubs } = await supabase
        .from("subscriptions")
        .select("id, plan_name, organization_id, organizations(name), profiles(email, first_name)")
        .eq("status", "past_due")
        .lt("payment_failed_at", sevenDaysAgo)

      if (expiredSubs && expiredSubs.length > 0) {
        for (const sub of expiredSubs) {
          await supabase
            .from("subscriptions")
            .update({
              status: "canceled",
              updated_at: new Date().toISOString(),
            })
            .eq("id", sub.id)

          if (sub.profiles?.email) {
            await sendEmail(sub.profiles.email, {
              subject: "Subscription Canceled - Downgraded to Starter Plan",
              html: `
                <div style="padding: 30px; font-family: Arial, sans-serif; line-height: 1.6; color: #374151;">
                  <h2 style="color: #ef4444; margin-bottom: 20px;">Your Subscription Has Been Canceled</h2>
                  <p>Hi ${sub.profiles.first_name || "there"},</p>
                  <p>Your ${sub.plan_name} subscription for <strong>${sub.organizations?.name}</strong> has been canceled due to non-payment after the 7-day grace period.</p>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${process.env.NEXT_PUBLIC_SITE_URL}/admin/billing" style="background-color: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">Update Payment Method</a>
                  </div>
                  <p>Best regards,<br><strong>The MyDayLogs Team</strong></p>
                </div>
              `,
            })
          }
          results.expiredGracePeriods++
        }
        console.log(`[v0] ✓ Expired ${results.expiredGracePeriods} grace periods`)
      }

      // Check for expired/cancelled subscriptions needing downgrade
      const now = new Date()
      const { data: expiredSubscriptions } = await supabase
        .from("subscriptions")
        .select("organization_id, plan_name, status")
        .or(`status.eq.cancelled,current_period_end.lt.${now.toISOString()}`)

      if (expiredSubscriptions && expiredSubscriptions.length > 0) {
        for (const subscription of expiredSubscriptions) {
          const { data: activeSubscription } = await supabase
            .from("subscriptions")
            .select("plan_name")
            .eq("organization_id", subscription.organization_id)
            .eq("status", "active")
            .single()

          if (!activeSubscription) {
            await handleSubscriptionDowngrade(subscription.organization_id)
            await supabase
              .from("subscriptions")
              .update({ status: "expired" })
              .eq("organization_id", subscription.organization_id)
              .eq("status", "cancelled")
            results.expiredSubscriptions++
          }
        }
        console.log(`[v0] ✓ Processed ${results.expiredSubscriptions} expired subscriptions`)
      }
    } catch (error) {
      results.errors.push(`Section 2 error: ${error}`)
      console.error("[v0] ✗ Section 2 failed:", error)
    }

    console.log("[v0] ========== MIDNIGHT OPERATIONS ENDED ==========")
    console.log(`[v0] Total time taken: ${Date.now() - startTime}ms`)
    console.log(`[v0] Errors encountered: ${results.errors.length}`)

    return NextResponse.json(results)
  } catch (error) {
    console.error("[v0] ✗ An unexpected error occurred:", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}
