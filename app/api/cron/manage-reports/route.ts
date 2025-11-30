import { NextResponse } from "next"
import { createClient } from "@/lib/supabase/server"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function GET(request: Request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createClient()

    // Step 1: Email monthly reports to all organizations
    const { data: orgs } = await supabase
      .from("profiles")
      .select("organization_id, organization_name, subscription_tier")
      .not("organization_id", "is", null)
      .order("organization_id")

    const uniqueOrgs = Array.from(new Map(orgs?.map((o) => [o.organization_id, o]) || []).values())

    let emailsSent = 0

    for (const org of uniqueOrgs) {
      // Get admins and managers for this organization
      const { data: managers } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("organization_id", org.organization_id)
        .in("role", ["admin", "manager"])

      if (!managers || managers.length === 0) continue

      // Get reports from last 30 days
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { data: reports } = await supabase
        .from("submitted_reports")
        .select("id, report_data, submitted_at, submitted_by")
        .eq("organization_id", org.organization_id)
        .gte("submitted_at", thirtyDaysAgo.toISOString())
        .order("submitted_at", { ascending: false })

      if (!reports || reports.length === 0) continue

      // Send email to all admins/managers
      for (const manager of managers) {
        try {
          await resend.emails.send({
            from: "MyDayLogs <noreply@mydaylogs.com>",
            to: manager.email,
            subject: `Monthly Report Summary - ${org.organization_name}`,
            html: `
              <h2>Monthly Report Summary</h2>
              <p>Hello ${manager.full_name},</p>
              <p>Here's a summary of reports submitted in the last 30 days for ${org.organization_name}:</p>
              <p><strong>Total Reports:</strong> ${reports.length}</p>
              <hr />
              ${reports
                .map(
                  (report) => `
                <div style="margin: 20px 0; padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px;">
                  <p><strong>Date:</strong> ${new Date(report.submitted_at).toLocaleDateString()}</p>
                  <p><strong>Submitted by:</strong> ${report.submitted_by || "N/A"}</p>
                  ${
                    report.report_data
                      ? `<pre style="background: #f3f4f6; padding: 10px; border-radius: 4px; overflow-x: auto;">${JSON.stringify(report.report_data, null, 2)}</pre>`
                      : ""
                  }
                </div>
              `,
                )
                .join("")}
              <hr />
              <p style="color: #6b7280; font-size: 12px;">Note: Reports are automatically deleted after ${
                org.subscription_tier === "starter" ? "30" : "90"
              } days as per your ${org.subscription_tier} plan.</p>
              <p style="color: #6b7280; font-size: 12px;">This is an automated monthly email from MyDayLogs.</p>
            `,
          })
          emailsSent++
        } catch (error) {
          console.error(`Failed to send email to ${manager.email}:`, error)
        }
      }
    }

    // Step 2: Delete old reports based on subscription tier
    const { data: allOrgs } = await supabase
      .from("profiles")
      .select("organization_id, subscription_tier")
      .not("organization_id", "is", null)

    const orgRetentionMap = new Map()
    allOrgs?.forEach((org) => {
      const retentionDays = org.subscription_tier === "starter" ? 30 : 90
      if (!orgRetentionMap.has(org.organization_id) || orgRetentionMap.get(org.organization_id) < retentionDays) {
        orgRetentionMap.set(org.organization_id, retentionDays)
      }
    })

    let totalDeleted = 0

    for (const [orgId, retentionDays] of orgRetentionMap.entries()) {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

      const { error } = await supabase
        .from("submitted_reports")
        .delete()
        .eq("organization_id", orgId)
        .lt("submitted_at", cutoffDate.toISOString())

      if (!error) {
        const { count } = await supabase
          .from("submitted_reports")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", orgId)
          .lt("submitted_at", cutoffDate.toISOString())

        totalDeleted += count || 0
      }
    }

    return NextResponse.json({
      success: true,
      emailsSent,
      reportsDeleted: totalDeleted,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Report management cron error:", error)
    return NextResponse.json({ error: "Failed to manage reports" }, { status: 500 })
  }
}
