import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/admin"
import { cookies } from "next/headers"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    // Check master admin authentication
    const cookieStore = await cookies()
    const masterAdminAuth = cookieStore.get("master-admin-session")?.value
    const masterAdminEmail = cookieStore.get("masterAdminEmail")?.value

    if (masterAdminAuth !== "authenticated" || masterAdminEmail !== "arsami.uk@gmail.com") {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const supabase = createClient()

    // Get database size using RPC function
    const { data: sizeData, error: sizeError } = await supabase.rpc("get_database_size")

    if (sizeError) {
      console.error("[v0] Error fetching database size:", sizeError)
      throw sizeError
    }

    const dbSizeBytes = sizeData?.total_size || 0
    const dbSizeMB = dbSizeBytes / 1024 / 1024

    // Update last activity check to prevent auto-pause
    await supabase.from("system_config").upsert({
      key: "last_activity_check",
      value: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      dbSizeBytes,
      dbSizeMB: dbSizeMB.toFixed(2),
    })
  } catch (error) {
    console.error("[v0] Server stats error:", error)
    return NextResponse.json({ error: "Failed to fetch server statistics" }, { status: 500 })
  }
}
