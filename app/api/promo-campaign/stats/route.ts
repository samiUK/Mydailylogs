import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getCampaignStats } from "@/lib/promo-campaign"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify master admin access
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("profiles").select("email, role").eq("id", user.id).single()

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    // Check if user is master admin
    const { data: superuser } = await supabase
      .from("superusers")
      .select("*")
      .eq("email", profile.email)
      .eq("role", "master_admin")
      .single()

    if (!superuser) {
      return NextResponse.json({ error: "Forbidden: Master admin access required" }, { status: 403 })
    }

    // Get campaign statistics
    const stats = await getCampaignStats()

    if (!stats) {
      return NextResponse.json({ error: "Failed to fetch campaign statistics" }, { status: 500 })
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error("[v0] Campaign stats error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
