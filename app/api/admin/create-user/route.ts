import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"
import { checkCanCreateTeamMember, checkCanCreateAdmin } from "@/lib/subscription-limits"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, firstName, lastName, position, role, organizationId, reportsTo } = body

    const supabase = await createClient()

    // Verify the requesting user is an admin
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { data: requestingProfile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    if (requestingProfile?.role !== "admin" && requestingProfile?.role !== "manager") {
      return NextResponse.json({ message: "Only admins and managers can create team members" }, { status: 403 })
    }

    const teamMemberCheck = await checkCanCreateTeamMember(organizationId)
    if (!teamMemberCheck.canCreate) {
      return NextResponse.json(
        {
          message: "Team member limit reached",
          error: teamMemberCheck.reason,
          currentCount: teamMemberCheck.currentCount,
          maxAllowed: teamMemberCheck.maxAllowed,
        },
        { status: 403 },
      )
    }
    // </CHANGE>

    if (role === "admin" || role === "manager") {
      const adminCheck = await checkCanCreateAdmin(organizationId)
      if (!adminCheck.canCreate) {
        return NextResponse.json(
          {
            message: "Admin/manager limit reached",
            error: adminCheck.reason,
            currentCount: adminCheck.currentCount,
            maxAllowed: adminCheck.maxAllowed,
            requiresUpgrade: adminCheck.requiresUpgrade,
          },
          { status: 403 },
        )
      }
    }
    // </CHANGE>

    const adminSupabase = createAdminClient()

    const { data: newUser, error: createError } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (createError) {
      console.error("[v0] Supabase createUser error:", createError)
      return NextResponse.json(
        {
          message: `User creation failed: ${createError.message}`,
          error: createError,
        },
        { status: 400 },
      )
    }

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
