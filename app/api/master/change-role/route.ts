import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { profileId, newRole, organizationId } = await req.json()

    if (!profileId || !newRole || !organizationId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Validate role
    if (!["admin", "manager", "staff"].includes(newRole)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 })
    }

    // Get the profile to check current role
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, full_name, organization_id")
      .eq("id", profileId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    // Verify organization match
    if (profile.organization_id !== organizationId) {
      return NextResponse.json({ error: "Organization mismatch" }, { status: 403 })
    }

    // Count current admins in the organization
    const { count: adminCount } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("role", "admin")

    // If changing FROM admin TO manager/staff, ensure there's at least one admin remaining
    if (profile.role === "admin" && newRole !== "admin") {
      if (adminCount === 1) {
        return NextResponse.json(
          { error: "Cannot change the only admin. Promote another user to admin first." },
          { status: 400 },
        )
      }
    }

    // Update the role
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .eq("id", profileId)

    if (updateError) {
      console.error("Error updating role:", updateError)
      return NextResponse.json({ error: "Failed to update role" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Successfully changed ${profile.full_name} to ${newRole}`,
    })
  } catch (error) {
    console.error("Error in change-role:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
