import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 })
    }

    // Get organization created date for 30-day cycle
    const { data: org } = await supabase
      .from("organizations")
      .select("created_at")
      .eq("id", profile.organization_id)
      .single()

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    // Calculate current 30-day period start date
    const orgCreatedDate = new Date(org.created_at)
    const now = new Date()

    // Calculate how many 30-day periods have passed
    const daysSinceCreation = Math.floor((now.getTime() - orgCreatedDate.getTime()) / (1000 * 60 * 60 * 24))
    const periodNumber = Math.floor(daysSinceCreation / 30)

    // Calculate the start of current period
    const currentPeriodStart = new Date(orgCreatedDate)
    currentPeriodStart.setDate(currentPeriodStart.getDate() + periodNumber * 30)

    // Count submissions in current 30-day period
    const { count } = await supabase
      .from("submitted_reports")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", profile.organization_id)
      .gte("submitted_at", currentPeriodStart.toISOString())

    const nextResetDate = new Date(currentPeriodStart)
    nextResetDate.setDate(nextResetDate.getDate() + 30)

    return NextResponse.json({
      count: count || 0,
      periodStart: currentPeriodStart.toISOString(),
      nextReset: nextResetDate.toISOString(),
    })
  } catch (error) {
    console.error("Error fetching monthly submissions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
