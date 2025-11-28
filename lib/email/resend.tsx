import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

// Get the base URL for links
const getBaseUrl = () => {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://www.mydaylogs.co.uk"
}

// Email layout wrapper with MyDayLogs branding
const getEmailLayout = (content: string, preheader?: string) => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        ${preheader ? `<meta name="description" content="${preheader}">` : ""}
        <style>
          body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
          .email-container { max-width: 600px; margin: 0 auto; background: #ffffff; }
          .header { background: #059669; padding: 32px; text-align: center; }
          .logo-container { display: flex; align-items: center; justify-content: center; gap: 12px; }
          .logo { width: 48px; height: 48px; background: #ffffff; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
          .logo-text { color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
          .content { padding: 40px 32px; color: #1f2937; line-height: 1.6; }
          .button { display: inline-block; background: #059669; color: #ffffff !important; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 24px 0; }
          .button:hover { background: #047857; }
          .footer { background: #f9fafb; padding: 32px; text-align: center; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb; }
          .footer a { color: #059669; text-decoration: none; }
          .security-note { background: #ecfdf5; border-left: 4px solid #059669; padding: 16px; margin: 24px 0; border-radius: 4px; }
          .alert-box { background: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 24px 0; border-radius: 4px; color: #991b1b; }
        </style>
      </head>
      <body>
        ${preheader ? `<div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${preheader}</div>` : ""}
        <div class="email-container">
          <div class="header">
            <div class="logo-container">
              <div class="logo">
                <img src="${getBaseUrl()}/mydaylogs-logo.png" alt="MyDayLogs" width="48" height="48" style="display: block; border-radius: 8px;" />
              </div>
              <span class="logo-text">MyDayLogs</span>
            </div>
          </div>
          <div class="content">
            ${content}
          </div>
          <div class="footer">
            <p><strong>MyDayLogs</strong> - Your Daily Task Management Solution</p>
            <p>
              <a href="${getBaseUrl()}">Visit Website</a> | 
              <a href="${getBaseUrl()}/contact">Contact Support</a> | 
              <a href="${getBaseUrl()}/privacy">Privacy Policy</a>
            </p>
            <p style="margin-top: 16px; font-size: 12px;">
              This is an automated message. Please do not reply to this email.
            </p>
          </div>
        </div>
      </body>
    </html>
  `
}

// Generic send email function
export async function sendEmail({
  to,
  subject,
  html,
  from = "MyDayLogs <noreply@mydaylogs.co.uk>",
  replyTo,
}: {
  to: string
  subject: string
  html: string
  from?: string
  replyTo?: string
}) {
  try {
    console.log(`[v0] Sending email to: ${to}, subject: ${subject}`)

    const result = await resend.emails.send({
      from,
      to,
      subject,
      html,
      replyTo,
    })

    console.log(`[v0] Email sent successfully:`, result)
    return { success: true, data: result }
  } catch (error) {
    console.error("[v0] Error sending email:", error)
    return { success: false, error }
  }
}

// Send verification email
export async function sendVerificationEmail(email: string, token: string) {
  const verifyUrl = `${getBaseUrl()}/auth/callback?token=${token}&type=signup`

  const html = getEmailLayout(
    `
      <h1 style="color: #059669; margin-bottom: 24px;">Verify Your Email</h1>
      <p>Hi there,</p>
      <p>Thank you for signing up for MyDayLogs! Please verify your email address to get started.</p>
      <p>Click the button below to verify your email:</p>
      <a href="${verifyUrl}" class="button">Verify Email Address</a>
      <div class="security-note">
        <p style="margin: 0;"><strong>Security Note:</strong> This link will expire in 24 hours for your protection.</p>
      </div>
      <p style="margin-top: 24px; font-size: 14px; color: #6b7280;">
        If the button doesn't work, copy and paste this link into your browser:<br>
        <a href="${verifyUrl}" style="color: #059669; word-break: break-all;">${verifyUrl}</a>
      </p>
      <p style="margin-top: 32px; color: #6b7280;">
        If you didn't request this verification, you can safely ignore this email.
      </p>
    `,
    "Verify your email address to get started with MyDayLogs",
  )

  return sendEmail({
    to: email,
    subject: "Verify Your Email - MyDayLogs",
    html,
  })
}

// Send password reset email
export async function sendPasswordResetEmail(email: string, userName: string, resetUrl: string) {
  const html = getEmailLayout(
    `
      <h1 style="color: #059669; margin-bottom: 24px;">Reset Your Password</h1>
      <p>Hi ${userName || "there"},</p>
      <p>We received a request to reset your password for your MyDayLogs account.</p>
      <p>Click the button below to choose a new password:</p>
      <a href="${resetUrl}" class="button">Reset Password</a>
      <div class="security-note">
        <p style="margin: 0;"><strong>Security Note:</strong> This link will expire in 1 hour for your protection.</p>
      </div>
      <p style="margin-top: 24px; font-size: 14px; color: #6b7280;">
        If the button doesn't work, copy and paste this link into your browser:<br>
        <a href="${resetUrl}" style="color: #059669; word-break: break-all;">${resetUrl}</a>
      </p>
      <p style="margin-top: 32px; color: #6b7280;">
        If you didn't request this reset, you can safely ignore this email.
      </p>
    `,
    "Reset your MyDayLogs password",
  )

  return sendEmail({
    to: email,
    subject: "Reset Your Password - MyDayLogs",
    html,
  })
}

// Email templates object for compatibility with existing code
export const emailTemplates = {
  taskAssignment: (data: {
    userName: string
    taskTitle: string
    taskDescription: string
    dueDate: string
    assignedBy: string
    loginUrl: string
  }) => {
    return getEmailLayout(
      `
        <h1 style="color: #059669; margin-bottom: 24px;">New Task Assigned</h1>
        <p>Hi ${data.userName},</p>
        <p>${data.assignedBy} has assigned you a new task.</p>
        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 24px 0;">
          <h2 style="margin: 0 0 12px 0; color: #1f2937; font-size: 18px;">${data.taskTitle}</h2>
          <p style="margin: 0 0 12px 0; color: #6b7280;">${data.taskDescription}</p>
          <p style="margin: 0; color: #059669; font-weight: 600;">Due: ${data.dueDate}</p>
        </div>
        <a href="${data.loginUrl}" class="button">View Task</a>
        <p style="margin-top: 32px; color: #6b7280;">
          Log in to MyDayLogs to view all your tasks and mark them as complete.
        </p>
      `,
      `New task: ${data.taskTitle}`,
    )
  },

  taskReminder: (data: {
    userName: string
    taskTitle: string
    dueDate: string
    daysUntilDue: number
    loginUrl: string
  }) => {
    return getEmailLayout(
      `
        <h1 style="color: #059669; margin-bottom: 24px;">Task Reminder</h1>
        <p>Hi ${data.userName},</p>
        <p>This is a friendly reminder that your task is due soon.</p>
        <div style="background: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 20px; margin: 24px 0;">
          <h2 style="margin: 0 0 12px 0; color: #1f2937; font-size: 18px;">${data.taskTitle}</h2>
          <p style="margin: 0; color: #92400e; font-weight: 600;">Due in ${data.daysUntilDue} days (${data.dueDate})</p>
        </div>
        <a href="${data.loginUrl}" class="button">View Task</a>
      `,
      `Reminder: ${data.taskTitle} due in ${data.daysUntilDue} days`,
    )
  },

  taskOverdue: (data: {
    userName: string
    taskTitle: string
    dueDate: string
    daysOverdue: number
    loginUrl: string
  }) => {
    return getEmailLayout(
      `
        <h1 style="color: #dc2626; margin-bottom: 24px;">Overdue Task Alert</h1>
        <p>Hi ${data.userName},</p>
        <p>Your task is now overdue and requires immediate attention.</p>
        <div class="alert-box">
          <h2 style="margin: 0 0 12px 0; font-size: 18px;">${data.taskTitle}</h2>
          <p style="margin: 0; font-weight: 600;">Overdue by ${data.daysOverdue} days (Due: ${data.dueDate})</p>
        </div>
        <a href="${data.loginUrl}" class="button" style="background: #dc2626;">Complete Task Now</a>
      `,
      `OVERDUE: ${data.taskTitle}`,
    )
  },

  feedback: (data: {
    subject: string
    message: string
    senderName: string
    senderEmail: string
    organizationName?: string
  }) => {
    return getEmailLayout(
      `
        <h1 style="color: #059669; margin-bottom: 24px;">New Feedback Received</h1>
        <p>You have received new feedback from a user.</p>
        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 24px 0;">
          <h2 style="margin: 0 0 12px 0; color: #1f2937; font-size: 18px;">${data.subject}</h2>
          <p style="margin: 0 0 16px 0; color: #374151; white-space: pre-wrap;">${data.message}</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;">
          <p style="margin: 0; color: #6b7280; font-size: 14px;">
            <strong>From:</strong> ${data.senderName} (${data.senderEmail})<br>
            ${data.organizationName ? `<strong>Organization:</strong> ${data.organizationName}` : ""}
          </p>
        </div>
        <p style="color: #6b7280;">
          Reply directly to this email to respond to ${data.senderName}.
        </p>
      `,
      `New feedback: ${data.subject}`,
    )
  },

  response: (data: {
    userName: string
    subject: string
    message: string
    originalMessage?: string
  }) => {
    return getEmailLayout(
      `
        <h1 style="color: #059669; margin-bottom: 24px;">${data.subject}</h1>
        <p>Hi ${data.userName},</p>
        <div style="margin: 24px 0;">
          ${data.message}
        </div>
        ${
          data.originalMessage
            ? `
          <div style="background: #f9fafb; border-left: 4px solid #e5e7eb; padding: 16px; margin: 24px 0;">
            <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 12px; font-weight: 600;">YOUR ORIGINAL MESSAGE:</p>
            <p style="margin: 0; color: #6b7280; white-space: pre-wrap;">${data.originalMessage}</p>
          </div>
        `
            : ""
        }
        <a href="${getBaseUrl()}" class="button">Visit MyDayLogs</a>
      `,
      data.subject,
    )
  },

  signup: (data: {
    userName: string
    verificationUrl: string
  }) => {
    return getEmailLayout(
      `
        <h1 style="color: #059669; margin-bottom: 24px;">Welcome to MyDayLogs!</h1>
        <p>Hi ${data.userName},</p>
        <p>Thank you for signing up! We're excited to have you on board.</p>
        <p>To get started, please verify your email address:</p>
        <a href="${data.verificationUrl}" class="button">Verify Email Address</a>
        <div style="margin: 32px 0; padding: 24px; background: #f9fafb; border-radius: 8px;">
          <h3 style="margin: 0 0 12px 0; color: #1f2937;">What's Next?</h3>
          <ul style="margin: 0; padding-left: 20px; color: #6b7280;">
            <li>Complete your profile</li>
            <li>Create your first task</li>
            <li>Invite team members</li>
            <li>Explore the dashboard</li>
          </ul>
        </div>
      `,
      "Welcome to MyDayLogs - Verify your email to get started",
    )
  },

  recovery: (data: {
    userName: string
    resetUrl: string
  }) => {
    return getEmailLayout(
      `
        <h1 style="color: #059669; margin-bottom: 24px;">Reset Your Password</h1>
        <p>Hi ${data.userName},</p>
        <p>We received a request to reset your password for your MyDayLogs account.</p>
        <p>Click the button below to choose a new password:</p>
        <a href="${data.resetUrl}" class="button">Reset Password</a>
        <div class="security-note">
          <p style="margin: 0;"><strong>Security Note:</strong> This link will expire in 1 hour for your protection.</p>
        </div>
        <p style="margin-top: 32px; color: #6b7280;">
          If you didn't request this reset, you can safely ignore this email.
        </p>
      `,
      "Reset your MyDayLogs password",
    )
  },

  invite: (data: {
    inviterName: string
    organizationName: string
    inviteUrl: string
  }) => {
    return getEmailLayout(
      `
        <h1 style="color: #059669; margin-bottom: 24px;">You're Invited to Join MyDayLogs</h1>
        <p>${data.inviterName} has invited you to join <strong>${data.organizationName}</strong> on MyDayLogs.</p>
        <p>MyDayLogs helps teams manage daily tasks, track progress, and collaborate effectively.</p>
        <a href="${data.inviteUrl}" class="button">Accept Invitation</a>
        <div style="margin: 32px 0; padding: 24px; background: #f9fafb; border-radius: 8px;">
          <h3 style="margin: 0 0 12px 0; color: #1f2937;">With MyDayLogs, you can:</h3>
          <ul style="margin: 0; padding-left: 20px; color: #6b7280;">
            <li>Manage your daily tasks efficiently</li>
            <li>Collaborate with your team</li>
            <li>Track progress and deadlines</li>
            <li>Get reminders and notifications</li>
          </ul>
        </div>
      `,
      `You're invited to join ${data.organizationName} on MyDayLogs`,
    )
  },

  paymentSuccess: (data: {
    userName: string
    amount: string
    planName: string
    receiptUrl?: string
  }) => {
    return getEmailLayout(
      `
        <h1 style="color: #059669; margin-bottom: 24px;">Payment Successful</h1>
        <p>Hi ${data.userName},</p>
        <p>Thank you for your payment! Your transaction has been completed successfully.</p>
        <div style="background: #ecfdf5; border: 1px solid #059669; border-radius: 8px; padding: 20px; margin: 24px 0;">
          <h2 style="margin: 0 0 12px 0; color: #1f2937; font-size: 18px;">Payment Details</h2>
          <p style="margin: 0 0 8px 0;"><strong>Plan:</strong> ${data.planName}</p>
          <p style="margin: 0;"><strong>Amount:</strong> ${data.amount}</p>
        </div>
        ${data.receiptUrl ? `<a href="${data.receiptUrl}" class="button">View Receipt</a>` : ""}
        <p style="margin-top: 32px; color: #6b7280;">
          If you have any questions about your payment, please contact our support team.
        </p>
      `,
      `Payment successful - ${data.planName}`,
    )
  },

  paymentFailed: (data: {
    userName: string
    planName: string
    retryUrl: string
  }) => {
    return getEmailLayout(
      `
        <h1 style="color: #dc2626; margin-bottom: 24px;">Payment Failed</h1>
        <p>Hi ${data.userName},</p>
        <p>We were unable to process your payment for <strong>${data.planName}</strong>.</p>
        <div class="alert-box">
          <p style="margin: 0;">Please update your payment method to continue using MyDayLogs without interruption.</p>
        </div>
        <a href="${data.retryUrl}" class="button" style="background: #dc2626;">Update Payment Method</a>
        <p style="margin-top: 32px; color: #6b7280;">
          If you need assistance, please contact our support team.
        </p>
      `,
      `Action required: Payment failed for ${data.planName}`,
    )
  },
}
