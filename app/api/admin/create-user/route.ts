import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, firstName, lastName, position, role, organizationId, reportsTo } = body

    console.log("[v0] Creating user with data:", {
      email,
      firstName,
      lastName,
      position,
      role,
      organizationId,
      reportsTo,
    })

    const supabase = await createClient()

    // Verify the requesting user is an admin
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { data: requestingProfile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    if (requestingProfile?.role !== "admin") {
      return NextResponse.json({ message: "Only admins can create team members" }, { status: 403 })
    }

    const adminSupabase = createAdminClient()

    console.log("[v0] Creating user with admin client...")

    const { data: newUser, error: createError } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Skip email confirmation
    })

    if (createError) {
      console.error("[v0] Supabase createUser error:", createError)
      console.error("[v0] Error details:", JSON.stringify(createError, null, 2))
      return NextResponse.json(
        {
          message: `User creation failed: ${createError.message}`,
          error: createError,
        },
        { status: 400 },
      )
    }

    console.log("[v0] User created successfully:", newUser.user.id)

    console.log("[v0] Creating profile manually...")
    const { error: profileError } = await adminSupabase.from("profiles").insert({
      id: newUser.user.id,
      email,
      first_name: firstName,
      last_name: lastName,
      full_name: `${firstName} ${lastName}`,
      position,
      role,
      organization_id: organizationId,
      reports_to: reportsTo,
    })

    if (profileError) {
      console.error("[v0] Error creating profile:", profileError)
      await adminSupabase.auth.admin.deleteUser(newUser.user.id)
      return NextResponse.json(
        {
          message: `Profile creation failed: ${profileError.message}`,
          error: profileError,
        },
        { status: 500 },
      )
    }

    console.log("[v0] Profile created successfully")

    return NextResponse.json({
      message: "Team member created successfully",
      user: newUser.user,
    })
  } catch (error) {
    console.error("[v0] Unexpected error in create-user API:", error)
    return NextResponse.json(
      {
        message: `Internal server error: ${error instanceof Error ? error.message : "Unknown error"}`,
        error: error instanceof Error ? error.message : error,
      },
      { status: 500 },
    )
  }
}
