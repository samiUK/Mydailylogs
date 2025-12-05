interface EmailTemplate {
  subject: string
  html: string
}

interface EmailResult {
  success: boolean
  error?: string
}

// Create SMTP transporter with dynamic import
const createTransporter = async () => {
  const { default: nodemailerModule } = await import("nodemailer")

  const smtpPort = Number.parseInt(process.env.SMTP_PORT || "587")
  const isSSL = smtpPort === 465

  console.log("[v0] Creating SMTP transporter with config:", {
    host: process.env.SMTP_HOST,
    port: smtpPort,
    secure: isSSL,
    user: process.env.SMTP_USER,
  })

  return nodemailerModule.createTransport({
    host: process.env.SMTP_HOST,
    port: smtpPort,
    secure: isSSL, // true for 465 (SSL), false for 587 (STARTTLS)
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
    tls: {
      // Do not fail on invalid certificates (only for development)
      rejectUnauthorized: true,
      // Minimum TLS version
      minVersion: "TLSv1.2",
    },
    connectionTimeout: 10000,
    greetingTimeout: 5000,
    socketTimeout: 10000,
  })
}

const getEmailHeader = () => {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://mydaylogs.co.uk"
  return `
    <div style="text-align: center; padding: 20px 0; border-bottom: 1px solid #e5e7eb;">
      <img src="${siteUrl}/images/mydaylogs-logo.png" alt="MyDayLogs" style="height: 40px; margin-bottom: 10px;" />
      <h1 style="color: #10b981; font-size: 24px; margin: 0; font-family: Arial, sans-serif;">MyDayLogs</h1>
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

const getAutomatedEmailNotice = () => {
  return `
    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center;">
      <p style="color: #6b7280; font-size: 13px; margin: 0; font-family: Arial, sans-serif;">
        ⚠️ <strong>This is an automated email.</strong> Please do not reply to this message. 
        For support inquiries, please contact us at <a href="mailto:info@mydaylogs.co.uk" style="color: #10b981; text-decoration: none;">info@mydaylogs.co.uk</a>
      </p>
    </div>
  `
}

// Send email function
const sendEmailWithResend = async (to: string, subject: string, html: string): Promise<EmailResult> => {
  try {
    const { Resend } = await import("resend")
    const resend = new Resend(process.env.RESEND_API_KEY)

    await resend.emails.send({
      from: "MyDayLogs <noreply@mydaylogs.co.uk>",
      to,
      subject,
      html,
    })

    return { success: true }
  } catch (error) {
    console.error("Error sending email with Resend:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

export const sendEmail = async (to: string, template: EmailTemplate): Promise<EmailResult> => {
  try {
    return await sendEmailWithResend(to, template.subject, template.html)
  } catch (error) {
    console.error("Error sending email:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

// Send password reset email helper function
export const sendPasswordResetEmail = async (email: string, recoveryUrl: string) => {
  const template = emailTemplates.recovery({ recovery_url: recoveryUrl })
  return await sendEmail(email, template)
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
        
        ${getAutomatedEmailNotice()}
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
        
        ${getAutomatedEmailNotice()}
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
        
        ${getAutomatedEmailNotice()}
      </div>
      ${getEmailFooter()}
    `,
  }),

  teamInvite: (data: any): EmailTemplate => ({
    subject: `You've been invited to join ${data.organizationName || "a team"} on MyDayLogs`,
    html: `
      ${getEmailHeader()}
      <div style="padding: 30px; font-family: Arial, sans-serif; line-height: 1.6; color: #374151;">
        <h2 style="color: #10b981; margin-bottom: 20px;">Team Invitation</h2>
        
        <p>Hi ${data.name || "there"},</p>
        
        <p>${data.inviterName} has invited you to join <strong>${data.organizationName}</strong> on MyDayLogs as a <strong>${data.role}</strong>.</p>
        
        <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Organization:</strong> ${data.organizationName}</p>
          <p><strong>Role:</strong> ${data.role}</p>
          <p><strong>Email:</strong> ${data.email}</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.inviteUrl}" style="background-color: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">Accept Invitation</a>
        </div>
        
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #6b7280; background-color: #f9fafb; padding: 10px; border-radius: 4px;">${data.inviteUrl}</p>
        
        <p>Get ready to streamline your team's task management!</p>
        
        ${getAutomatedEmailNotice()}
        
        <p>Best regards,<br>
        <strong>The MyDayLogs Team</strong></p>
      </div>
      ${getEmailFooter()}
    `,
  }),

  taskAssignment: (data: any): EmailTemplate => ({
    subject: `New Task Assigned: ${data.taskName || "Task Assignment"}`,
    html: `
      ${getEmailHeader()}
      <div style="padding: 30px; font-family: Arial, sans-serif; line-height: 1.6; color: #374151;">
        <h2 style="color: #10b981; margin-bottom: 20px;">New Task Assignment</h2>
        
        <p>Hi ${data.assigneeName},</p>
        
        <p>You have been assigned a new task by ${data.assignerName}.</p>
        
        <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
          <h3 style="margin: 0 0 15px 0; color: #374151;">Task Details</h3>
          <p><strong>Task:</strong> ${data.taskName}</p>
          ${data.description ? `<p><strong>Description:</strong> ${data.description}</p>` : ""}
          ${data.dueDate ? `<p><strong>Due Date:</strong> ${new Date(data.dueDate).toLocaleDateString()}</p>` : ""}
          ${data.priority ? `<p><strong>Priority:</strong> <span style="color: ${data.priority === "high" ? "#ef4444" : data.priority === "medium" ? "#f59e0b" : "#10b981"};">${data.priority.toUpperCase()}</span></p>` : ""}
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.taskUrl}" style="background-color: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Task</a>
        </div>
        
        ${getAutomatedEmailNotice()}
        
        <p>Best regards,<br>
        <strong>The MyDayLogs Team</strong></p>
      </div>
      ${getEmailFooter()}
    `,
  }),

  logSubmission: (data: any): EmailTemplate => ({
    subject: `Log Submitted: ${data.logTitle || "Daily Log"}`,
    html: `
      ${getEmailHeader()}
      <div style="padding: 30px; font-family: Arial, sans-serif; line-height: 1.6; color: #374151;">
        <h2 style="color: #10b981; margin-bottom: 20px;">Log Submission Notification</h2>
        
        <p>Hi ${data.recipientName},</p>
        
        <p><strong>${data.staffName}</strong> has submitted a new log for your review.</p>
        
        <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 15px 0; color: #374151;">Log Details</h3>
          <p><strong>Staff Member:</strong> ${data.staffName}</p>
          <p><strong>Date:</strong> ${new Date(data.date).toLocaleDateString()}</p>
          ${data.summary ? `<p><strong>Summary:</strong> ${data.summary}</p>` : ""}
          <p><strong>Status:</strong> ${data.status || "Pending Review"}</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.logUrl}" style="background-color: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">Review Log</a>
        </div>
        
        ${getAutomatedEmailNotice()}
        
        <p>Best regards,<br>
        <strong>The MyDayLogs Team</strong></p>
      </div>
      ${getEmailFooter()}
    `,
  }),

  monthlyInvoice: (data: any): EmailTemplate => ({
    subject: `Your MyDayLogs Invoice for ${data.period || "this month"}`,
    html: `
      ${getEmailHeader()}
      <div style="padding: 30px; font-family: Arial, sans-serif; line-height: 1.6; color: #374151;">
        <h2 style="color: #10b981; margin-bottom: 20px;">Monthly Invoice</h2>
        
        <p>Hi ${data.customerName},</p>
        
        <p>Thank you for your continued subscription to MyDayLogs. Here's your invoice for ${data.period}.</p>
        
        <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 15px 0; color: #374151;">Invoice Summary</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>Invoice Number:</strong></td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">${data.invoiceNumber}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>Plan:</strong></td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">${data.planName}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>Billing Period:</strong></td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">${data.period}</td>
            </tr>
            <tr style="font-size: 18px; font-weight: bold;">
              <td style="padding: 15px 0;"><strong>Total Amount:</strong></td>
              <td style="padding: 15px 0; text-align: right; color: #10b981;">${data.amount}</td>
            </tr>
          </table>
        </div>
        
        ${
          data.invoiceUrl
            ? `
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.invoiceUrl}" style="background-color: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">Download Invoice PDF</a>
        </div>
        `
            : ""
        }
        
        <p>Payment was successfully processed on ${new Date(data.paymentDate).toLocaleDateString()} using your saved payment method.</p>
        
        ${getAutomatedEmailNotice()}
        
        <p>If you have any questions about this invoice, please contact our support team at info@mydaylogs.co.uk.</p>
        
        <p>Best regards,<br>
        <strong>The MyDayLogs Team</strong></p>
      </div>
      ${getEmailFooter()}
    `,
  }),

  paymentConfirmation: (data: any): EmailTemplate => ({
    subject: `Payment Confirmation - ${data.amount}`,
    html: `
      ${getEmailHeader()}
      <div style="padding: 30px; font-family: Arial, sans-serif; line-height: 1.6; color: #374151;">
        <h2 style="color: #10b981; margin-bottom: 20px;">Payment Confirmation</h2>
        
        <p>Hi ${data.customerName},</p>
        
        <p>Your payment has been successfully processed!</p>
        
        <div style="background-color: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <div style="font-size: 48px; margin-bottom: 10px;">✓</div>
          <p style="font-size: 24px; font-weight: bold; color: #10b981; margin: 0;">${data.amount}</p>
          <p style="color: #6b7280; margin: 5px 0 0 0;">Payment Successful</p>
        </div>
        
        <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 15px 0; color: #374151;">Transaction Details</h3>
          <p><strong>Plan:</strong> ${data.planName}</p>
          <p><strong>Transaction ID:</strong> ${data.transactionId}</p>
          <p><strong>Date:</strong> ${new Date(data.date).toLocaleString()}</p>
          <p><strong>Payment Method:</strong> ${data.paymentMethod}</p>
        </div>
        
        ${
          data.invoiceUrl
            ? `
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.invoiceUrl}" style="background-color: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">Download Receipt</a>
        </div>
        `
            : ""
        }
        
        <p>Thank you for your payment! Your subscription is now active.</p>
        
        ${getAutomatedEmailNotice()}
        
        <p>Best regards,<br>
        <strong>The MyDayLogs Team</strong></p>
      </div>
      ${getEmailFooter()}
    `,
  }),

  paymentFailed: (data: any): EmailTemplate => ({
    subject: `Action Required: Payment Failed`,
    html: `
      ${getEmailHeader()}
      <div style="padding: 30px; font-family: Arial, sans-serif; line-height: 1.6; color: #374151;">
        <h2 style="color: #ef4444; margin-bottom: 20px;">Payment Failed - Action Required</h2>
        
        <p>Hi ${data.customerName},</p>
        
        <p>We were unable to process your payment for the MyDayLogs ${data.planName} subscription.</p>
        
        <div style="background-color: #fee2e2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
          <h3 style="margin: 0 0 15px 0; color: #7f1d1d;">Payment Details</h3>
          <p><strong>Amount:</strong> ${data.amount}</p>
          <p><strong>Plan:</strong> ${data.planName}</p>
          <p><strong>Reason:</strong> ${data.failureReason || "Payment declined by your bank"}</p>
        </div>
        
        <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <h3 style="margin: 0 0 15px 0; color: #78350f;">⏰ You Have ${data.gracePeriodDays} Days to Update Payment</h3>
          <p style="margin: 0;">Your account will remain active for <strong>${data.gracePeriodDays} days</strong> while you update your payment method. After this period, your subscription will be automatically canceled and your account will be downgraded to the Starter plan.</p>
        </div>
        
        <p><strong>What happens next?</strong></p>
        <ul>
          <li><strong>Next ${data.gracePeriodDays} days:</strong> Your account remains fully active</li>
          <li><strong>Update your payment method:</strong> Continue your subscription without interruption</li>
          <li><strong>After ${data.gracePeriodDays} days:</strong> If payment is not updated, your account will be downgraded to the free Starter plan (limited to 3 templates and 50 reports)</li>
        </ul>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.updatePaymentUrl}" style="background-color: #ef4444; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">Update Payment Method Now</a>
        </div>
        
        <p style="color: #7f1d1d; font-weight: bold;">⚠️ Don't wait - Update your payment method today to avoid losing access to premium features!</p>
        
        ${getAutomatedEmailNotice()}
        
        <p>If you have any questions, please contact our support team at info@mydaylogs.co.uk immediately.</p>
        
        <p>Best regards,<br>
        <strong>The MyDayLogs Team</strong></p>
      </div>
      ${getEmailFooter()}
    `,
  }),

  trialEndingReminder: (data: any): EmailTemplate => ({
    subject: `Your MyDayLogs Trial Ends in 3 Days`,
    html: `
      ${getEmailHeader()}
      <div style="padding: 30px; font-family: Arial, sans-serif; line-height: 1.6; color: #374151;">
        <h2 style="color: #10b981; margin-bottom: 20px;">Your Free Trial is Ending Soon</h2>
        
        <p>Hi ${data.customerName},</p>
        
        <p>Your 30-day free trial of the <strong>${data.planName}</strong> plan is ending in 3 days.</p>
        
        <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <h3 style="margin: 0 0 15px 0; color: #78350f;">Important Billing Information</h3>
          <p><strong>Trial End Date:</strong> ${new Date(data.trialEndDate).toLocaleDateString("en-GB")}</p>
          <p><strong>First Billing Date:</strong> ${new Date(data.nextBillingDate).toLocaleDateString("en-GB")} (Day 31)</p>
          <p><strong>Amount:</strong> ${data.amount}</p>
          <p style="margin-top: 15px; font-size: 14px;">
            <strong>📅 Billing Schedule:</strong> After your trial ends, you'll be charged ${data.amount} every 30 days from your subscription date.
          </p>
        </div>
        
        <div style="background-color: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 15px 0; color: #10b981;">What You're Getting</h3>
          <ul style="margin: 0; padding-left: 20px;">
            ${data.features.map((feature: string) => `<li style="margin-bottom: 8px;">${feature}</li>`).join("")}
          </ul>
        </div>
        
        <p><strong>No action needed!</strong> Your saved payment method will be charged automatically on ${new Date(data.nextBillingDate).toLocaleDateString("en-GB")}.</p>
        
        <p>Want to make changes? You can:</p>
        <ul>
          <li>Update your payment method</li>
          <li>Change your plan</li>
          <li>Cancel your subscription (no charges if cancelled before trial ends)</li>
        </ul>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.billingUrl}" style="background-color: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">Manage Subscription</a>
        </div>
        
        ${getAutomatedEmailNotice()}
        
        <p>If you have any questions, our support team is here to help at info@mydaylogs.co.uk!</p>
        
        <p>Best regards,<br>
        <strong>The MyDayLogs Team</strong></p>
      </div>
      ${getEmailFooter()}
    `,
  }),

  subscriptionUpgraded: (data: any): EmailTemplate => ({
    subject: `Welcome to ${data.newPlan} - Unlock Your New Features!`,
    html: `
      ${getEmailHeader()}
      <div style="padding: 30px; font-family: Arial, sans-serif; line-height: 1.6; color: #374151;">
        <h2 style="color: #10b981; margin-bottom: 20px;">🎉 You've Upgraded to ${data.newPlan}!</h2>
        
        <p>Hi ${data.customerName},</p>
        
        <p>Congratulations! Your MyDayLogs subscription has been successfully upgraded to the <strong>${data.newPlan}</strong> plan.</p>
        
        <div style="background-color: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
          <h3 style="margin: 0 0 15px 0; color: #10b981;">✨ Your New Features Are Now Active!</h3>
          <ul style="margin: 10px 0; padding-left: 20px;">
            ${data.newFeatures.map((feature: string) => `<li style="margin-bottom: 8px;">${feature}</li>`).join("")}
          </ul>
        </div>
        
        <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 15px 0; color: #374151;">Plan Details</h3>
          <p><strong>New Plan:</strong> ${data.newPlan}</p>
          <p><strong>Previous Plan:</strong> ${data.previousPlan}</p>
          <p><strong>Billing Amount:</strong> ${data.amount}</p>
          <p><strong>Next Billing Date:</strong> ${new Date(data.nextBillingDate).toLocaleDateString("en-GB")}</p>
          ${data.proratedAmount ? `<p><strong>Prorated Charge Today:</strong> ${data.proratedAmount}</p>` : ""}
        </div>
        
        <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 15px 0; color: #78350f;">💡 Get Started with Your New Features</h3>
          <p>Here are some quick actions to make the most of your upgrade:</p>
          <ul style="margin: 10px 0; padding-left: 20px;">
            ${data.quickActions.map((action: string) => `<li style="margin-bottom: 8px;">${action}</li>`).join("")}
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.dashboardUrl}" style="background-color: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">Go to Dashboard</a>
        </div>
        
        ${getAutomatedEmailNotice()}
        
        <p>Thank you for choosing MyDayLogs! If you have any questions about your new features, our support team is here to help at info@mydaylogs.co.uk.</p>
        
        <p>Best regards,<br>
        <strong>The MyDayLogs Team</strong></p>
      </div>
      ${getEmailFooter()}
    `,
  }),

  subscriptionDowngraded: (data: any): EmailTemplate => ({
    subject: `Your Subscription Has Been Changed to ${data.newPlan}`,
    html: `
      ${getEmailHeader()}
      <div style="padding: 30px; font-family: Arial, sans-serif; line-height: 1.6; color: #374151;">
        <h2 style="color: #f59e0b; margin-bottom: 20px;">Subscription Plan Changed</h2>
        
        <p>Hi ${data.customerName},</p>
        
        <p>Your MyDayLogs subscription has been changed from <strong>${data.previousPlan}</strong> to <strong>${data.newPlan}</strong>.</p>
        
        <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <h3 style="margin: 0 0 15px 0; color: #78350f;">📋 What Changed</h3>
          <p><strong>Previous Plan:</strong> ${data.previousPlan}</p>
          <p><strong>New Plan:</strong> ${data.newPlan}</p>
          <p><strong>New Billing Amount:</strong> ${data.amount}</p>
          <p><strong>Effective Date:</strong> ${new Date(data.effectiveDate).toLocaleDateString("en-GB")}</p>
        </div>
        
        ${
          data.removedFeatures && data.removedFeatures.length > 0
            ? `
        <div style="background-color: #fee2e2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
          <h3 style="margin: 0 0 15px 0; color: #7f1d1d;">⚠️ Features No Longer Available</h3>
          <ul style="margin: 10px 0; padding-left: 20px;">
            ${data.removedFeatures.map((feature: string) => `<li style="margin-bottom: 8px;">${feature}</li>`).join("")}
          </ul>
        </div>
        `
            : ""
        }
        
        ${
          data.dataRemoved
            ? `
        <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <h3 style="margin: 0 0 15px 0; color: #78350f;">🗂️ Data Cleanup Performed</h3>
          <p>To comply with your new plan limits, the following changes were made:</p>
          <ul style="margin: 10px 0; padding-left: 20px;">
            ${data.dataRemoved.map((item: string) => `<li style="margin-bottom: 8px;">${item}</li>`).join("")}
          </ul>
        </div>
        `
            : ""
        }
        
        <div style="background-color: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 15px 0; color: #10b981;">✅ ${data.newPlan} Features You Still Have</h3>
          <ul style="margin: 10px 0; padding-left: 20px;">
            ${data.retainedFeatures.map((feature: string) => `<li style="margin-bottom: 8px;">${feature}</li>`).join("")}
          </ul>
        </div>
        
        ${
          data.showUpgradeOption
            ? `
        <div style="text-align: center; margin: 30px 0; padding: 20px; background-color: #f9fafb; border-radius: 8px;">
          <p style="margin-bottom: 15px;"><strong>Need more features? Upgrade anytime!</strong></p>
          <a href="${data.upgradeUrl}" style="background-color: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Upgrade Options</a>
        </div>
        `
            : ""
        }
        
        ${getAutomatedEmailNotice()}
        
        <p>If you have any questions about your plan change, please contact our support team at info@mydaylogs.co.uk.</p>
        
        <p>Best regards,<br>
        <strong>The MyDayLogs Team</strong></p>
      </div>
      ${getEmailFooter()}
    `,
  }),

  subscriptionCancelled: (data: any): EmailTemplate => ({
    subject: `Subscription Cancellation Confirmed`,
    html: `
      ${getEmailHeader()}
      <div style="padding: 30px; font-family: Arial, sans-serif; line-height: 1.6; color: #374151;">
        <h2 style="color: #ef4444; margin-bottom: 20px;">Subscription Cancellation Confirmed</h2>
        
        <p>Hi ${data.customerName},</p>
        
        <p>We've received your request to cancel your MyDayLogs <strong>${data.planName}</strong> subscription.</p>
        
        ${
          data.isTrialing
            ? `
        <div style="background-color: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
          <h3 style="margin: 0 0 15px 0; color: #10b981;">✅ Your Trial Continues Until ${new Date(data.accessUntilDate).toLocaleDateString("en-GB")}</h3>
          <p>Since you're on a free trial, you won't be charged anything. You'll continue to have full access to all ${data.planName} features until your trial ends on <strong>${new Date(data.accessUntilDate).toLocaleDateString("en-GB")}</strong>.</p>
          <p style="margin-top: 10px;"><strong>After your trial ends:</strong></p>
          <ul style="margin: 5px 0; padding-left: 20px;">
            <li>Your account will automatically switch to the free Starter plan</li>
            <li>You'll retain access with Starter plan limits (3 templates, 5 team members, 50 reports)</li>
            <li>No payment will ever be collected</li>
          </ul>
        </div>
        `
            : `
        <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <h3 style="margin: 0 0 15px 0; color: #78350f;">📅 Your Subscription Remains Active Until ${new Date(data.accessUntilDate).toLocaleDateString("en-GB")}</h3>
          <p>You'll continue to have full access to all ${data.planName} features until your current billing period ends on <strong>${new Date(data.accessUntilDate).toLocaleDateString("en-GB")}</strong>.</p>
          <p style="margin-top: 10px;"><strong>What happens on ${new Date(data.accessUntilDate).toLocaleDateString("en-GB")}:</strong></p>
          <ul style="margin: 5px 0; padding-left: 20px;">
            <li>Your subscription will end (no further charges)</li>
            <li>Your account will switch to the free Starter plan</li>
            <li>Excess data will be removed to comply with Starter limits</li>
          </ul>
        </div>
        `
        }
        
        <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 15px 0; color: #374151;">Cancellation Details</h3>
          <p><strong>Plan:</strong> ${data.planName}</p>
          <p><strong>Cancellation Date:</strong> ${new Date().toLocaleDateString("en-GB")}</p>
          <p><strong>Access Until:</strong> ${new Date(data.accessUntilDate).toLocaleDateString("en-GB")}</p>
          ${data.isTrialing ? "<p><strong>Charges:</strong> None (trial period)</p>" : `<p><strong>Final Billing Date:</strong> ${new Date(data.accessUntilDate).toLocaleDateString("en-GB")}</p>`}
        </div>
        
        ${
          !data.isTrialing && data.downgradeWarning
            ? `
        <div style="background-color: #fee2e2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
          <h3 style="margin: 0 0 15px 0; color: #7f1d1d;">⚠️ Automatic Data Cleanup on ${new Date(data.accessUntilDate).toLocaleDateString("en-GB")}</h3>
          <p>When your subscription ends, we'll automatically adjust your account to fit Starter plan limits:</p>
          <ul style="margin: 10px 0; padding-left: 20px;">
            <li>Templates will be reduced to the first 3 created</li>
            <li>Team members will be reduced to the first 5 added</li>
            <li>Reports will be limited to the 50 most recent</li>
            <li>All manager accounts will be removed (1 admin only)</li>
          </ul>
          <p style="margin-top: 15px; font-weight: bold;">💡 Tip: Back up your data or remove extra items before ${new Date(data.accessUntilDate).toLocaleDateString("en-GB")} to control what stays.</p>
        </div>
        `
            : ""
        }
        
        <div style="background-color: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 15px 0; color: #10b981;">Changed Your Mind?</h3>
          <p>You can reactivate your subscription anytime before ${new Date(data.accessUntilDate).toLocaleDateString("en-GB")} to keep all your data and features.</p>
          <div style="text-align: center; margin-top: 15px;">
            <a href="${data.billingUrl}" style="background-color: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">Reactivate Subscription</a>
          </div>
        </div>
        
        ${getAutomatedEmailNotice()}
        
        <p>We're sorry to see you go! If there's anything we could have done better, please let us know at info@mydaylogs.co.uk. Your feedback helps us improve.</p>
        
        <p>Best regards,<br>
        <strong>The MyDayLogs Team</strong></p>
      </div>
      ${getEmailFooter()}
    `,
  }),
}
