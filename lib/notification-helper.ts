import { createClient } from "@/lib/supabase/server"
import { sendEmail } from "@/lib/email/smtp"

export interface NotificationData {
  userId: string
  userEmail: string
  userName: string
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
    message: data.message,
    template_id: data.templateId,
    is_read: false,
    created_at: new Date().toISOString(),
  })

  if (error) {
    console.error("[v0] Failed to create notification:", error)
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
      await sendEmail({
        to: data.userEmail,
        ...sendEmail.templates.taskAssignment({
          assigneeName: data.userName,
          assignerName: data.assignerName || "Administrator",
          taskName: data.templateName,
          dueDate: data.dueDate,
          taskUrl: data.taskUrl || `${process.env.NEXT_PUBLIC_SITE_URL || "https://mydaylogs.co.uk"}/staff`,
        }),
      })
    }

    console.log(`[v0] Sent ${data.type} email notification to ${data.userEmail}`)
    return true
  } catch (error) {
    console.error(`[v0] Failed to send email notification to ${data.userEmail}:`, error)
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
