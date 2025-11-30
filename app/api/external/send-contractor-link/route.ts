import { NextResponse } from "next/server"
import { sendEmail } from "@/lib/email/resend"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const { contractorEmail, contractorName, templateName, shareableLink, organizationId } = await request.json()

    console.log("[v0] Sending contractor link email:", { contractorEmail, contractorName, templateName })

    if (!contractorEmail || !contractorName || !shareableLink || !organizationId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = await createClient()

    // Get current billing cycle start
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("current_period_start")
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .single()

    const billingCycleStart = subscription?.current_period_start || new Date().toISOString()

    // Count emails sent this billing cycle
    const { count } = await supabase
      .from("contractor_emails_sent")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .gte("billing_cycle_start", billingCycleStart)

    const EMAIL_LIMIT = 15

    if ((count || 0) >= EMAIL_LIMIT) {
      console.log("[v0] Email limit reached for organization:", organizationId)
      return NextResponse.json(
        {
          error: `Email limit reached (${EMAIL_LIMIT} per billing cycle)`,
        },
        { status: 429 },
      )
    }
    // </CHANGE>

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
            .header { background: #059669; padding: 32px; text-align: center; color: white; }
            .content { padding: 40px 32px; color: #1f2937; line-height: 1.6; }
            .button { display: inline-block; background: #059669; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 24px 0; }
            .footer { background: #f9fafb; padding: 32px; text-align: center; color: #6b7280; font-size: 14px; }
            .info-box { background: #f0fdf4; border-left: 4px solid #059669; padding: 16px; margin: 24px 0; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 24px;">MyDayLogs</h1>
            </div>
            <div class="content">
              <h1 style="color: #059669; margin-bottom: 24px;">Complete Log: ${templateName}</h1>
              <p>Hi ${contractorName},</p>
              <p>You've been invited to complete a log for <strong>${templateName}</strong>.</p>
              <p>Click the button below to access the log:</p>
              <a href="${shareableLink}" class="button">Complete Log</a>
              <div class="info-box">
                <p style="margin: 0;"><strong>No account required!</strong> You can fill out this log without creating an account. Just provide your name and email when you access the log.</p>
              </div>
              <p style="margin-top: 24px; font-size: 14px; color: #6b7280;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="${shareableLink}" style="color: #059669; word-break: break-all;">${shareableLink}</a>
              </p>
            </div>
            <div class="footer">
              <p><strong>MyDayLogs</strong> - Your Daily Task Management Solution</p>
              <p style="margin-top: 16px; font-size: 12px;">
                This is an automated message. Please do not reply to this email.
              </p>
            </div>
          </div>
        </body>
      </html>
    `
    // </CHANGE>

    const result = await sendEmail({
      to: contractorEmail,
      subject: `Complete Log: ${templateName} - MyDayLogs`,
      html: emailHtml,
      from: "MyDayLogs <noreply@mydaylogs.co.uk>",
    })

    if (result.success) {
      const { error: insertError } = await supabase.from("contractor_emails_sent").insert({
        organization_id: organizationId,
        template_id: request.url.includes("templateId") ? new URL(request.url).searchParams.get("templateId") : null,
        contractor_email: contractorEmail,
        contractor_name: contractorName,
        billing_cycle_start: billingCycleStart,
        sent_at: new Date().toISOString(),
      })

      if (insertError) {
        console.error("[v0] Failed to track email send:", insertError)
        // Don't fail the request if tracking fails
      }
      // </CHANGE>

      console.log("[v0] Contractor link email sent successfully")
      return NextResponse.json({ success: true })
    } else {
      console.error("[v0] Failed to send contractor link email:", result.error)
      return NextResponse.json({ error: "Failed to send email" }, { status: 500 })
    }
  } catch (error) {
    console.error("[v0] Error in send-contractor-link API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
