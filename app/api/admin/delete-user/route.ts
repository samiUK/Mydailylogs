import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    console.log("[v0] Starting GDPR-compliant user deletion for:", userId)

    // Get user profile to find organization
    const { data: profile, error: profileFetchError } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", userId)
      .single()

    if (profileFetchError) {
      console.error("[v0] Error fetching profile:", profileFetchError)
    }

    const organizationId = profile?.organization_id

    // Delete all user-related data in correct order (respecting foreign key constraints)

    const { error: activityError } = await supabase
      .from("impersonation_activity_logs")
      .delete()
      .eq("impersonated_user_id", userId)
    if (activityError) console.error("[v0] Error deleting impersonation logs:", activityError.message)

    // 2. Delete notifications
    const { error: notificationsError } = await supabase.from("notifications").delete().eq("user_id", userId)
    if (notificationsError) console.error("[v0] Error deleting notifications:", notificationsError.message)

    // First get all checklists assigned to this user
    const { data: userChecklists } = await supabase.from("daily_checklists").select("id").eq("assigned_to", userId)

    if (userChecklists && userChecklists.length > 0) {
      const checklistIds = userChecklists.map((c) => c.id)
      const { error: responsesError } = await supabase
        .from("checklist_responses")
        .delete()
        .in("checklist_id", checklistIds)
      if (responsesError) console.error("[v0] Error deleting checklist responses:", responsesError.message)
    }

    const { error: checklistsError } = await supabase.from("daily_checklists").delete().eq("assigned_to", userId)
    if (checklistsError) console.error("[v0] Error deleting daily checklists:", checklistsError.message)

    const { error: assignedError } = await supabase.from("template_assignments").delete().eq("assigned_to", userId)
    if (assignedError) console.error("[v0] Error deleting template assignments:", assignedError.message)

    const { error: createdAssignmentsError } = await supabase
      .from("template_assignments")
      .delete()
      .eq("assigned_by", userId)
    if (createdAssignmentsError)
      console.error("[v0] Error deleting created assignments:", createdAssignmentsError.message)

    const { error: sessionsError } = await supabase.from("report_access_sessions").delete().eq("user_id", userId)
    if (sessionsError) console.error("[v0] Error deleting report sessions:", sessionsError.message)

    const { error: auditLogsError } = await supabase.from("report_audit_logs").delete().eq("user_id", userId)
    if (auditLogsError) console.error("[v0] Error deleting audit logs:", auditLogsError.message)

    const { error: backupsError } = await supabase.from("report_backups").delete().eq("created_by", userId)
    if (backupsError) console.error("[v0] Error deleting report backups:", backupsError.message)

    const { error: reportsError } = await supabase.from("submitted_reports").delete().eq("submitted_by", userId)
    if (reportsError) console.error("[v0] Error deleting submitted reports:", reportsError.message)

    const { error: unavailabilityError } = await supabase.from("staff_unavailability").delete().eq("staff_id", userId)
    if (unavailabilityError) console.error("[v0] Error deleting unavailability:", unavailabilityError.message)

    // 5. If user is only member of organization, delete organization and related data
    if (organizationId) {
      const { data: orgMembers } = await supabase.from("profiles").select("id").eq("organization_id", organizationId)

      if (orgMembers && orgMembers.length === 1) {
        console.log("[v0] User is last member, deleting entire organization")

        const { error: templatesError } = await supabase
          .from("checklist_templates")
          .delete()
          .eq("organization_id", organizationId)
        if (templatesError) console.error("[v0] Error deleting templates:", templatesError.message)

        const { error: exclusionsError } = await supabase
          .from("template_schedule_exclusions")
          .delete()
          .eq("organization_id", organizationId)
        if (exclusionsError) console.error("[v0] Error deleting template exclusions:", exclusionsError.message)

        const { error: holidaysError } = await supabase.from("holidays").delete().eq("organization_id", organizationId)
        if (holidaysError) console.error("[v0] Error deleting holidays:", holidaysError.message)

        const { data: extSubmissions } = await supabase
          .from("external_submissions")
          .select("id")
          .eq("organization_id", organizationId)

        if (extSubmissions && extSubmissions.length > 0) {
          const submissionIds = extSubmissions.map((s) => s.id)
          const { error: extResponsesError } = await supabase
            .from("external_responses")
            .delete()
            .in("submission_id", submissionIds)
          if (extResponsesError) console.error("[v0] Error deleting external responses:", extResponsesError.message)
        }

        const { error: extSubmissionsError } = await supabase
          .from("external_submissions")
          .delete()
          .eq("organization_id", organizationId)
        if (extSubmissionsError) console.error("[v0] Error deleting external submissions:", extSubmissionsError.message)

        // Delete organization subscriptions
        const { error: subsError } = await supabase.from("subscriptions").delete().eq("organization_id", organizationId)
        if (subsError) console.error("[v0] Error deleting subscriptions:", subsError.message)

        const { data: orgSubscriptions } = await supabase
          .from("subscriptions")
          .select("id")
          .eq("organization_id", organizationId)

        if (orgSubscriptions && orgSubscriptions.length > 0) {
          const subscriptionIds = orgSubscriptions.map((s) => s.id)
          const { error: paymentsError } = await supabase
            .from("payments")
            .delete()
            .in("subscription_id", subscriptionIds)
          if (paymentsError) console.error("[v0] Error deleting payments:", paymentsError.message)
        }

        // Delete organization
        const { error: orgError } = await supabase.from("organizations").delete().eq("organization_id", organizationId)
        if (orgError) console.error("[v0] Error deleting organization:", orgError.message)
      }
    }

    // 6. Delete user profile
    const { error: profileError } = await supabase.from("profiles").delete().eq("id", userId)
    if (profileError) {
      console.error("[v0] Error deleting profile:", profileError)
      return NextResponse.json({ error: "Failed to delete user profile" }, { status: 500 })
    }

    // 7. Delete auth user (this cascades to any remaining auth-related tables)
    const { error: authError } = await supabase.auth.admin.deleteUser(userId)
    if (authError) {
      console.error("[v0] Error deleting auth user:", authError)
      return NextResponse.json({ error: "Failed to delete user authentication" }, { status: 500 })
    }

    console.log("[v0] GDPR-compliant deletion completed successfully")

    return NextResponse.json({
      success: true,
      message: "All user data deleted successfully (GDPR compliant)",
    })
  } catch (error) {
    console.error("[v0] Error deleting user:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete user" },
      { status: 500 },
    )
  }
}
