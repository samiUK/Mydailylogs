import nodemailer from "nodemailer"

interface EmailTemplate {
  subject: string
  html: string
}

interface EmailResult {
  success: boolean
  error?: string
}

// Create SMTP transporter
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.SMTP_HOST,
    port: Number.parseInt(process.env.SMTP_PORT || "587"),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  })
}

const getEmailHeader = () => {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://mydaylogs.co.uk"
  return `
    <div style="text-align: center; padding: 20px 0; border-bottom: 1px solid #e5e7eb;">
      <img src="${siteUrl}/images/mydaylogs-logo.png" alt="MyDayLogs" style="height: 40px; margin-bottom: 10px;" />
      <h1 style="color: #10b981; font-size: 24px; margin: 0; font-family: Arial, sans-serif;">MyDayLogs</h1>
      <p style="color: #6b7280; font-size: 14px; margin: 5px 0 0 0; font-family: Arial, sans-serif;">Professional Task Management Platform</p>
    </div>
  `
}

const getEmailFooter = () => {
  return `
    <div style="text-align: center; padding: 20px 0; border-top: 1px solid #e5e7eb; margin-top: 30px; color: #6b7280; font-size: 12px; font-family: Arial, sans-serif;">
      <p>&copy; ${new Date().getFullYear()} MyDayLogs. All rights reserved.</p>
      <p>Professional task management and team reporting for multi-industry businesses.</p>
    </div>
  `
}

// Send email function
export const sendEmail = async (to: string, subject: string, html: string): Promise<EmailResult> => {
  try {
    const transporter = createTransporter()

    const mailOptions = {
      from: `"MyDayLogs" <info@mydaylogs.co.uk>`, // Professional sender address
      to,
      subject,
      html,
    }

    await transporter.sendMail(mailOptions)
    return { success: true }
  } catch (error) {
    console.error("Email sending error:", error)
    return { success: false, error: error.message }
  }
}

// Email templates
export const emailTemplates = {
  response: (data: any): EmailTemplate => ({
    subject: data.subject || "Response to your feedback",
    html: `
      ${getEmailHeader()}
      <div style="padding: 30px; font-family: Arial, sans-serif; line-height: 1.6; color: #374151;">
        <h2 style="color: #10b981; margin-bottom: 20px;">Response to Your Feedback</h2>
        
        <p>Hi ${data.name || "there"},</p>
        
        <p>Thank you for your feedback. We've reviewed your message and here's our response:</p>
        
        <div style="background-color: #f9fafb; padding: 20px; border-left: 4px solid #10b981; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: #374151;">Your Original Message:</h3>
          <p style="margin: 0; font-style: italic;">"${data.originalMessage}"</p>
        </div>
        
        <div style="background-color: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 15px 0; color: #10b981;">Our Response:</h3>
          <div style="white-space: pre-wrap;">${data.responseMessage}</div>
        </div>
        
        <p>If you have any further questions or need additional assistance, please don't hesitate to reach out to us.</p>
        
        <p>Best regards,<br>
        <strong>MyDayLogs Support Team</strong></p>
      </div>
      ${getEmailFooter()}
    `,
  }),

  feedback: (data: any): EmailTemplate => ({
    subject: `New Feedback: ${data.subject || "User Feedback"}`,
    html: `
      ${getEmailHeader()}
      <div style="padding: 30px; font-family: Arial, sans-serif; line-height: 1.6; color: #374151;">
        <h2 style="color: #10b981; margin-bottom: 20px;">New Feedback Received</h2>
        
        <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>From:</strong> ${data.name || "Anonymous"} (${data.email || "No email provided"})</p>
          <p><strong>Subject:</strong> ${data.subject || "No subject"}</p>
          <p><strong>Page:</strong> ${data.page_url || "Not specified"}</p>
          <p><strong>Message:</strong></p>
          <div style="background-color: white; padding: 15px; border-radius: 4px; margin-top: 10px;">
            ${data.message || "No message provided"}
          </div>
        </div>
        
        <p>You can respond to this feedback from your master dashboard.</p>
      </div>
      ${getEmailFooter()}
    `,
  }),

  signup: (data: any): EmailTemplate => ({
    subject: "Welcome to MyDayLogs - Confirm Your Email",
    html: `
      ${getEmailHeader()}
      <div style="padding: 30px; font-family: Arial, sans-serif; line-height: 1.6; color: #374151;">
        <h2 style="color: #10b981; margin-bottom: 20px;">Welcome to MyDayLogs!</h2>
        
        <p>Thank you for signing up for MyDayLogs. Please confirm your email address by clicking the button below:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.confirmation_url}" style="background-color: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">Confirm Email Address</a>
        </div>
        
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #6b7280;">${data.confirmation_url}</p>
        
        <p>Welcome to professional task management!</p>
      </div>
      ${getEmailFooter()}
    `,
  }),

  recovery: (data: any): EmailTemplate => ({
    subject: "Reset Your MyDayLogs Password",
    html: `
      ${getEmailHeader()}
      <div style="padding: 30px; font-family: Arial, sans-serif; line-height: 1.6; color: #374151;">
        <h2 style="color: #10b981; margin-bottom: 20px;">Reset Your Password</h2>
        
        <p>You requested to reset your password for your MyDayLogs account. Click the button below to set a new password:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.recovery_url}" style="background-color: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password</a>
        </div>
        
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #6b7280;">${data.recovery_url}</p>
        
        <p>If you didn't request this password reset, you can safely ignore this email.</p>
      </div>
      ${getEmailFooter()}
    `,
  }),

  invite: (data: any): EmailTemplate => ({
    subject: "You've been invited to join MyDayLogs",
    html: `
      ${getEmailHeader()}
      <div style="padding: 30px; font-family: Arial, sans-serif; line-height: 1.6; color: #374151;">
        <h2 style="color: #10b981; margin-bottom: 20px;">You're Invited!</h2>
        
        <p>You've been invited to join MyDayLogs as a ${data.role || "team member"}.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.invite_url}" style="background-color: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">Accept Invitation</a>
        </div>
        
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #6b7280;">${data.invite_url}</p>
        
        <p>Welcome to professional task management!</p>
      </div>
      ${getEmailFooter()}
    `,
  }),
}
