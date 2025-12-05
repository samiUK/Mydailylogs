import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email")

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    // Get organization by email
    const { data: profile } = await supabase.from("profiles").select("*").eq("email", email).single()

    if (!profile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const { data: org } = await supabase.from("organizations").select("*").eq("owner_id", profile.id).single()

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    // Check subscription activity logs
    const { data: activityLogs } = await supabase
      .from("subscription_activity_logs")
      .select("*")
      .eq("organization_id", org.id)
      .order("created_at", { ascending: false })
      .limit(20)

    // Check current subscription
    const { data: currentSub } = await supabase.from("subscriptions").select("*").eq("organization_id", org.id).single()

    return NextResponse.json({
      email,
      organizationId: org.id,
      organizationName: org.name,
      currentSubscription: currentSub,
      activityLogs: activityLogs || [],
      webhookCount: activityLogs?.filter((log) => log.triggered_by === "stripe_webhook").length || 0,
      manualSyncCount: activityLogs?.filter((log) => log.triggered_by === "admin_force_sync").length || 0,
    })
  } catch (error: any) {
    console.error("[v0] Webhook check error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
