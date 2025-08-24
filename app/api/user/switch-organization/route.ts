import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { profileId } = await request.json()

    if (!profileId) {
      return NextResponse.json({ error: "Profile ID is required" }, { status: 400 })
    }

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify the profile belongs to this user's email
    const { data: targetProfile, error: profileError } = await supabase
      .from("profiles")
      .select(`
        id,
        email,
        role,
        organization_id,
        organizations!inner(
          id,
          name,
          slug
        )
      `)
      .eq("id", profileId)
      .eq("email", user.email)
      .single()

    if (profileError || !targetProfile) {
      return NextResponse.json({ error: "Profile not found or access denied" }, { status: 404 })
    }

    // Return the organization switch information
    // The frontend will handle the actual switching logic
    return NextResponse.json({
      success: true,
      profile: targetProfile,
      redirectPath: targetProfile.role === "admin" ? "/admin" : "/staff",
    })
  } catch (error) {
    console.error("Error switching organization:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
