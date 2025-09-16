import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get all profiles for this user (across different organizations)
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select(`
        id,
        role,
        organization_id,
        organizations!inner(
          organization_id,
          organization_name,
          slug
        )
      `)
      .eq("email", user.email)

    if (profilesError) {
      console.error("Error fetching user organizations:", profilesError)
      return NextResponse.json({ error: "Failed to fetch organizations" }, { status: 500 })
    }

    // Transform the data to include organization info with role
    const organizations =
      profiles?.map((profile) => ({
        id: profile.organizations[0].organization_id,
        name: profile.organizations[0].organization_name,
        slug: profile.organizations[0].slug,
        role: profile.role,
        profileId: profile.id,
        isActive: profile.id === user.id, // Current active profile
      })) || []

    return NextResponse.json({ organizations })
  } catch (error) {
    console.error("Error in organizations API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
