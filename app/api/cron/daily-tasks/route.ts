import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { getSubscriptionLimits } from "@/lib/subscription-limits"
import { sendEmail } from "@/lib/email/smtp"

export const runtime = "nodejs"

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

    const supabase = await createClient()
    const today = new Date().toISOString().split("T")[0]

    console.log("[v0] Checking for expired masteradmin test trials...")
    let expiredTestTrials = 0

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
                
                <div style="background-color: #d1fae5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #059669;">
                  <h3 style="margin: 0 0 15px 0; color: #065f46;">Ready to Upgrade?</h3>
                  <p>Upgrade to a paid plan to unlock premium features:</p>
                  <ul style="margin: 10px 0;">
                    <li>More templates and team members</li>
                    <li>Task automation</li>
                    <li>Custom branding</li>
                    <li>Unlimited report history</li>
                  </ul>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${process.env.NEXT_PUBLIC_SITE_URL}/admin/billing" style="background-color: #059669; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Pricing & Upgrade</a>
                </div>
                
                <p>If you have any questions, please contact our support team at info@mydaylogs.co.uk.</p>
                
                <p>Best regards,<br>
                <strong>The MyDayLogs Team</strong></p>
              </div>
            `,
          })
        }

        expiredTestTrials++
      }
      console.log(`[v0] Expired ${expiredTestTrials} masteradmin test trials and downgraded to Starter`)
    }

    // Expire grace periods for failed payments (7 days after failure)
    console.log("[v0] Checking for expired grace periods...")
    let expiredGracePeriods = 0

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
                
                <div style="background-color: #fee2e2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
                  <h3 style="margin: 0 0 15px 0; color: #7f1d1d;">Your Account Status</h3>
                  <p><strong>Status:</strong> Downgraded to Free Starter Plan</p>
                  <p><strong>Active Templates:</strong> Limited to 3</p>
                  <p><strong>Report History:</strong> Last 50 reports only</p>
                </div>
                
                <p><strong>Want to reactivate your premium subscription?</strong></p>
                <p>Visit your billing page and update your payment method to restore full access to all premium features.</p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${process.env.NEXT_PUBLIC_SITE_URL}/admin/billing" style="background-color: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">Update Payment Method</a>
                </div>
                
                <p>If you have any questions, please contact our support team at info@mydaylogs.co.uk.</p>
                
                <p>Best regards,<br>
                <strong>The MyDayLogs Team</strong></p>
              </div>
            `,
          })
        }

        expiredGracePeriods++
      }
      console.log(`[v0] Expired ${expiredGracePeriods} grace periods and downgraded to Starter`)
    }

    console.log("[v0] Marking old incomplete daily tasks as overdue...")
    let markedOverdue = 0

    const { data: incompleteTasks, error: incompleteError } = await supabase
      .from("daily_checklists")
      .update({
        status: "overdue",
        updated_at: new Date().toISOString(),
      })
      .eq("status", "pending")
      .lt("date", today)
      .select("id")

    if (incompleteError) {
      console.error("[v0] Error marking tasks as overdue:", incompleteError)
    } else if (incompleteTasks) {
      markedOverdue = incompleteTasks.length
      console.log(`[v0] Marked ${markedOverdue} incomplete daily tasks as overdue`)
    }

    console.log("[v0] Deleting overdue tasks older than 24 hours...")
    let deletedOverdueTasks = 0

    const twoDaysAgo = new Date()
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
    const twoDaysAgoDate = twoDaysAgo.toISOString().split("T")[0]

    const { data: deletedTasks, error: deleteError } = await supabase
      .from("daily_checklists")
      .delete()
      .eq("status", "overdue")
      .lt("date", twoDaysAgoDate)
      .select("id")

    if (deleteError) {
      console.error("[v0] Error deleting old overdue tasks:", deleteError)
    } else if (deletedTasks) {
      deletedOverdueTasks = deletedTasks.length
      console.log(`[v0] Deleted ${deletedOverdueTasks} overdue tasks that were 24+ hours old`)
    }

    // Daily automated task creation
    console.log(`[v0] Starting automated task creation for ${today}`)

    const { data: templates, error: templatesError } = await supabase
      .from("checklist_templates")
      .select(`
        id,
        name,
        organization_id,
        is_recurring,
        recurrence_type,
        created_at,
        template_assignments!inner(
          id,
          assigned_to,
          is_active,
          profiles!inner(id, organization_id)
        )
      `)
      .eq("is_recurring", true)
      .eq("is_active", true)
      .eq("template_assignments.is_active", true)
      .in("recurrence_type", ["daily", "weekdays", "weekly", "monthly"])

    if (templatesError) {
      console.error("[v0] Error fetching templates:", templatesError)
      return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 })
    }

    let createdTasks = 0
    let skippedTasks = 0
    const errors: string[] = []

    for (const template of templates || []) {
      try {
        const limits = await getSubscriptionLimits(template.organization_id)

        if (!limits.hasTaskAutomation) {
          console.log(
            `[v0] Skipping template ${template.id} - organization ${template.organization_id} doesn't have task automation feature`,
          )
          skippedTasks++
          continue
        }

        const shouldRunToday = await checkIfShouldRunToday(template, today, supabase)

        if (!shouldRunToday) {
          console.log(`[v0] Skipping template ${template.id} - not scheduled for today`)
          continue
        }

        for (const assignment of template.template_assignments) {
          const { data: existingChecklist } = await supabase
            .from("daily_checklists")
            .select("id")
            .eq("template_id", template.id)
            .eq("assigned_to", assignment.assigned_to)
            .eq("date", today)
            .single()

          if (existingChecklist) {
            console.log(
              `[v0] Daily checklist already exists for template ${template.id}, user ${assignment.assigned_to}`,
            )
            continue
          }

          const { error: createError } = await supabase.from("daily_checklists").insert({
            template_id: template.id,
            assigned_to: assignment.assigned_to,
            date: today,
            status: "pending",
            organization_id: assignment.profiles.organization_id,
          })

          if (createError) {
            errors.push(
              `Failed to create task for template ${template.id}, user ${assignment.assigned_to}: ${createError.message}`,
            )
          } else {
            createdTasks++
            console.log(`[v0] Created daily checklist for template ${template.id}, user ${assignment.assigned_to}`)
          }
        }
      } catch (error) {
        errors.push(`Error processing template ${template.id}: ${error}`)
      }
    }

    console.log(
      `[v0] Automated task creation completed. Created ${createdTasks} tasks, skipped ${skippedTasks} (no task automation), with ${errors.length} errors`,
    )

    console.log("[v0] Starting old report cleanup...")
    let deletedReports = 0

    try {
      // Get all organizations with their subscription tiers
      const { data: orgs } = await supabase.from("organizations").select("organization_id, subscription_tier")

      for (const org of orgs || []) {
        // Determine retention period: 30 days for Starter, 90 days for Growth/Scale
        const retentionDays = org.subscription_tier === "starter" ? 30 : 90
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

        const { data: oldReports, error: fetchError } = await supabase
          .from("submitted_reports")
          .select("id")
          .eq("organization_id", org.organization_id)
          .lt("submitted_at", cutoffDate.toISOString())

        if (fetchError) {
          console.error(`[v0] Error fetching old reports for org ${org.organization_id}:`, fetchError)
          continue
        }

        if (oldReports && oldReports.length > 0) {
          const { error: deleteError } = await supabase
            .from("submitted_reports")
            .delete()
            .eq("organization_id", org.organization_id)
            .lt("submitted_at", cutoffDate.toISOString())

          if (deleteError) {
            console.error(`[v0] Error deleting old reports for org ${org.organization_id}:`, deleteError)
          } else {
            deletedReports += oldReports.length
            console.log(`[v0] Deleted ${oldReports.length} old reports from org ${org.organization_id}`)
          }
        }
      }

      console.log(`[v0] Old report cleanup completed. Deleted ${deletedReports} reports.`)
    } catch (cleanupError) {
      console.error("[v0] Error during report cleanup:", cleanupError)
    }

    console.log("[v0] Starting auto-cancel of overdue one-off and deadline jobs...")
    let cancelledJobs = 0

    try {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayDate = yesterday.toISOString().split("T")[0]

      // Cancel specific_date assignments that are overdue (past their specific date)
      const { data: overdueSpecificDate, error: specificDateError } = await supabase
        .from("template_assignments")
        .update({
          is_active: false,
          status: "cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("schedule_type", "specific_date")
        .eq("is_active", true)
        .lt("specific_date", today)
        .select("id")

      if (specificDateError) {
        console.error("[v0] Error cancelling overdue specific_date jobs:", specificDateError)
      } else if (overdueSpecificDate) {
        cancelledJobs += overdueSpecificDate.length
        console.log(`[v0] Cancelled ${overdueSpecificDate.length} overdue specific_date assignments`)
      }

      // Cancel deadline assignments that are overdue (past their deadline)
      const { data: overdueDeadline, error: deadlineError } = await supabase
        .from("template_assignments")
        .update({
          is_active: false,
          status: "cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("schedule_type", "deadline")
        .eq("is_active", true)
        .lt("deadline_date", today)
        .select("id")

      if (deadlineError) {
        console.error("[v0] Error cancelling overdue deadline jobs:", deadlineError)
      } else if (overdueDeadline) {
        cancelledJobs += overdueDeadline.length
        console.log(`[v0] Cancelled ${overdueDeadline.length} overdue deadline assignments`)
      }

      console.log(`[v0] Auto-cancel completed. Total cancelled jobs: ${cancelledJobs}`)
    } catch (cancelError) {
      console.error("[v0] Error during auto-cancel:", cancelError)
    }

    return NextResponse.json({
      success: true,
      date: today,
      expiredGracePeriods,
      createdTasks,
      skippedTasks,
      deletedReports,
      cancelledJobs,
      expiredTestTrials,
      markedOverdue,
      deletedOverdueTasks,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error("[v0] Automated task creation failed:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function checkIfShouldRunToday(template: any, today: string, supabase: any): Promise<boolean> {
  const todayDate = new Date(today)
  const dayOfWeek = todayDate.getDay() // 0 = Sunday, 6 = Saturday

  const { data: organization } = await supabase
    .from("organizations")
    .select("business_hours")
    .eq("organization_id", template.organization_id)
    .single()

  if (organization?.business_hours) {
    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
    const dayName = dayNames[dayOfWeek]
    const dayHours = organization.business_hours[dayName]

    if (dayHours && !dayHours.enabled) {
      console.log(`[v0] Skipping template ${template.id} - business closed on ${dayName}`)
      return false
    }
  }

  const { data: holidays } = await supabase
    .from("holidays")
    .select("date")
    .eq("organization_id", template.organization_id)
    .eq("date", today)

  if (holidays && holidays.length > 0) {
    console.log(`[v0] Skipping template ${template.id} - today is a holiday`)
    return false
  }

  const { data: exclusions } = await supabase
    .from("template_schedule_exclusions")
    .select("*")
    .eq("template_id", template.id)

  if (exclusions && exclusions.length > 0) {
    const exclusion = exclusions[0]

    // Check if weekends are excluded
    if (exclusion.exclude_weekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
      console.log(`[v0] Skipping template ${template.id} - weekends excluded`)
      return false
    }

    // Check if today is in excluded dates
    if (exclusion.excluded_dates && exclusion.excluded_dates.includes(today)) {
      console.log(`[v0] Skipping template ${template.id} - today is excluded`)
      return false
    }
  }

  switch (template.recurrence_type) {
    case "daily":
      return true
    case "weekdays":
      // Monday = 1, Friday = 5, Saturday = 6, Sunday = 0
      return dayOfWeek >= 1 && dayOfWeek <= 5
    case "weekly":
      // Run on the same day of week as created
      const createdDate = new Date(template.created_at)
      return todayDate.getDay() === createdDate.getDay()
    case "monthly":
      // Run on the same date of month as created
      const createdDay = new Date(template.created_at).getDate()
      return todayDate.getDate() === createdDay
    default:
      return false
  }
}
