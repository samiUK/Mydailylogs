import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getMasterAuthPayload } from "@/lib/master-auth-jwt"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const payload = await getMasterAuthPayload()

    if (!payload || (payload.role !== "masteradmin" && payload.role !== "superuser")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()

    // Fetch audit logs from superuser_audit_logs table
    const { data: logs, error } = await supabase
      .from("superuser_audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100)

    if (error) {
      console.error("[v0] Error fetching audit logs:", error)
      return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      logs: logs || [],
    })
  } catch (error: any) {
    console.error("[v0] Audit log fetch error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
