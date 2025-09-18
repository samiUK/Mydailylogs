import { createClient, createAdminClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, "") // Remove leading/trailing hyphens
}

export async function POST(request: Request) {
  try {
    console.log("[v0] Starting organization update API...")

    const cookieStore = await cookies()
    const supabase = await createClient()
    const adminSupabase = createAdminClient()

    // Check authentication (same logic as comprehensive sync)
    let user = null
    let isMasterAdmin = false

    const masterAdminEmail = cookieStore.get("masterAdminEmail")?.value
    const masterAdminImpersonation = cookieStore.get("masterAdminImpersonation")?.value

    if (masterAdminEmail && masterAdminImpersonation === "true") {
      console.log("[v0] Master admin authentication detected:", masterAdminEmail)
      const MASTER_EMAIL = "arsami.uk@gmail.com"
      if (masterAdminEmail === MASTER_EMAIL) {
        console.log("[v0] Master admin authenticated successfully")
        isMasterAdmin = true
        user = { email: masterAdminEmail, id: "master-admin" }
      }
    }

    if (!isMasterAdmin) {
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser()
      user = authUser

      if (authError || !user) {
        console.log("[v0] Authentication failed")
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }

      // Check if user is a superuser
      const { data: superuser, error: superuserError } = await adminSupabase
        .from("superusers")
        .select("*")
        .eq("email", user.email)
        .eq("is_active", true)
        .single()

      if (superuserError || !superuser) {
        console.log("[v0] User is not a superuser")
        return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
      }
    }

    const { organization_id, organization_name } = await request.json()

    if (!organization_id || !organization_name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    console.log("[v0] Updating organization:", organization_id, "to name:", organization_name)

    // Check if there's already an organization with this name (excluding the current one)
    const { data: existingOrgs, error: checkError } = await adminSupabase
      .from("organizations")
      .select("organization_id, organization_name")
      .eq("organization_name", organization_name.trim())
      .neq("organization_id", organization_id)

    if (checkError) {
      console.error("[v0] Error checking for duplicate organization name:", checkError)
      return NextResponse.json({ error: "Failed to validate organization name" }, { status: 500 })
    }

    // If there are duplicates, log them for debugging but allow the update
    // This handles cases where sync operations may have created duplicates
    if (existingOrgs && existingOrgs.length > 0) {
      console.log("[v0] Found existing organizations with same name:", existingOrgs.length)
      console.log("[v0] Existing orgs:", existingOrgs)

      // Only block if there's exactly one other organization with this name
      // If there are multiple, it suggests data inconsistency that needs fixing
      if (existingOrgs.length === 1) {
        console.log("[v0] Organization name already exists:", organization_name)
        return NextResponse.json(
          {
            error: `The organization name "${organization_name}" is already taken. Please choose a different name.`,
          },
          { status: 409 },
        )
      } else {
        console.log("[v0] Multiple duplicates detected - allowing update to consolidate data")
      }
    }

    const { error: orgError } = await adminSupabase
      .from("organizations")
      .update({
        organization_name: organization_name.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("organization_id", organization_id)

    if (orgError) {
      console.error("[v0] Organization update error:", orgError)
      return NextResponse.json({ error: "Failed to update organization" }, { status: 500 })
    }

    try {
      const { error: profileError } = await adminSupabase
        .from("profiles")
        .update({
          organization_name: organization_name.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("organization_id", organization_id)

      if (profileError) {
        console.error("[v0] Profile update error:", profileError)
        console.log("[v0] Organization updated but profile sync failed - this is non-critical")
      }
    } catch (profileUpdateError) {
      console.error("[v0] Profile update exception:", profileUpdateError)
    }

    console.log("[v0] Organization name updated successfully")

    return NextResponse.json({
      success: true,
      message: "Organization name updated successfully",
    })
  } catch (error) {
    console.error("[v0] Organization update API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
