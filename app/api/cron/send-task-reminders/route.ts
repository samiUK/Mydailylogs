import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { sendEmail, emailTemplates } from "@/lib/email/resend"

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createClient()

    // Get all pending assignments due within the next 3 days
    const threeDaysFromNow = new Date()
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)
    const today = new Date()

    const { data: upcomingAssignments } = await supabase
      .from("template_assignments")
      .select(
        `
        id,
        assigned_to,
        assigned_at,
        checklist_templates:template_id(
          id,
          name,
          description,
          specific_date,
          deadline_date
        ),
        assigned_to_profile:profiles!template_assignments_assigned_to_fkey(
          id,
          email,
          first_name,
          full_name
        ),
        assigned_by_profile:profiles!template_assignments_assigned_by_fkey(
          id,
          full_name,
          email
        )
      `,
      )
      .neq("status", "completed")
      .eq("is_active", true)

    if (!upcomingAssignments || upcomingAssignments.length === 0) {
      return NextResponse.json({ message: "No upcoming tasks to remind", sent: 0 })
    }

    const userTasksMap = new Map<string, { member: any; upcomingTasks: any[]; overdueTasks: any[] }>()

    for (const assignment of upcomingAssignments) {
      const template = assignment.checklist_templates
      if (!template) continue

      let dueDate: Date | null = null

      if (template.specific_date) {
        dueDate = new Date(template.specific_date)
      } else if (template.deadline_date) {
        dueDate = new Date(template.deadline_date)
      }

      if (!dueDate) continue

      const daysDiff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      const userId = assignment.assigned_to

      if (!userTasksMap.has(userId)) {
        userTasksMap.set(userId, {
          member: assignment.assigned_to_profile,
          upcomingTasks: [],
          overdueTasks: [],
        })
      }

      const userData = userTasksMap.get(userId)!

      // Add to upcoming or overdue arrays
      if (daysDiff > 0 && daysDiff <= 3) {
        userData.upcomingTasks.push({ template, dueDate, daysDiff, assigner: assignment.assigned_by_profile })
      } else if (daysDiff < 0) {
        const daysOverdue = Math.abs(daysDiff)
        userData.overdueTasks.push({ template, dueDate, daysOverdue })
      }
    }

    let remindersSent = 0

    for (const [userId, userData] of userTasksMap) {
      const { member, upcomingTasks, overdueTasks } = userData

      if (upcomingTasks.length === 0 && overdueTasks.length === 0) continue

      // Check if digest was already sent in last 24 hours
      const { data: recentDigest } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", userId)
        .eq("type", "daily_digest")
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .single()

      if (recentDigest) continue

      try {
        // Build email content
        let upcomingTasksHtml = ""
        if (upcomingTasks.length > 0) {
          upcomingTasksHtml = `
            <h3 style="color: #f59e0b; margin: 25px 0 15px 0;">📅 Upcoming Tasks (${upcomingTasks.length})</h3>
            <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              ${upcomingTasks
                .map(
                  (task) => `
                <div style="padding: 12px; margin: 8px 0; background-color: white; border-radius: 6px; border-left: 4px solid #f59e0b;">
                  <p style="margin: 0 0 8px 0;"><strong>${task.template.name}</strong></p>
                  ${task.template.description ? `<p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280;">${task.template.description}</p>` : ""}
                  <p style="margin: 0; font-size: 14px;">
                    <strong>Due:</strong> <span style="color: #dc2626;">${task.dueDate.toLocaleDateString()}</span> 
                    (${task.daysDiff} day${task.daysDiff > 1 ? "s" : ""} remaining)
                  </p>
                </div>
              `,
                )
                .join("")}
            </div>
          `
        }

        let overdueTasksHtml = ""
        if (overdueTasks.length > 0) {
          overdueTasksHtml = `
            <h3 style="color: #dc2626; margin: 25px 0 15px 0;">🚨 Overdue Tasks (${overdueTasks.length})</h3>
            <div style="background-color: #fee2e2; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              ${overdueTasks
                .map(
                  (task) => `
                <div style="padding: 12px; margin: 8px 0; background-color: white; border-radius: 6px; border-left: 4px solid #dc2626;">
                  <p style="margin: 0 0 8px 0;"><strong>${task.template.name}</strong></p>
                  <p style="margin: 0; font-size: 14px; color: #dc2626; font-weight: bold;">
                    ${task.daysOverdue} day${task.daysOverdue > 1 ? "s" : ""} overdue - Action required!
                  </p>
                </div>
              `,
                )
                .join("")}
            </div>
          `
        }

        const subject =
          overdueTasks.length > 0
            ? `Task Digest: ${overdueTasks.length} Overdue, ${upcomingTasks.length} Upcoming`
            : `Task Reminder: ${upcomingTasks.length} Task${upcomingTasks.length > 1 ? "s" : ""} Due Soon`

        // Create notification
        await supabase.from("notifications").insert({
          user_id: userId,
          type: "daily_digest",
          message: `Daily task digest: ${upcomingTasks.length} upcoming, ${overdueTasks.length} overdue`,
          is_read: false,
          created_at: new Date().toISOString(),
        })

        await sendEmail({
          to: member.email,
          subject,
          html: `
            ${emailTemplates.getEmailHeader()}
            <div style="padding: 30px; font-family: Arial, sans-serif; line-height: 1.6; color: #374151;">
              <h2 style="color: #1f2937; margin-bottom: 20px;">Your Daily Task Summary</h2>
              
              <p>Hi ${member.first_name || member.full_name || "Team Member"},</p>
              
              <p>Here's your daily summary of tasks:</p>
              
              ${overdueTasksHtml}
              ${upcomingTasksHtml}
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://mydaylogs.co.uk"}/staff" style="background-color: ${overdueTasks.length > 0 ? "#dc2626" : "#f59e0b"}; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">View All Tasks</a>
              </div>
              
              ${emailTemplates.getAutomatedEmailNotice()}
              
              <p style="font-size: 12px; color: #6b7280; margin-top: 20px;">
                You're receiving this digest once per day to minimize email clutter while keeping you on track.
              </p>
              
              <p>Best regards,<br>
              <strong>The MyDayLogs Team</strong></p>
            </div>
            ${emailTemplates.getEmailFooter()}
          `,
        })

        remindersSent++
        console.log(
          `[v0] Sent digest email to ${member.email} (${upcomingTasks.length} upcoming, ${overdueTasks.length} overdue)`,
        )
      } catch (error) {
        console.error(`[v0] Failed to send digest to ${member.email}:`, error)
      }
    }

    return NextResponse.json({
      message: "Task reminder digests sent successfully",
      sent: remindersSent,
      users: userTasksMap.size,
    })
  } catch (error) {
    console.error("Error sending task reminders:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
