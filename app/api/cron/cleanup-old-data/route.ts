import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { getSubscriptionLimits } from "@/lib/subscription-limits"

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createClient()
    let deletedReports = 0
    let deletedLogs = 0

    // Get all organizations
    const { data: organizations } = await supabase.from("organizations").select("organization_id")

    if (!organizations) {
      return NextResponse.json({ message: "No organizations found" })
    }

    for (const org of organizations) {
      const limits = await getSubscriptionLimits(org.organization_id)

      // Determine retention period based on subscription
      let reportRetentionDays = 90 // Starter: 90 days
      let logRetentionDays = 30 // Starter: 30 days

      if (limits.planName === "growth") {
        reportRetentionDays = 180 // Growth: 6 months
        logRetentionDays = 90 // Growth: 90 days
      } else if (limits.planName === "scale") {
        reportRetentionDays = 365 // Scale: 1 year
        logRetentionDays = 90 // Scale: 90 days
      }

      const reportCutoffDate = new Date()
      reportCutoffDate.setDate(reportCutoffDate.getDate() - reportRetentionDays)

      const logCutoffDate = new Date()
      logCutoffDate.setDate(logCutoffDate.getDate() - logRetentionDays)

      // Delete old submitted reports
      const { data: oldReports, error: reportsError } = await supabase
        .from("submitted_reports")
        .delete()
        .eq("organization_id", org.organization_id)
        .lt("submitted_at", reportCutoffDate.toISOString())
        .select("id")

      if (oldReports) {
        deletedReports += oldReports.length
        console.log(
          `[v0] Deleted ${oldReports.length} reports older than ${reportRetentionDays} days for org ${org.organization_id}`,
        )
      }

      if (reportsError) {
        console.error(`[v0] Error deleting reports for org ${org.organization_id}:`, reportsError)
      }

      // Delete old audit logs
      const { data: oldLogs, error: logsError } = await supabase
        .from("report_audit_logs")
        .delete()
        .eq("organization_id", org.organization_id)
        .lt("created_at", logCutoffDate.toISOString())
        .select("id")

      if (oldLogs) {
        deletedLogs += oldLogs.length
        console.log(
          `[v0] Deleted ${oldLogs.length} audit logs older than ${logRetentionDays} days for org ${org.organization_id}`,
        )
      }

      if (logsError) {
        console.error(`[v0] Error deleting logs for org ${org.organization_id}:`, logsError)
      }

      // Delete old daily checklists that are completed
      const { data: oldChecklists } = await supabase
        .from("daily_checklists")
        .delete()
        .eq("organization_id", org.organization_id)
        .eq("status", "completed")
        .lt("completed_at", reportCutoffDate.toISOString())
        .select("id")

      if (oldChecklists) {
        console.log(`[v0] Deleted ${oldChecklists.length} old completed checklists for org ${org.organization_id}`)
      }
    }

    return NextResponse.json({
      message: "Cleanup completed successfully",
      deletedReports,
      deletedLogs,
      organizationsProcessed: organizations.length,
    })
  } catch (error) {
    console.error("Error during cleanup:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
