import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(request: NextRequest) {
  try {
    // Check master admin authentication
    const masterAdminCookie = request.cookies.get("masterAdminImpersonation")
    if (!masterAdminCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const [{ data: organizations }, { data: subscriptions }] = await Promise.all([
      supabase.from("organizations").select("*").order("created_at", { ascending: false }),
      supabase.from("subscriptions").select("*"),
    ])

    return NextResponse.json({
      organizations: organizations || [],
      subscriptions: subscriptions || [],
    })
  } catch (error) {
    console.error("[v0] Error fetching organizations data:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
