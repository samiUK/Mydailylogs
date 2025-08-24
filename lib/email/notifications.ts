import { createClient } from "@/lib/supabase/server"

export class EmailNotificationService {
  private supabase

  constructor() {
    this.supabase = createClient()
  }

  async sendWelcomeEmail(userId: string) {
    try {
      // Get user profile and organization
      const { data: profile } = await this.supabase
        .from("profiles")
        .select(`
          email,
          full_name,
          organizations (
            name
          )
        `)
        .eq("id", userId)
        .single()

      if (!profile) return { success: false, error: "User not found" }

      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "welcome",
          to: profile.email,
          data: {
            userName: profile.full_name,
            organizationName: profile.organizations?.name || "Your Organization",
          },
        }),
      })

      return await response.json()
    } catch (error) {
      console.error("[v0] Welcome email error:", error)
      return { success: false, error: error.message }
    }
  }

  async sendTaskReminder(userId: string, taskId: string) {
    try {
      // Get user and task details
      const { data: assignment } = await this.supabase
        .from("template_assignments")
        .select(`
          profiles (
            email,
            full_name
          ),
          checklist_templates (
            name,
            deadline_date
          )
        `)
        .eq("assigned_to", userId)
        .eq("template_id", taskId)
        .single()

      if (!assignment) return { success: false, error: "Assignment not found" }

      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "task-reminder",
          to: assignment.profiles.email,
          data: {
            userName: assignment.profiles.full_name,
            taskName: assignment.checklist_templates.name,
            dueDate: new Date(assignment.checklist_templates.deadline_date).toLocaleDateString(),
          },
        }),
      })

      return await response.json()
    } catch (error) {
      console.error("[v0] Task reminder email error:", error)
      return { success: false, error: error.message }
    }
  }

  async sendOverdueNotification(userId: string, taskId: string, overdueDays: number) {
    try {
      // Similar to task reminder but for overdue tasks
      const { data: assignment } = await this.supabase
        .from("template_assignments")
        .select(`
          profiles (
            email,
            full_name
          ),
          checklist_templates (
            name
          )
        `)
        .eq("assigned_to", userId)
        .eq("template_id", taskId)
        .single()

      if (!assignment) return { success: false, error: "Assignment not found" }

      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "task-overdue",
          to: assignment.profiles.email,
          data: {
            userName: assignment.profiles.full_name,
            taskName: assignment.checklist_templates.name,
            overdueDays,
          },
        }),
      })

      return await response.json()
    } catch (error) {
      console.error("[v0] Overdue notification email error:", error)
      return { success: false, error: error.message }
    }
  }
}
