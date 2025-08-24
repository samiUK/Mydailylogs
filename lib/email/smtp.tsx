import nodemailer from "nodemailer"

interface EmailData {
  name?: string
  email?: string
  subject?: string
  message?: string
  page_url?: string
  attachments?: any[]
  user_id?: string
  [key: string]: any
}

const getBrandedEmailHeader = () => `
  <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-bottom: 2px solid #10b981;">
    <img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-1JDJlmOQGCSfgwVhWApOUjNbtQ8JsY.png" alt="MyDayLogs" style="height: 40px; margin-bottom: 10px;">
    <h1 style="color: #10b981; font-family: Arial, sans-serif; font-size: 24px; margin: 0;">MyDayLogs</h1>
    <p style="color: #6b7280; font-family: Arial, sans-serif; font-size: 14px; margin: 5px 0 0 0;">Professional Task Management Platform</p>
  </div>
`

const getBrandedEmailFooter = () => `
  <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb; margin-top: 30px;">
    <p style="color: #6b7280; font-family: Arial, sans-serif; font-size: 12px; margin: 0;">
      © ${new Date().getFullYear()} MyDayLogs. All rights reserved.
    </p>
    <p style="color: #6b7280; font-family: Arial, sans-serif; font-size: 12px; margin: 5px 0 0 0;">
      Professional task management and team reporting for multi-industry businesses.
    </p>
  </div>
`

