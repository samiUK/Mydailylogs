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

    console.log("[v0] Checking overdue tasks...")
    let markedOverdueCount = 0

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
      markedOverdueCount = incompleteTasks.length
      console.log(`[v0] Marked ${markedOverdueCount} overdue tasks`)
    }

    console.log("[v0] Starting smart cleanup of overdue tasks...")
    let deletedOverdueTasks = 0

    try {
      // Get all overdue tasks with their template recurrence info
      const { data: overdueTasks, error: fetchError } = await supabase
        .from("daily_checklists")
        .select(`
          id,
          date,
          template_id,
          organization_id,
          assigned_to,
          checklist_templates!inner(
            name,
            is_recurring,
            recurrence_type
          ),
          profiles!daily_checklists_assigned_to_fkey(
            first_name,
            last_name,
            full_name
          )
        `)
        .eq("status", "overdue")

      if (fetchError) {
        console.error("[v0] Error fetching overdue tasks:", fetchError)
      } else if (overdueTasks && overdueTasks.length > 0) {
        const tasksToDelete: string[] = []
        const deletedTasksInfo: any[] = []

        for (const task of overdueTasks) {
          const taskDate = new Date(task.date)
          const daysSinceOverdue = Math.floor((new Date(today).getTime() - taskDate.getTime()) / (1000 * 60 * 60 * 24))

          const template = task.checklist_templates

          if (!template.is_recurring) {
            // One-off tasks: delete immediately when overdue
            tasksToDelete.push(task.id)
            deletedTasksInfo.push({
              taskId: task.id,
              taskName: template.name,
              organizationId: task.organization_id,
              assignedTo: task.assigned_to,
              assignedToName: task.profiles?.full_name || `${task.profiles?.first_name} ${task.profiles?.last_name}`,
              dueDate: task.date,
              taskType: "one-off",
            })
            console.log(`[v0] Marking one-off task ${task.id} for deletion (overdue by ${daysSinceOverdue} days)`)
          } else {
            // Recurring tasks: keep until 1 day past next occurrence
            let deleteThreshold = 0
            switch (template.recurrence_type) {
              case "daily":
                deleteThreshold = 2 // Daily + 1 day grace
                break
              case "weekdays":
                deleteThreshold = 4 // Up to 3 days (Fri -> Mon) + 1 day grace
                break
              case "weekly":
                deleteThreshold = 8 // 7 days + 1 day grace
                break
              case "monthly":
                deleteThreshold = 32 // 31 days + 1 day grace
                break
              default:
                deleteThreshold = 2 // Default to 2 days
            }

            if (daysSinceOverdue >= deleteThreshold) {
              tasksToDelete.push(task.id)
              deletedTasksInfo.push({
                taskId: task.id,
                taskName: template.name,
                organizationId: task.organization_id,
                assignedTo: task.assigned_to,
                assignedToName: task.profiles?.full_name || `${task.profiles?.first_name} ${task.profiles?.last_name}`,
                dueDate: task.date,
                taskType: template.recurrence_type,
              })
              console.log(
                `[v0] Marking ${template.recurrence_type} recurring task ${task.id} for deletion (overdue by ${daysSinceOverdue} days, threshold: ${deleteThreshold})`,
              )
            }
          }
        }

        // Delete all marked tasks
        if (tasksToDelete.length > 0) {
          const { error: deleteError } = await supabase.from("daily_checklists").delete().in("id", tasksToDelete)

          if (deleteError) {
            console.error("[v0] Error deleting overdue tasks:", deleteError)
          } else {
            deletedOverdueTasks = tasksToDelete.length
            console.log(`[v0] Deleted ${deletedOverdueTasks} overdue tasks using smart cleanup logic`)

            console.log(`[v0] Creating notifications for ${deletedTasksInfo.length} deleted tasks...`)

            for (const taskInfo of deletedTasksInfo) {
              // Get admin users for this organization
              const { data: admins } = await supabase
                .from("profiles")
                .select("id")
                .eq("organization_id", taskInfo.organizationId)
                .eq("role", "admin")

              if (admins && admins.length > 0) {
                const notifications = admins.map((admin) => ({
                  user_id: admin.id,
                  organization_id: taskInfo.organizationId,
                  type: "task_auto_deleted",
                  message: `Task "${taskInfo.taskName}" was auto-deleted (overdue, not completed by ${taskInfo.assignedToName})`,
                  is_read: false,
                  created_at: new Date().toISOString(),
                }))

                const { error: notifError } = await supabase.from("notifications").insert(notifications)

                if (notifError) {
                  console.error(`[v0] Error creating notifications for deleted task ${taskInfo.taskId}:`, notifError)
                } else {
                  console.log(`[v0] Created ${notifications.length} notifications for deleted task ${taskInfo.taskId}`)
                }
              }
            }
          }
        } else {
          console.log("[v0] No overdue tasks meet deletion criteria yet")
        }
      } else {
        console.log("[v0] No overdue tasks found")
      }
    } catch (cleanupError) {
      console.error("[v0] Error during smart task cleanup:", cleanupError)
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
          const { data: unavailability } = await supabase
            .from("staff_unavailability")
            .select("id")
            .eq("staff_id", assignment.assigned_to)
            .eq("organization_id", template.organization_id)
            .lte("start_date", today)
            .gte("end_date", today)
            .single()

          if (unavailability) {
            console.log(
              `[v0] Skipping template ${template.id} for user ${assignment.assigned_to} - staff unavailable on ${today}`,
            )
            continue
          }

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
      expiredGracePeriods: 0,
      createdTasks,
      skippedTasks,
      deletedReports,
      cancelledJobs,
      expiredTestTrials,
      markedOverdue: markedOverdueCount,
      deletedOverdueTasks,
      trialRemindersSent: 0,
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
