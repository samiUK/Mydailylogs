import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] API: get-user-profile called")
    const { email, profileId } = await request.json()
    console.log("[v0] API: Requested email:", email)
    console.log("[v0] API: Requested profileId:", profileId)

    if (!email) {
      console.log("[v0] API: No email provided")
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    console.log("[v0] API: Supabase client created, querying profiles...")

    let profileQuery = supabase
      .from("profiles")
      .select("role, id, organization_id, email, organization_name")
      .eq("email", email)

    if (profileId) {
      profileQuery = profileQuery.eq("id", profileId)
    }

    const { data: userProfiles, error: profileError } = await profileQuery

    console.log("[v0] API: Profile query result:", { userProfiles, profileError })

    if (profileError || !userProfiles || userProfiles.length === 0) {
      console.log("[v0] API: User profile not found")
      return NextResponse.json({ error: "User profile not found" }, { status: 404 })
    }

    const userProfile = userProfiles[0]

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
