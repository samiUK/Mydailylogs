import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@/lib/supabase/admin"
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
    const adminSupabase = createAdminClient()
    let deletedReports = 0
    let deletedLogs = 0
    let deletedPhotos = 0

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

      const { data: oldReportsToDelete, error: fetchError } = await supabase
        .from("submitted_reports")
        .select("id, report_data")
        .eq("organization_id", org.organization_id)
        .lt("submitted_at", reportCutoffDate.toISOString())

      if (oldReportsToDelete && oldReportsToDelete.length > 0) {
        // Extract and delete photos from Supabase Storage
        for (const report of oldReportsToDelete) {
          if (report.report_data?.responses) {
            for (const response of report.report_data.responses) {
              if (response.type === "photo" && response.value) {
                try {
                  const photoData = JSON.parse(response.value)
                  if (Array.isArray(photoData)) {
                    for (const photo of photoData) {
                      if (photo.url) {
                        const urlParts = photo.url.split("/report-photos/")
                        if (urlParts.length > 1) {
                          const filePath = urlParts[1]
                          const { error: storageError } = await adminSupabase.storage
                            .from("report-photos")
                            .remove([filePath])
                          if (!storageError) {
                            deletedPhotos++
                          }
                        }
                      }
                    }
                  }
                } catch (err) {
                  console.error("[v0] Error deleting photo:", err)
                }
              }
            }
          }
        }

        // Now delete the report records from database
        const reportIds = oldReportsToDelete.map((r) => r.id)
        const { data: deletedRecords } = await supabase
          .from("submitted_reports")
          .delete()
          .in("id", reportIds)
          .select("id")

        if (deletedRecords) {
          deletedReports += deletedRecords.length
          console.log(
            `[v0] Deleted ${deletedRecords.length} reports and ${deletedPhotos} photos older than ${reportRetentionDays} days for org ${org.organization_id}`,
          )
        }
      }

      if (fetchError) {
        console.error(`[v0] Error fetching reports for org ${org.organization_id}:`, fetchError)
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
      deletedPhotos,
      deletedLogs,
      organizationsProcessed: organizations.length,
    })
  } catch (error) {
    console.error("Error during cleanup:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
