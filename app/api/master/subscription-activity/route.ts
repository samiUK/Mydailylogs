import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getMasterAuthPayload } from "@/lib/master-auth-jwt"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

export async function GET(request: NextRequest) {
  try {
    // Verify master admin authentication
    const authPayload = await getMasterAuthPayload()
    if (!authPayload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Fetch subscription activity logs
    const { data: activities, error } = await supabase
      .from("subscription_activity_logs")
      .select(
        `
        *,
        organizations!subscription_activity_logs_organization_id_fkey (
          organization_name
        )
      `,
      )
      .order("created_at", { ascending: false })
      .limit(500)

    if (error) {
      console.error("[v0] Error fetching subscription activities:", error)
      return NextResponse.json({ error: "Failed to fetch activities" }, { status: 500 })
    }

    // Format the response with organization names
    const formattedActivities = activities.map((activity) => ({
      ...activity,
      organization_name: activity.organizations?.organization_name || "Unknown",
    }))

    return NextResponse.json({ activities: formattedActivities })
  } catch (error) {
    console.error("[v0] Error in subscription activity route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
