import nodemailer from "nodemailer"

const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number.parseInt(process.env.SMTP_PORT || "587"),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER || "info@mydaylogs.co.uk",
      pass: process.env.SMTP_PASSWORD,
    },
  })
}

export const sendEmail = async ({
  to,
  subject,
  html,
  text,
}: {
  to: string
  subject: string
  html: string
  text?: string
}) => {
  try {
    const transporter = createTransporter()

    const mailOptions = {
      from: `"MyDayLogs" <${process.env.SMTP_USER || "info@mydaylogs.co.uk"}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ""), // Strip HTML for text version
    }

    const result = await transporter.sendMail(mailOptions)

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
        <p>Welcome to ${organizationName}'s MyDayLogs platform. You can now start managing your daily tasks and compliance requirements.</p>
        <p>Get started by logging into your dashboard and exploring the available features.</p>
        <p>Best regards,<br>The MyDayLogs Team</p>
      </div>
    `,
  }),

  taskReminder: (userName: string, taskName: string, dueDate: string) => ({
    subject: `Task Reminder: ${taskName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1DB584;">Task Reminder</h2>
        <p>Hi ${userName},</p>
        <p>This is a reminder that you have a task due soon:</p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <strong>Task:</strong> ${taskName}<br>
          <strong>Due Date:</strong> ${dueDate}
        </div>
        <p>Please complete this task before the due date.</p>
        <p>Best regards,<br>The MyDayLogs Team</p>
      </div>
    `,
  }),

  taskOverdue: (userName: string, taskName: string, overdueDays: number) => ({
    subject: `Overdue Task: ${taskName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Task Overdue</h2>
        <p>Hi ${userName},</p>
        <p>The following task is now overdue:</p>
        <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <strong>Task:</strong> ${taskName}<br>
          <strong>Overdue by:</strong> ${overdueDays} day${overdueDays > 1 ? "s" : ""}
        </div>
        <p>Please complete this task as soon as possible.</p>
        <p>Best regards,<br>The MyDayLogs Team</p>
      </div>
    `,
  }),
}
