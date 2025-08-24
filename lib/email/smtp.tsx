import nodemailer from "nodemailer"

const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST || "smtp.supabase.co", // Supabase SMTP host
  port: Number.parseInt(process.env.SMTP_PORT || "587"),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || "info@mydaylogs.co.uk",
    pass: process.env.SMTP_PASSWORD, // Your SMTP password from Supabase
  },
})

export interface EmailOptions {
  to: string | string[]
  subject: string
  html?: string
  text?: string
  from?: string
}

export async function sendEmail(options: EmailOptions) {
  try {
    const mailOptions = {
      from: options.from || "MyDayLogs <info@mydaylogs.co.uk>",
      to: Array.isArray(options.to) ? options.to.join(", ") : options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    }

    const result = await transporter.sendMail(mailOptions)
    console.log("[v0] Email sent successfully:", result.messageId)
    return { success: true, messageId: result.messageId }
  } catch (error) {
    console.error("[v0] Email sending failed:", error)
    return { success: false, error: error.message }
  }
}

export const emailTemplates = {
  welcome: (userName: string, organizationName: string) => ({
    subject: `Welcome to ${organizationName} - MyDayLogs`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1DB584;">Welcome to MyDayLogs!</h2>
        <p>Hi ${userName},</p>
        <p>Welcome to ${organizationName}'s MyDayLogs platform. You can now access your dashboard and start managing your daily tasks.</p>
        <p>If you have any questions, feel free to reach out to our support team.</p>
        <p>Best regards,<br>The MyDayLogs Team</p>
      </div>
    `,
    text: `Welcome to MyDayLogs! Hi ${userName}, welcome to ${organizationName}'s MyDayLogs platform.`,
  }),

  taskReminder: (userName: string, taskName: string, dueDate: string) => ({
    subject: `Task Reminder: ${taskName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1DB584;">Task Reminder</h2>
        <p>Hi ${userName},</p>
        <p>This is a reminder that you have a task due:</p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <strong>${taskName}</strong><br>
          Due: ${dueDate}
        </div>
        <p>Please complete this task as soon as possible.</p>
        <p>Best regards,<br>The MyDayLogs Team</p>
      </div>
    `,
    text: `Task Reminder: ${taskName} is due on ${dueDate}. Hi ${userName}, please complete this task as soon as possible.`,
  }),

  taskOverdue: (userName: string, taskName: string, overdueDays: number) => ({
    subject: `Overdue Task: ${taskName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Overdue Task Alert</h2>
        <p>Hi ${userName},</p>
        <p>The following task is now <strong>${overdueDays} day(s) overdue</strong>:</p>
        <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <strong>${taskName}</strong><br>
          Overdue by: ${overdueDays} day(s)
        </div>
        <p>Please complete this task immediately.</p>
        <p>Best regards,<br>The MyDayLogs Team</p>
      </div>
    `,
    text: `Overdue Task: ${taskName} is ${overdueDays} day(s) overdue. Please complete immediately.`,
  }),
}
