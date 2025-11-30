import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function GET(request: Request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    console.log("[v0] Starting server usage monitoring...")

    const { data: sizeData, error: sizeError } = await supabase.rpc("get_database_size")

    if (sizeError) {
      console.error("[v0] Error fetching database size:", sizeError)
      throw sizeError
    }

    const dbSizeMB = (sizeData?.total_size || 0) / 1024 / 1024

    console.log(`[v0] Database size: ${dbSizeMB.toFixed(2)} MB`)

    // Check if approaching limits
    if (dbSizeMB > 400) {
      console.warn(`[v0] ⚠️ Database usage critical: ${dbSizeMB.toFixed(2)} MB / 500 MB`)
    } else if (dbSizeMB > 250) {
      console.warn(`[v0] ⚠️ Database usage moderate: ${dbSizeMB.toFixed(2)} MB / 500 MB`)
    } else {
      console.log(`[v0] ✓ Database usage healthy: ${dbSizeMB.toFixed(2)} MB / 500 MB`)
    }

    // Supabase pauses databases after 7 days of inactivity - this query keeps it active
    const { data: keepAlive } = await supabase
      .from("system_config")
      .select("key")
      .eq("key", "last_activity_check")
      .single()

    await supabase.from("system_config").upsert({
      key: "last_activity_check",
      value: new Date().toISOString(),
    })

    console.log("[v0] ✓ Database activity recorded. Auto-pause prevented.")

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      dbSizeMB: dbSizeMB.toFixed(2),
      status: "Database kept active to prevent auto-pause",
    })
  } catch (error) {
    console.error("[v0] Server monitoring error:", error)
    return NextResponse.json({ error: "Failed to monitor server usage" }, { status: 500 })
  }
}