export const emailTemplates = {
  welcome: (data: EmailData) => ({
    subject: `Welcome to MyDayLogs, ${data.name}!`,
    html: `
      ${getBrandedEmailHeader()}
      <div style="padding: 30px; font-family: Arial, sans-serif;">
        <h2 style="color: #1f2937;">Welcome to MyDayLogs!</h2>
        <p style="color: #4b5563; line-height: 1.6;">
          Hi ${data.name},
        </p>
        <p style="color: #4b5563; line-height: 1.6;">
          Welcome to MyDayLogs! We're excited to have you on board. Our platform will help you manage tasks efficiently and generate comprehensive team reports.
        </p>
        <p style="color: #4b5563; line-height: 1.6;">
          Get started by logging into your dashboard and exploring the features designed to streamline your workflow.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://mydaylogs.co.uk"}" 
             style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Get Started
          </a>
        </div>
      </div>
      ${getBrandedEmailFooter()}
    `,
    text: `Welcome to MyDayLogs, ${data.name}! We're excited to have you on board. Visit ${process.env.NEXT_PUBLIC_SITE_URL || "https://mydaylogs.co.uk"} to get started.`,
  }),

  taskReminder: (data: EmailData) => ({
    subject: "Task Reminder - MyDayLogs",
    html: `
      ${getBrandedEmailHeader()}
      <div style="padding: 30px; font-family: Arial, sans-serif;">
        <h2 style="color: #1f2937;">Task Reminder</h2>
        <p style="color: #4b5563; line-height: 1.6;">
          Hi ${data.name},
        </p>
        <p style="color: #4b5563; line-height: 1.6;">
          This is a friendly reminder about your pending tasks in MyDayLogs.
        </p>
        <p style="color: #4b5563; line-height: 1.6;">
          Please log in to your dashboard to review and update your task status.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://mydaylogs.co.uk"}/dashboard" 
             style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            View Tasks
          </a>
        </div>
      </div>
      ${getBrandedEmailFooter()}
    `,
    text: `Task Reminder from MyDayLogs. Hi ${data.name}, please check your pending tasks at ${process.env.NEXT_PUBLIC_SITE_URL || "https://mydaylogs.co.uk"}/dashboard`,
  }),

  overdue: (data: EmailData) => ({
    subject: "Overdue Tasks - Action Required - MyDayLogs",
    html: `
      ${getBrandedEmailHeader()}
      <div style="padding: 30px; font-family: Arial, sans-serif;">
        <h2 style="color: #dc2626;">Overdue Tasks - Action Required</h2>
        <p style="color: #4b5563; line-height: 1.6;">
          Hi ${data.name},
        </p>
        <p style="color: #4b5563; line-height: 1.6;">
          You have overdue tasks that require immediate attention in MyDayLogs.
        </p>
        <p style="color: #4b5563; line-height: 1.6;">
          Please log in to your dashboard to review and complete these tasks as soon as possible.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://mydaylogs.co.uk"}/dashboard" 
             style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            View Overdue Tasks
          </a>
        </div>
      </div>
      ${getBrandedEmailFooter()}
    `,
    text: `Overdue Tasks from MyDayLogs. Hi ${data.name}, you have overdue tasks requiring attention. Visit ${process.env.NEXT_PUBLIC_SITE_URL || "https://mydaylogs.co.uk"}/dashboard`,
  }),

  feedback: (data: EmailData) => ({
    subject: `New Feedback Received - ${data.subject || "MyDayLogs"}`,
    html: `
      ${getBrandedEmailHeader()}
      <div style="padding: 30px; font-family: Arial, sans-serif;">
        <h2 style="color: #1f2937;">New Feedback Received</h2>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0 0 10px 0;"><strong>From:</strong> ${data.name} (${data.email})</p>
          <p style="margin: 0 0 10px 0;"><strong>Subject:</strong> ${data.subject}</p>
          ${data.page_url ? `<p style="margin: 0 0 10px 0;"><strong>Page:</strong> ${data.page_url}</p>` : ""}
          <p style="margin: 0 0 10px 0;"><strong>Message:</strong></p>
          <div style="background-color: white; padding: 15px; border-radius: 4px; border-left: 4px solid #10b981;">
            ${data.message?.replace(/\n/g, "<br>")}
          </div>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://mydaylogs.co.uk"}/masterdashboard" 
             style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            View in Dashboard
          </a>
        </div>
      </div>
      ${getBrandedEmailFooter()}
    `,
    text: `New Feedback from ${data.name} (${data.email}): ${data.message}`,
  }),

  response: (data: EmailData) => ({
    subject: data.subject || "Response from MyDayLogs Team",
    html: `
      ${getBrandedEmailHeader()}
      <div style="padding: 30px; font-family: Arial, sans-serif;">
        <h2 style="color: #1f2937;">Response from MyDayLogs Team</h2>
        <p style="color: #4b5563; line-height: 1.6;">
          Hi ${data.name || "there"},
        </p>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          ${data.message?.replace(/\n/g, "<br>")}
        </div>
        ${
          data.originalMessage
            ? `
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <h3 style="color: #6b7280; font-size: 14px;">Original Message:</h3>
            <div style="background-color: #f9fafb; padding: 15px; border-radius: 4px; color: #6b7280; font-size: 14px;">
              ${data.originalMessage.replace(/\n/g, "<br>")}
            </div>
          </div>
        `
            : ""
        }
        <p style="color: #4b5563; line-height: 1.6; margin-top: 30px;">
          Thank you for your feedback. If you have any additional questions, please don't hesitate to reach out.
        </p>
      </div>
      ${getBrandedEmailFooter()}
    `,
    text: `Response from MyDayLogs Team: ${data.message}`,
  }),

  confirmSignup: (data: EmailData) => ({
    subject: "Confirm your MyDayLogs account",
    html: `
      ${getBrandedEmailHeader()}
      <div style="padding: 30px; font-family: Arial, sans-serif;">
        <h2 style="color: #1f2937;">Confirm Your Account</h2>
        <p style="color: #4b5563; line-height: 1.6;">
          Welcome to MyDayLogs! Please confirm your email address to complete your account setup.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{ .ConfirmationURL }}" 
             style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Confirm Email Address
          </a>
        </div>
        <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
          If you didn't create an account with MyDayLogs, you can safely ignore this email.
        </p>
      </div>
      ${getBrandedEmailFooter()}
    `,
    text: "Confirm your MyDayLogs account by clicking: {{ .ConfirmationURL }}",
  }),

  resetPassword: (data: EmailData) => ({
    subject: "Reset your MyDayLogs password",
    html: `
      ${getBrandedEmailHeader()}
      <div style="padding: 30px; font-family: Arial, sans-serif;">
        <h2 style="color: #1f2937;">Reset Your Password</h2>
        <p style="color: #4b5563; line-height: 1.6;">
          You requested to reset your MyDayLogs password. Click the button below to create a new password.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{ .ConfirmationURL }}" 
             style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Reset Password
          </a>
        </div>
        <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
          If you didn't request a password reset, you can safely ignore this email. This link will expire in 24 hours.
        </p>
      </div>
      ${getBrandedEmailFooter()}
    `,
    text: "Reset your MyDayLogs password by clicking: {{ .ConfirmationURL }}",
  }),

  invite: (data: EmailData) => ({
    subject: "You've been invited to join MyDayLogs",
    html: `
      ${getBrandedEmailHeader()}
      <div style="padding: 30px; font-family: Arial, sans-serif;">
        <h2 style="color: #1f2937;">You're Invited to MyDayLogs</h2>
        <p style="color: #4b5563; line-height: 1.6;">
          You've been invited to join MyDayLogs, a professional task management and team reporting platform.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{ .ConfirmationURL }}" 
             style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Accept Invitation
          </a>
        </div>
        <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
          This invitation will expire in 7 days. If you don't want to join, you can safely ignore this email.
        </p>
      </div>
      ${getBrandedEmailFooter()}
    `,
    text: "You've been invited to join MyDayLogs. Accept your invitation: {{ .ConfirmationURL }}",
  }),
}

export async function sendEmail(
  to: string,
  template: keyof typeof emailTemplates,
  data: EmailData = {},
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log("[v0] Sending email:", { to, template, data })

    // Create transporter with SMTP configuration
    const transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: Number.parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_PORT === "465",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    })

    const emailTemplate = emailTemplates[template](data)

    const mailOptions = {
      from: `"MyDayLogs" <${process.env.SMTP_USER || "info@mydaylogs.co.uk"}>`,
      to,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text,
    }

    console.log("[v0] Mail options:", mailOptions)

    const result = await transporter.sendMail(mailOptions)
    console.log("[v0] Email sent successfully:", result.messageId)

    return { success: true }
  } catch (error) {
    console.error("[v0] Error sending email:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
