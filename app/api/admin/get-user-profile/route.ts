import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] API: get-user-profile called")
    const { email } = await request.json()
    console.log("[v0] API: Requested email:", email)

    if (!email) {
      console.log("[v0] API: No email provided")
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    console.log("[v0] API: SUPABASE_URL exists:", !!process.env.NEXT_PUBLIC_SUPABASE_URL)
    console.log("[v0] API: SERVICE_ROLE_KEY exists:", !!process.env.SUPABASE_SERVICE_ROLE_KEY)

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    console.log("[v0] API: Supabase client created, querying profiles...")

    // Get the target user's profile
    const { data: userProfile, error: profileError } = await supabase
      .from("profiles")
      .select("role, id, organization_id, email")
      .eq("email", email)
      .single()

    console.log("[v0] API: Profile query result:", { userProfile, profileError })

    if (profileError || !userProfile) {
      console.log("[v0] API: User profile not found")
      return NextResponse.json({ error: "User profile not found" }, { status: 404 })
    }

    console.log("[v0] API: Returning successful response")
    return NextResponse.json({
      success: true,
      profile: userProfile,
    })
  } catch (error) {
    console.error("[v0] API: Error fetching user profile:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
