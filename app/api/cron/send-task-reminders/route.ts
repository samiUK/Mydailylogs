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

    let remindersSent = 0

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

      // Check if due date is within next 3 days
      const daysDiff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

      // Send reminder if due in 3 days or less (but not overdue)
      if (daysDiff > 0 && daysDiff <= 3) {
        const member = assignment.assigned_to_profile
        const assigner = assignment.assigned_by_profile

        // Check if reminder was already sent in last 24 hours
        const { data: recentNotif } = await supabase
          .from("notifications")
          .select("id")
          .eq("user_id", assignment.assigned_to)
          .eq("template_id", template.id)
          .eq("type", "reminder")
          .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .single()

        if (recentNotif) continue // Already sent recently

        try {
          // Create notification
          await supabase.from("notifications").insert({
            user_id: assignment.assigned_to,
            type: "reminder",
            message: `Reminder: "${template.name}" is due in ${daysDiff} day${daysDiff > 1 ? "s" : ""} (${dueDate.toLocaleDateString()})`,
            template_id: template.id,
            is_read: false,
            created_at: new Date().toISOString(),
          })

          await sendEmail({
            to: member.email,
            subject: `Reminder: Task Due in ${daysDiff} Day${daysDiff > 1 ? "s" : ""} - ${template.name}`,
            html: `
              ${emailTemplates.getEmailHeader()}
              <div style="padding: 30px; font-family: Arial, sans-serif; line-height: 1.6; color: #374151;">
                <h2 style="color: #f59e0b; margin-bottom: 20px;">📅 Task Reminder</h2>
                
                <p>Hi ${member.first_name || member.full_name || "Team Member"},</p>
                
                <p>This is a friendly reminder that you have an upcoming task due soon.</p>
                
                <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                  <h3 style="margin: 0 0 15px 0; color: #92400e;">Task Details</h3>
                  <p><strong>Task:</strong> ${template.name}</p>
                  ${template.description ? `<p><strong>Description:</strong> ${template.description}</p>` : ""}
                  <p><strong>Due Date:</strong> <span style="color: #dc2626; font-weight: bold;">${dueDate.toLocaleDateString()}</span></p>
                  <p><strong>Days Remaining:</strong> <span style="color: #dc2626; font-weight: bold;">${daysDiff} day${daysDiff > 1 ? "s" : ""}</span></p>
                  <p><strong>Assigned by:</strong> ${assigner?.full_name || assigner?.email || "Your Manager"}</p>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://mydaylogs.co.uk"}/staff" style="background-color: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">Complete Task Now</a>
                </div>
                
                ${emailTemplates.getAutomatedEmailNotice()}
                
                <p>Best regards,<br>
                <strong>The MyDayLogs Team</strong></p>
              </div>
              ${emailTemplates.getEmailFooter()}
            `,
          })

          remindersSent++
          console.log(`[v0] Sent reminder email to ${member.email} for task: ${template.name}`)
        } catch (error) {
          console.error(`[v0] Failed to send reminder to ${member.email}:`, error)
        }
      }

      if (daysDiff < 0) {
        const member = assignment.assigned_to_profile
        const daysOverdue = Math.abs(daysDiff)

        // Check if overdue reminder was sent in last 24 hours
        const { data: recentOverdueNotif } = await supabase
          .from("notifications")
          .select("id")
          .eq("user_id", assignment.assigned_to)
          .eq("template_id", template.id)
          .eq("type", "overdue")
          .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .single()

        if (recentOverdueNotif) continue

        try {
          await supabase.from("notifications").insert({
            user_id: assignment.assigned_to,
            type: "overdue",
            message: `OVERDUE: "${template.name}" was due ${daysOverdue} day${daysOverdue > 1 ? "s" : ""} ago. Please complete immediately.`,
            template_id: template.id,
            is_read: false,
            created_at: new Date().toISOString(),
          })

          await sendEmail({
            to: member.email,
            subject: `🚨 OVERDUE: ${template.name} - Action Required`,
            html: `
              ${emailTemplates.getEmailHeader()}
              <div style="padding: 30px; font-family: Arial, sans-serif; line-height: 1.6; color: #374151;">
                <h2 style="color: #dc2626; margin-bottom: 20px;">🚨 Overdue Task Alert</h2>
                
                <p>Hi ${member.first_name || member.full_name || "Team Member"},</p>
                
                <p style="color: #dc2626; font-weight: bold;">This is an urgent notification that you have an overdue task that requires immediate attention.</p>
                
                <div style="background-color: #fee2e2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
                  <h3 style="margin: 0 0 15px 0; color: #991b1b;">Task Details</h3>
                  <p><strong>Task:</strong> ${template.name}</p>
                  ${template.description ? `<p><strong>Description:</strong> ${template.description}</p>` : ""}
                  <p><strong>Was Due:</strong> <span style="color: #dc2626; font-weight: bold;">${dueDate.toLocaleDateString()}</span></p>
                  <p><strong>Days Overdue:</strong> <span style="color: #dc2626; font-weight: bold; font-size: 18px;">${daysOverdue} day${daysOverdue > 1 ? "s" : ""}</span></p>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://mydaylogs.co.uk"}/staff" style="background-color: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">Complete Task Immediately</a>
                </div>
                
                ${emailTemplates.getAutomatedEmailNotice()}
                
                <p>Best regards,<br>
                <strong>The MyDayLogs Team</strong></p>
              </div>
              ${emailTemplates.getEmailFooter()}
            `,
          })

          remindersSent++
          console.log(`[v0] Sent overdue reminder to ${member.email} for task: ${template.name}`)
        } catch (error) {
          console.error(`[v0] Failed to send overdue reminder to ${member.email}:`, error)
        }
      }
    }

    return NextResponse.json({
      message: "Task reminders sent successfully",
      sent: remindersSent,
      checked: upcomingAssignments.length,
    })
  } catch (error) {
    console.error("Error sending task reminders:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
