import { createClient, createAdminClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function DELETE(request: NextRequest) {
  try {
    console.log("[v0] Starting delete organization API...")

    const { organization_id } = await request.json()

    if (!organization_id) {
      console.log("[v0] Missing organization_id in request")
      return NextResponse.json({ error: "Organization ID is required" }, { status: 400 })
    }

    console.log("[v0] Deleting organization:", organization_id)

    const supabase = await createClient()
    const adminSupabase = createAdminClient()

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

    console.log(`[v0] Starting cascading delete for organization: ${organization_id}`)

    const deleteOperations = [
      // Delete checklist responses first (depends on checklist items and daily checklists)
      { table: "checklist_responses", message: "checklist responses" },
      // Delete external responses (depends on external submissions)
      { table: "external_responses", message: "external responses" },
      // Delete daily checklists (depends on templates and profiles)
      { table: "daily_checklists", message: "daily checklists" },
      // Delete external submissions
      { table: "external_submissions", message: "external submissions" },
      // Delete template assignments
      { table: "template_assignments", message: "template assignments" },
      // Delete template schedule exclusions
      { table: "template_schedule_exclusions", message: "template schedule exclusions" },
      // Delete checklist items (depends on templates)
      { table: "checklist_items", message: "checklist items" },
      // Delete checklist templates
      { table: "checklist_templates", message: "checklist templates" },
      // Delete submitted reports
      { table: "submitted_reports", message: "submitted reports" },
      // Delete report backups
      { table: "report_backups", message: "report backups" },
      // Delete report audit logs
      { table: "report_audit_logs", message: "report audit logs" },
      // Delete staff unavailability
      { table: "staff_unavailability", message: "staff unavailability records" },
      // Delete feedback
      { table: "feedback", message: "feedback" },
      // Delete holidays
      { table: "holidays", message: "holidays" },
      // Delete notifications (depends on profiles)
      { table: "notifications", message: "notifications" },
      // Delete report access sessions (depends on profiles)
      { table: "report_access_sessions", message: "report access sessions" },
      // Delete payments (depends on subscriptions)
      { table: "payments", message: "payments" },
      // Delete subscriptions
      { table: "subscriptions", message: "subscriptions" },
      // Delete profiles (users/admins)
      { table: "profiles", message: "user profiles" },
      // Finally delete the organization
      { table: "organizations", message: "organization" },
    ]

    const deletedCounts = {}

    for (const operation of deleteOperations) {
      const { data, error } = await adminSupabase
        .from(operation.table)
        .delete()
        .eq("organization_id", organization_id)
        .select("id")

      if (error) {
        console.error(`Error deleting ${operation.message}:`, error)
        return NextResponse.json(
          {
            error: `Failed to delete ${operation.message}`,
          },
          { status: 500 },
        )
      }

      const count = data?.length || 0
      if (count > 0) {
        deletedCounts[operation.table] = count
        console.log(`[v0] Deleted ${count} ${operation.message}`)
      }
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
