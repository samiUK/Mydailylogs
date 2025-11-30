import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { sendEmail, emailTemplates } from "@/lib/email/resend"

export async function POST(request: NextRequest) {
  try {
    const { organizationId } = await request.json()

    if (!organizationId) {
      return NextResponse.json({ error: "Organization ID required" }, { status: 400 })
    }

    const supabase = await createClient()

    // Get organization details
    const { data: org } = await supabase
      .from("organizations")
      .select("organization_name")
      .eq("organization_id", organizationId)
      .single()

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    // Get all admins and managers for this organization
    const { data: recipients } = await supabase
      .from("profiles")
      .select("id, email, full_name, first_name")
      .eq("organization_id", organizationId)
      .in("role", ["admin", "manager"])

    if (!recipients || recipients.length === 0) {
      return NextResponse.json({ error: "No admins/managers found for this organization" }, { status: 404 })
    }

    // Get reports from last 90 days
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

    const { data: reports } = await supabase
      .from("submitted_reports")
      .select(`
        id,
        submitted_at,
        report_data,
        checklist_templates(name),
        profiles(full_name, email)
      `)
      .eq("organization_id", organizationId)
      .gte("submitted_at", ninetyDaysAgo.toISOString())
      .order("submitted_at", { ascending: false })

    if (!reports || reports.length === 0) {
      return NextResponse.json({ error: "No reports found in the last 90 days" }, { status: 404 })
    }

    // Build HTML report summary
    const reportRows = reports
      .map(
        (report) => `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 12px; text-align: left;">${new Date(report.submitted_at).toLocaleDateString()}</td>
        <td style="padding: 12px; text-align: left;">${report.checklist_templates?.name || "N/A"}</td>
        <td style="padding: 12px; text-align: left;">${report.profiles?.full_name || "N/A"}</td>
        <td style="padding: 12px; text-align: left;">
          <a href="${process.env.NEXT_PUBLIC_SITE_URL}/admin/reports/${report.id}" style="color: #3b82f6; text-decoration: underline;">View</a>
        </td>
      </tr>
    `,
      )
      .join("")

    // Send email to each admin/manager
    let emailsSent = 0
    for (const recipient of recipients) {
      try {
        await sendEmail({
          to: recipient.email,
          subject: `${org.organization_name} - Reports Summary (Last 90 Days)`,
          html: `
            ${emailTemplates.getEmailHeader()}
            <div style="padding: 30px; font-family: Arial, sans-serif; line-height: 1.6; color: #374151;">
              <h2 style="color: #1f2937; margin-bottom: 20px;">Reports Summary for ${org.organization_name}</h2>
              
              <p>Hi ${recipient.first_name || recipient.full_name},</p>
              
              <p>Here is a summary of all reports submitted by your team in the last 90 days.</p>
              
              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; font-size: 18px;"><strong>Total Reports:</strong> ${reports.length}</p>
                <p style="margin: 8px 0 0 0; font-size: 14px; color: #6b7280;">
                  Period: ${ninetyDaysAgo.toLocaleDateString()} - ${new Date().toLocaleDateString()}
                </p>
              </div>
              
              <h3 style="color: #1f2937; margin-top: 30px; margin-bottom: 15px;">Report Details</h3>
              
              <table style="width: 100%; border-collapse: collapse; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <thead>
                  <tr style="background-color: #f9fafb; border-bottom: 2px solid #e5e7eb;">
                    <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Date</th>
                    <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Checklist</th>
                    <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Submitted By</th>
                    <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Action</th>
                  </tr>
                </thead>
                <tbody>
                  ${reportRows}
                </tbody>
              </table>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.NEXT_PUBLIC_SITE_URL}/admin/reports" style="background-color: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View All Reports</a>
              </div>
              
              <p style="font-size: 12px; color: #6b7280; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <strong>Note:</strong> Reports older than ${org.subscription_tier === "starter" ? "30" : "90"} days are automatically removed from our system to optimize storage. Please download and archive any reports you need for long-term record keeping.
              </p>
              
              <p>Best regards,<br>
              <strong>The MyDayLogs Team</strong></p>
            </div>
            ${emailTemplates.getEmailFooter()}
          `,
        })
        emailsSent++
      } catch (emailError) {
        console.error(`[v0] Failed to send report email to ${recipient.email}:`, emailError)
      }
    }

    if (emailsSent > 0) {
      await supabase
        .from("organizations")
        .update({ last_report_email_sent: new Date().toISOString() })
        .eq("organization_id", organizationId)
    }

    return NextResponse.json({
      success: true,
      message: `Sent ${emailsSent} report summary email(s) to admins/managers`,
      reportCount: reports.length,
      emailsSent,
    })
  } catch (error) {
    console.error("[v0] Error sending organization reports:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
