import { createClient, createAdminClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function DELETE(request: NextRequest) {
  try {
    console.log("[v0] Starting delete organization API...")

    const { organization_id } = await request.json()

    if (!organization_id) {
      console.log("[v0] Missing organization_id in request")
      return NextResponse.json({ error: "Organization ID is required" }, { status: 400 })
    }

    console.log("[v0] Deleting organization:", organization_id)

    const cookieStore = await cookies()
    const masterAdminAuth = cookieStore.get("master-admin-session")?.value
    const masterAdminEmail = cookieStore.get("masterAdminEmail")?.value

    console.log("[v0] Masteradmin cookie check - Auth:", masterAdminAuth === "authenticated" ? "Yes" : "No")
    console.log("[v0] Masteradmin cookie check - Email:", masterAdminEmail || "None")

    // If authenticated as masteradmin via cookie, allow deletion
    if (masterAdminAuth === "authenticated" && masterAdminEmail === "arsami.uk@gmail.com") {
      console.log("[v0] Masteradmin authenticated via cookie - proceeding with delete")
    } else {
      // Otherwise check if regular auth user is superuser or masteradmin
      const supabase = await createClient()

      console.log("[v0] Checking authentication...")

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      console.log("[v0] Auth check - User:", user?.email || "No user")
      console.log("[v0] Auth check - Error:", authError?.message || "No error")

      if (authError || !user) {
        console.log("[v0] Authentication failed - returning 401")
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }

      console.log("[v0] User authenticated, checking superuser or masteradmin status...")

      // Check if user is a superuser or masteradmin
      const [superuserResult, masteradminResult] = await Promise.all([
        supabase.from("superusers").select("*").eq("email", user.email).eq("is_active", true).single(),
        supabase.from("profiles").select("role").eq("user_id", user.id).eq("role", "masteradmin").single(),
      ])

      const isSuperuser = !superuserResult.error && superuserResult.data
      const isMasteradmin = !masteradminResult.error && masteradminResult.data

      console.log("[v0] Permission check - Superuser:", isSuperuser ? "Yes" : "No")
      console.log("[v0] Permission check - Masteradmin:", isMasteradmin ? "Yes" : "No")

      if (!isSuperuser && !isMasteradmin) {
        console.log("[v0] User is neither superuser nor masteradmin - returning 403")
        return NextResponse.json(
          { error: "Insufficient permissions. Only superusers and masteradmins can delete organizations." },
          { status: 403 },
        )
      }

      console.log("[v0] Permission granted, proceeding with delete...")
    }

    const adminSupabase = createAdminClient()

    console.log(`[v0] Starting cascading delete for organization: ${organization_id}`)

    const deletedCounts = {}

    // Step 1: Get all daily checklists for this organization
    const { data: dailyChecklists, error: checklistsError } = await adminSupabase
      .from("daily_checklists")
      .select("id")
      .eq("organization_id", organization_id)

    if (checklistsError) {
      console.error("Error fetching daily checklists:", checklistsError)
      return NextResponse.json({ error: "Failed to fetch daily checklists" }, { status: 500 })
    }

    const checklistIds = dailyChecklists?.map((c) => c.id) || []
    console.log(`[v0] Found ${checklistIds.length} daily checklists to process`)

    // Step 2: Delete checklist responses linked to these checklists
    if (checklistIds.length > 0) {
      const { data: deletedResponses, error: responsesError } = await adminSupabase
        .from("checklist_responses")
        .delete()
        .in("checklist_id", checklistIds)
        .select("id")

      if (responsesError) {
        console.error("Error deleting checklist responses:", responsesError)
        return NextResponse.json({ error: "Failed to delete checklist responses" }, { status: 500 })
      }

      const count = deletedResponses?.length || 0
      if (count > 0) {
        deletedCounts["checklist_responses"] = count
        console.log(`[v0] Deleted ${count} checklist responses`)
      }
    }

    // Step 3: Get all external submissions for this organization
    const { data: externalSubmissions, error: submissionsError } = await adminSupabase
      .from("external_submissions")
      .select("id")
      .eq("organization_id", organization_id)

    if (submissionsError) {
      console.error("Error fetching external submissions:", submissionsError)
      return NextResponse.json({ error: "Failed to fetch external submissions" }, { status: 500 })
    }

    const submissionIds = externalSubmissions?.map((s) => s.id) || []
    console.log(`[v0] Found ${submissionIds.length} external submissions to process`)

    // Step 4: Delete external responses linked to these submissions
    if (submissionIds.length > 0) {
      const { data: deletedExtResponses, error: extResponsesError } = await adminSupabase
        .from("external_responses")
        .delete()
        .in("submission_id", submissionIds)
        .select("id")

      if (extResponsesError) {
        console.error("Error deleting external responses:", extResponsesError)
        return NextResponse.json({ error: "Failed to delete external responses" }, { status: 500 })
      }

      const count = deletedExtResponses?.length || 0
      if (count > 0) {
        deletedCounts["external_responses"] = count
        console.log(`[v0] Deleted ${count} external responses`)
      }
    }

    // Step 5: Now delete everything else in proper order
    const deleteOperations = [
      { table: "daily_checklists", message: "daily checklists" },
      { table: "external_submissions", message: "external submissions" },
      { table: "template_assignments", message: "template assignments" },
      { table: "template_schedule_exclusions", message: "template schedule exclusions" },
      { table: "checklist_items", message: "checklist items" },
      { table: "checklist_templates", message: "checklist templates" },
      { table: "contractor_emails_sent", message: "contractor emails sent" },
      { table: "submitted_reports", message: "submitted reports" },
      { table: "report_backups", message: "report backups" },
      { table: "report_audit_logs", message: "report audit logs" },
      { table: "staff_unavailability", message: "staff unavailability records" },
      { table: "feedback", message: "feedback" },
      { table: "holidays", message: "holidays" },
      { table: "quota_modifications", message: "quota modifications" },
      { table: "payments", message: "payments" },
      { table: "subscriptions", message: "subscriptions" },
    ]

    for (const operation of deleteOperations) {
      const { data, error } = await adminSupabase
        .from(operation.table)
        .delete()
        .eq("organization_id", organization_id)
        .select("id")

      if (error) {
        console.error(`Error deleting ${operation.message}:`, error)
        return NextResponse.json({ error: `Failed to delete ${operation.message}` }, { status: 500 })
      }

      const count = data?.length || 0
      if (count > 0) {
        deletedCounts[operation.table] = count
        console.log(`[v0] Deleted ${count} ${operation.message}`)
      }
    }

    // Step 6: Delete profiles and related data
    const { data: profiles, error: profilesError } = await adminSupabase
      .from("profiles")
      .select("id")
      .eq("organization_id", organization_id)

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError)
      return NextResponse.json({ error: "Failed to fetch profiles" }, { status: 500 })
    }

    const profileIds = profiles?.map((p) => p.id) || []
    console.log(`[v0] Found ${profileIds.length} profiles to delete`)

    // Delete data linked to profiles
    if (profileIds.length > 0) {
      const profileDeletions = [
        { table: "notifications", message: "notifications" },
        { table: "report_access_sessions", message: "report access sessions" },
      ]

      for (const operation of profileDeletions) {
        const { data, error } = await adminSupabase
          .from(operation.table)
          .delete()
          .in("user_id", profileIds)
          .select("id")

        if (error) {
          console.error(`Error deleting ${operation.message}:`, error)
          // Continue even if this fails
        }

        const count = data?.length || 0
        if (count > 0) {
          deletedCounts[operation.table] = count
          console.log(`[v0] Deleted ${count} ${operation.message}`)
        }
      }

      // Delete profiles
      const { data: deletedProfiles, error: deleteProfilesError } = await adminSupabase
        .from("profiles")
        .delete()
        .eq("organization_id", organization_id)
        .select("id")

      if (deleteProfilesError) {
        console.error("Error deleting profiles:", deleteProfilesError)
        return NextResponse.json({ error: "Failed to delete profiles" }, { status: 500 })
      }

      const count = deletedProfiles?.length || 0
      if (count > 0) {
        deletedCounts["profiles"] = count
        console.log(`[v0] Deleted ${count} profiles`)
      }
    }

    // Step 7: Finally delete the organization
    const { data: deletedOrg, error: orgError } = await adminSupabase
      .from("organizations")
      .delete()
      .eq("organization_id", organization_id)
      .select("organization_id")

    if (orgError) {
      console.error("Error deleting organization:", orgError)
      return NextResponse.json({ error: "Failed to delete organization" }, { status: 500 })
    }

    const orgCount = deletedOrg?.length || 0
    if (orgCount > 0) {
      deletedCounts["organizations"] = orgCount
      console.log(`[v0] Deleted organization`)
    }

    console.log(`[v0] Cascading delete completed for organization: ${organization_id}`)
    console.log(`[v0] Deletion summary:`, deletedCounts)

    return NextResponse.json({
      success: true,
      message: "Organization and all associated data deleted successfully",
      deletedCounts,
    })
  } catch (error) {
    console.error("Delete organization error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
