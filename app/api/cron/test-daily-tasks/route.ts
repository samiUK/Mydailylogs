import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = createClient()
    const today = new Date().toISOString().split("T")[0]

    console.log(`[v0] Testing daily task recreation for ${today}`)
    console.log(`[v0] CRON_SECRET status: ${process.env.CRON_SECRET ? "Set" : "Not set (development mode)"}`)

    const { data: templates, count } = await supabase
      .from("checklist_templates")
      .select("id, title, recurrence_type", { count: "exact" })
      .eq("is_recurring", true)
      .in("recurrence_type", ["daily", "weekly", "monthly"])

    const { data: existingChecklists, count: existingCount } = await supabase
      .from("daily_checklists")
      .select("id", { count: "exact" })
      .eq("date", today)

    return NextResponse.json({
      success: true,
      date: today,
      recurringTemplates: count || 0,
      existingDailyChecklists: existingCount || 0,
      templates: templates || [],
      message: "Test completed - check logs for detailed information",
    })
  } catch (error) {
    console.error("[v0] Test daily task recreation failed:", error)
    return NextResponse.json({ error: "Test failed" }, { status: 500 })
  }
}
