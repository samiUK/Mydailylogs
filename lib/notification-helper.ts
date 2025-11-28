import { createClient } from "@/lib/supabase/server"
import { sendEmail, emailTemplates } from "@/lib/email/resend"

export interface NotificationData {
  userId: string
  userEmail: string
  userName: string // Now required - use full names
  type: "assignment" | "submission" | "reminder"
  message: string
  templateId?: string
  templateName?: string
  dueDate?: string
  assignerName?: string
  taskUrl?: string
}

/**
 * Creates an in-app notification for a user
 */
export async function createNotification(data: NotificationData) {
  const supabase = await createClient()

  const { error } = await supabase.from("notifications").insert({
    user_id: data.userId,
    type: data.type,
    message: data.message, // Message should already contain full name
    template_id: data.templateId,
    is_read: false,
    created_at: new Date().toISOString(),
  })

  if (error) {
    console.error("Failed to create notification:", error)
    return false
  }

  return true
}

/**
 * Sends an email notification to a user
 */
export async function sendEmailNotification(data: NotificationData) {
  try {
    if (data.type === "assignment" && data.templateName) {
      const taskTemplate = emailTemplates.taskAssignment({
        userName: data.userName,
        taskName: data.templateName,
        taskDescription: undefined,
        dueDate: data.dueDate,
        assignedBy: data.assignerName || "Administrator",
      })

      await sendEmail({
        to: data.userEmail,
        subject: taskTemplate.subject,
        html: taskTemplate.html,
      })
    }

    return true
  } catch (error) {
    console.error(`Failed to send email notification to ${data.userEmail}:`, error)
    return false
  }
}

/**
 * Creates both in-app and email notifications for a user
 */
export async function notifyUser(data: NotificationData) {
  const [inAppSuccess, emailSuccess] = await Promise.allSettled([createNotification(data), sendEmailNotification(data)])

  return {
    inApp: inAppSuccess.status === "fulfilled" && inAppSuccess.value,
    email: emailSuccess.status === "fulfilled" && emailSuccess.value,
  }
}
