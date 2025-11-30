import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { sendEmail } from "@/lib/email/resend"

export async function POST(request: Request) {
  try {
    const { templateId, templateName, submitterName, submitterEmail, organizationId } = await request.json()

    const supabase = await createClient()

    // Get organization admins
    const { data: admins, error: adminsError } = await supabase
      .from("profiles")
      .select("email, full_name, first_name")
      .eq("organization_id", organizationId)
      .eq("role", "admin")

    if (adminsError) throw adminsError

    if (!admins || admins.length === 0) {
      console.log("[v0] No admins found for organization:", organizationId)
      return NextResponse.json({ success: true, message: "No admins to notify" })
    }

    // Get base URL for links
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.mydaylogs.co.uk"
    const reportsUrl = `${baseUrl}/admin/reporting`

    // Send email to all admins
    const emailPromises = admins.map((admin) =>
      sendEmail({
        to: admin.email,
        subject: `New External Form Submission - ${templateName}`,
        html: getExternalSubmissionEmail({
          adminName: admin.first_name || admin.full_name || "Admin",
          templateName,
          submitterName,
          submitterEmail,
          reportsUrl,
        }),
      }),
    )

    await Promise.allSettled(emailPromises)

    // Also send confirmation to contractor
    await sendEmail({
      to: submitterEmail,
      subject: `Form Submission Received - ${templateName}`,
      html: getContractorConfirmationEmail({
        contractorName: submitterName,
        templateName,
      }),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error sending admin notification:", error)
    return NextResponse.json({ success: false, error: "Failed to send notifications" }, { status: 500 })
  }
}

function getExternalSubmissionEmail(data: {
  adminName: string
  templateName: string
  submitterName: string
  submitterEmail: string
  reportsUrl: string
}) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
          .email-container { max-width: 600px; margin: 0 auto; background: #ffffff; }
          .header { background: #059669; padding: 32px; text-align: center; color: #ffffff; }
          .content { padding: 40px 32px; color: #1f2937; line-height: 1.6; }
          .button { display: inline-block; background: #059669; color: #ffffff !important; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 24px 0; }
          .info-box { background: #ecfdf5; border-left: 4px solid #059669; padding: 16px; margin: 24px 0; border-radius: 4px; }
          .footer { background: #f9fafb; padding: 32px; text-align: center; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <h1 style="margin: 0; font-size: 24px;">New External Form Submission</h1>
          </div>
          <div class="content">
            <p>Hi ${data.adminName},</p>
            <p>You've received a new external form submission from a contractor.</p>
            <div class="info-box">
              <p style="margin: 0 0 12px 0;"><strong>Template:</strong> ${data.templateName}</p>
              <p style="margin: 0 0 12px 0;"><strong>Submitted by:</strong> ${data.submitterName}</p>
              <p style="margin: 0;"><strong>Email:</strong> ${data.submitterEmail}</p>
            </div>
            <p>The submission has been recorded and is available in your Reports & Analytics section.</p>
            <a href="${data.reportsUrl}" class="button">View Report</a>
            <p style="margin-top: 32px; color: #6b7280; font-size: 14px;">
              You can contact the contractor by replying to ${data.submitterEmail}
            </p>
          </div>
          <div class="footer">
            <p><strong>MyDayLogs</strong> - Your Daily Task Management Solution</p>
            <p style="margin-top: 16px; font-size: 12px;">This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
    </html>
  `
}

function getContractorConfirmationEmail(data: { contractorName: string; templateName: string }) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
          .email-container { max-width: 600px; margin: 0 auto; background: #ffffff; }
          .header { background: #059669; padding: 32px; text-align: center; color: #ffffff; }
          .content { padding: 40px 32px; color: #1f2937; line-height: 1.6; }
          .success-box { background: #ecfdf5; border-left: 4px solid #059669; padding: 16px; margin: 24px 0; border-radius: 4px; }
          .footer { background: #f9fafb; padding: 32px; text-align: center; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <h1 style="margin: 0; font-size: 24px;">✓ Form Submitted Successfully</h1>
          </div>
          <div class="content">
            <p>Hi ${data.contractorName},</p>
            <p>Thank you for completing the form: <strong>${data.templateName}</strong></p>
            <div class="success-box">
              <p style="margin: 0; color: #059669; font-weight: 600;">Your submission has been received and will be reviewed by the team.</p>
            </div>
            <p>If the team needs any additional information, they will contact you directly at this email address.</p>
            <p style="margin-top: 32px;">Thank you for your cooperation!</p>
          </div>
          <div class="footer">
            <p><strong>MyDayLogs</strong> - Your Daily Task Management Solution</p>
            <p style="margin-top: 16px; font-size: 12px;">This is an automated confirmation. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
    </html>
  `
}
