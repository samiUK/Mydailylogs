import { createClient, createAdminClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { organization_id } = await request.json()

    if (!organization_id) {
      return NextResponse.json({ error: "Organization ID is required" }, { status: 400 })
    }

    const supabase = await createClient()
    const adminSupabase = createAdminClient()

    // Check if user is authenticated and is a superuser
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is a superuser
    const { data: superuser } = await supabase
      .from("superusers")
      .select("*")
      .eq("email", user.email)
      .eq("is_active", true)
      .single()

    if (!superuser) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    const archiveTimestamp = new Date().toISOString()
    const archiveDate = archiveTimestamp.split("T")[0]

    console.log(`[v0] Starting cascading archive for organization: ${organization_id}`)

    // Get current organization name for archiving
    const { data: orgData } = await adminSupabase
      .from("organizations")
      .select("organization_name")
      .eq("organization_id", organization_id)
      .single()

    const currentOrgName = orgData?.organization_name || "Unknown"

    // Archive organization
    const { error: orgUpdateError } = await adminSupabase
      .from("organizations")
      .update({
        organization_name: `[ARCHIVED-${archiveDate}] ${currentOrgName}`,
        updated_at: archiveTimestamp,
      })
      .eq("organization_id", organization_id)

    if (orgUpdateError) {
      console.error("Archive organization error:", orgUpdateError)
      return NextResponse.json({ error: "Failed to archive organization" }, { status: 500 })
    }

    // Archive all users (profiles) in this organization
    const { data: archivedProfiles, error: profilesError } = await adminSupabase
      .from("profiles")
      .update({
        full_name: `[ARCHIVED-${archiveDate}] ${adminSupabase.raw("COALESCE(full_name, email)")}`,
        updated_at: archiveTimestamp,
      })
      .eq("organization_id", organization_id)
      .select("id, email, full_name")

    if (profilesError) {
      console.error("Archive profiles error:", profilesError)
      return NextResponse.json({ error: "Failed to archive user profiles" }, { status: 500 })
    }

    // Archive checklist templates
    const { data: archivedTemplates, error: templatesError } = await adminSupabase
      .from("checklist_templates")
      .update({
        name: `[ARCHIVED-${archiveDate}] ${adminSupabase.raw("name")}`,
        is_active: false,
        updated_at: archiveTimestamp,
      })
      .eq("organization_id", organization_id)
      .select("id, name")

    if (templatesError) {
      console.error("Archive templates error:", templatesError)
    }

    // Deactivate template assignments
    const { data: deactivatedAssignments, error: assignmentsError } = await adminSupabase
      .from("template_assignments")
      .update({
        is_active: false,
        updated_at: archiveTimestamp,
      })
      .eq("organization_id", organization_id)
      .select("id")

    if (assignmentsError) {
      console.error("Deactivate assignments error:", assignmentsError)
    }

    const archivedCount = {
      organization: 1,
      profiles: archivedProfiles?.length || 0,
      templates: archivedTemplates?.length || 0,
      assignments: deactivatedAssignments?.length || 0,
    }

    console.log(`[v0] Cascading archive completed for organization: ${organization_id}`)
    console.log(`[v0] Archive summary:`, archivedCount)

    return NextResponse.json({
      success: true,
      message: "Organization and all associated users/data archived successfully",
      archivedCount,
    })
  } catch (error) {
    console.error("Archive organization error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
