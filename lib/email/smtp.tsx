import nodemailer from "nodemailer"

interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
  attachments?: Array<{
    filename: string
    content: Buffer
    contentType: string
  }>
}

interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
}

export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  try {
    console.log("[v0] Creating email transporter...")

    const transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number.parseInt(process.env.SMTP_PORT || "587"),
      secure: false,
      auth: {
        user: process.env.SMTP_USER || "info@mydaylogs.co.uk",
        pass: process.env.SMTP_PASSWORD || "",
      },
    })

    console.log("[v0] Sending email to:", options.to)

    const result = await transporter.sendMail({
      from: `"MyDayLogs" <${process.env.SMTP_USER || "info@mydaylogs.co.uk"}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      attachments: options.attachments,
    })

    console.log("[v0] Email sent successfully:", result.messageId)

    return {
      success: true,
      messageId: result.messageId,
    }
  } catch (error) {
    console.error("[v0] Email sending error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

export const emailTemplates = {
  welcome: (userName: string, organizationName: string) => ({
    subject: `Welcome to ${organizationName} - MyDayLogs`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1DB584;">Welcome to MyDayLogs!</h2>
        <p>Hi ${userName},</p>
        <p>Welcome to ${organizationName} on MyDayLogs! We're excited to have you on board.</p>
        <p>You can now start managing your daily tasks and collaborate with your team.</p>
        <p>Best regards,<br>The MyDayLogs Team</p>
      </div>
    `,
    text: `Welcome to MyDayLogs! Hi ${userName}, Welcome to ${organizationName} on MyDayLogs! We're excited to have you on board.`,
  }),

  taskReminder: (userName: string, taskName: string, dueDate: string) => ({
    subject: `Task Reminder: ${taskName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1DB584;">Task Reminder</h2>
        <p>Hi ${userName},</p>
        <p>This is a reminder that your task "<strong>${taskName}</strong>" is due on ${dueDate}.</p>
        <p>Please make sure to complete it on time.</p>
        <p>Best regards,<br>The MyDayLogs Team</p>
      </div>
    `,
    text: `Task Reminder: Hi ${userName}, This is a reminder that your task "${taskName}" is due on ${dueDate}.`,
  }),

  taskOverdue: (userName: string, taskName: string, overdueDays: number) => ({
    subject: `Overdue Task: ${taskName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ef4444;">Overdue Task</h2>
        <p>Hi ${userName},</p>
        <p>Your task "<strong>${taskName}</strong>" is now ${overdueDays} day(s) overdue.</p>
        <p>Please complete it as soon as possible.</p>
        <p>Best regards,<br>The MyDayLogs Team</p>
      </div>
    `,
    text: `Overdue Task: Hi ${userName}, Your task "${taskName}" is now ${overdueDays} day(s) overdue.`,
  }),

  feedback: (subject: string, feedback: string, userEmail: string, timestamp: string) => ({
    subject: `User Feedback: ${subject}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1DB584;">New User Feedback</h2>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Subject:</strong> ${subject}</p>
          <p><strong>From:</strong> ${userEmail}</p>
          <p><strong>Submitted:</strong> ${new Date(timestamp).toLocaleString()}</p>
        </div>
        <div style="background: white; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <h3>Feedback:</h3>
          <p style="white-space: pre-wrap;">${feedback}</p>
        </div>
        <p style="margin-top: 20px; color: #6b7280; font-size: 14px;">
          This feedback was submitted through the MyDayLogs platform.
        </p>
      </div>
    `,
    text: `New User Feedback\n\nSubject: ${subject}\nFrom: ${userEmail}\nSubmitted: ${new Date(timestamp).toLocaleString()}\n\nFeedback:\n${feedback}`,
  }),
}
