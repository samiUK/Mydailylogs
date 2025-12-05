import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
// import { sendEmail, emailTemplates } from "@/lib/email/resend"

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
        organization_id,
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

    let notificationsCreated = 0

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
        // Create in-app notification only (no email)
        const message =
          overdueTasks.length > 0
            ? `Task Digest: ${overdueTasks.length} overdue, ${upcomingTasks.length} upcoming`
            : `Task Reminder: ${upcomingTasks.length} task${upcomingTasks.length > 1 ? "s" : ""} due soon`

        await supabase.from("notifications").insert({
          user_id: userId,
          type: "daily_digest",
          message,
          is_read: false,
          created_at: new Date().toISOString(),
        })

        notificationsCreated++
        console.log(
          `[v0] Created in-app notification for ${member.email} (${upcomingTasks.length} upcoming, ${overdueTasks.length} overdue)`,
        )
      } catch (error) {
        console.error(`[v0] Failed to create notification for ${member.email}:`, error)
      }
    }

    return NextResponse.json({
      message: "Task reminder notifications created successfully (in-app only)",
      notifications_created: notificationsCreated,
      users: userTasksMap.size,
      total_assignments: upcomingAssignments.length,
      note: "Email notifications disabled to preserve quota for essential system operations",
    })
  } catch (error) {
    console.error("Error creating task reminders:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
