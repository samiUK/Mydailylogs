import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    console.log("[v0] Fetching database size...")

    const supabase = createClient()

    // Query to get database size using pg_database_size
    // Note: This requires appropriate permissions in Supabase
    const { data, error } = await supabase.rpc("get_database_size")

    if (error) {
      console.error("[v0] Database size query error:", error)

      // Fallback: Calculate approximate size from table statistics
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
        const { count } = await supabase.from(table).select("*", { count: "exact", head: true })
        totalRows += count || 0
      }

      // Rough estimate: average 2KB per row
      const estimatedBytes = totalRows * 2048
      const formattedSize = formatBytes(estimatedBytes)

      console.log("[v0] Database size (estimated):", formattedSize, "from", totalRows, "total rows")

      return NextResponse.json({
        success: true,
        size: `~${formattedSize}`,
        estimated: true,
      })
    }

    const sizeInBytes = data || 0
    const formattedSize = formatBytes(sizeInBytes)

    console.log("[v0] Database size:", formattedSize)

    return NextResponse.json({
      success: true,
      size: formattedSize,
      estimated: false,
    })
  } catch (error) {
    console.error("[v0] Database size fetch error:", error)
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
