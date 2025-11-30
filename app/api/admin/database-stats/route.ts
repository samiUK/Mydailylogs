import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/admin"

export async function GET() {
  try {
    const supabase = createClient()

    // Get database size
    let databaseSize = "0 MB"
    let totalSizeBytes = 0

    const tables = [
      "profiles",
      "organizations",
      "daily_checklists",
      "checklist_templates",
      "checklist_responses",
      "submitted_reports",
      "notifications",
      "holidays",
      "staff_unavailability",
      "report_audit_logs",
      "report_backups",
      "subscriptions",
      "payments",
      "feedback",
      "superusers",
      "password_reset_tokens",
      "impersonation_tokens",
    ]

    let totalRows = 0
    for (const table of tables) {
      try {
        const { count } = await supabase.from(table).select("*", { count: "exact", head: true })
        totalRows += count || 0
      } catch (err) {
        // Skip tables that don't exist
        continue
      }
    }

    // Rough estimate: average 2KB per row
    totalSizeBytes = totalRows * 2048
    databaseSize = `~${formatBytes(totalSizeBytes)}`

    // Get notification count (sent emails)
    let sentEmailsCount = 0
    try {
      const { count } = await supabase.from("notifications").select("*", { count: "exact", head: true })
      sentEmailsCount = count || 0
    } catch (err) {
      console.error("[v0] Error fetching notifications count:", err)
    }

    return NextResponse.json({
      success: true,
      databaseSize,
      totalSizeBytes,
      totalBandwidthBytes: 0, // Not tracking bandwidth yet
      sentEmailsCount,
    })
  } catch (error) {
    console.error("[v0] Database stats fetch error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 MB"

  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
}
