import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/admin"
import { cookies } from "next/headers"

export async function GET(request: Request) {
  try {
    console.log("[v0] Dashboard data API called")

    const cookieStore = await cookies()
    const masterAdminImpersonation = cookieStore.get("masterAdminImpersonation")
    const isMasterAdmin = masterAdminImpersonation?.value === "true"

    console.log("[v0] Master admin check:", { isMasterAdmin, hasCookie: !!masterAdminImpersonation })

    if (!isMasterAdmin) {
      console.log("[v0] Unauthorized access attempt")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] Creating admin client...")
    const adminClient = createClient()
    console.log("[v0] Admin client created successfully")

    // Fetch all data in parallel
    console.log("[v0] Fetching all dashboard data...")
    const [
      { data: organizationsData, error: orgError },
      { data: profilesData, error: profilesError },
      { data: superusersData, error: superusersError },
      { data: templatesData, error: templatesError },
      { data: subscriptionsData, error: subscriptionsError },
      { data: paymentsData, error: paymentsError },
      { data: feedbackData, error: feedbackError },
      { data: reportsData, error: reportsError },
      { data: checklistsData, error: checklistsError },
      { data: templateAssignmentsData, error: templateAssignmentsError },
      { data: notificationsData, error: notificationsError },
      { data: holidaysData, error: holidaysError },
      { data: staffUnavailabilityData, error: staffUnavailabilityError },
      { data: auditLogsData, error: auditLogsError },
      { data: backupsData, error: backupsError },
    ] = await Promise.all([
      adminClient.from("organizations").select("*"),
      adminClient.from("profiles").select("*"),
      adminClient.from("superusers").select("*"),
      adminClient.from("checklist_templates").select("id, name, organization_id, is_active").limit(100),
      adminClient.from("subscriptions").select(`
          *,
          organizations!left(
            organization_id,
            organization_name,
            logo_url,
            primary_color,
            slug
          )
        `),
      adminClient.from("payments").select(`*, subscriptions(*, organizations(*))`),
      adminClient.from("feedback").select("*"),
      adminClient.from("submitted_reports").select("*"),
      adminClient.from("daily_checklists").select("id, status"),
      adminClient.from("template_assignments").select("id, status, is_active"),
      adminClient.from("notifications").select("id, is_read"),
      adminClient.from("holidays").select("id, date"),
      adminClient.from("staff_unavailability").select("id, start_date, end_date"),
      adminClient.from("report_audit_logs").select("id, created_at"),
      adminClient.from("report_backups").select("id, created_at"),
    ])

    if (orgError) console.error("[v0] Organizations error:", orgError)
    if (profilesError) console.error("[v0] Profiles error:", profilesError)
    if (superusersError) console.error("[v0] Superusers error:", superusersError)
    if (templatesError) console.error("[v0] Templates error:", templatesError)
    if (subscriptionsError) console.error("[v0] Subscriptions error:", subscriptionsError)
    if (paymentsError) console.error("[v0] Payments error:", paymentsError)
    if (feedbackError) console.error("[v0] Feedback error:", feedbackError)

    console.log(
      "[v0] Sample organization:",
      organizationsData?.[0]
        ? {
            id: organizationsData[0].organization_id,
            name: organizationsData[0].organization_name,
          }
        : "No orgs",
    )

    console.log(
      "[v0] Sample profiles:",
      profilesData?.slice(0, 3).map((p) => ({
        id: p.id,
        email: p.email,
        name: p.full_name,
        role: p.role,
        org_id: p.organization_id,
      })),
    )

    const enrichedOrganizations = organizationsData?.map((org) => {
      const orgProfiles = profilesData?.filter((p) => p.organization_id === org.organization_id) || []
      console.log(`[v0] Org ${org.organization_name} (${org.organization_id}): ${orgProfiles.length} profiles`)
      return {
        ...org,
        profiles: orgProfiles,
      }
    })

    const enrichedSubscriptions = subscriptionsData?.map((sub) => {
      const userProfile = profilesData?.find((p) => p.organization_id === sub.organization_id && p.role === "admin")
      return {
        ...sub,
        user_email: userProfile?.email || null,
        user_name: userProfile?.full_name || null,
      }
    })

    console.log("[v0] Dashboard data fetched:", {
      organizations: organizationsData?.length || 0,
      profiles: profilesData?.length || 0,
      superusers: superusersData?.length || 0,
      subscriptions: subscriptionsData?.length || 0,
      subscriptionsWithOrgs: subscriptionsData?.filter((s: any) => s.organizations)?.length || 0,
      subscriptionsWithoutOrgs: subscriptionsData?.filter((s: any) => !s.organizations)?.length || 0,
      payments: paymentsData?.length || 0,
      feedback: feedbackData?.length || 0,
    })

    console.log(
      "[v0] Enriched organizations sample:",
      enrichedOrganizations?.[0]
        ? {
            org_id: enrichedOrganizations[0].organization_id,
            org_name: enrichedOrganizations[0].organization_name,
            profiles_count: enrichedOrganizations[0].profiles.length,
            profile_emails: enrichedOrganizations[0].profiles.map((p: any) => p.email),
            profile_roles: enrichedOrganizations[0].profiles.map((p: any) => p.role),
          }
        : "No organizations",
    )

    return NextResponse.json({
      organizations: enrichedOrganizations || [],
      profiles: profilesData || [],
      superusers: superusersData || [],
      templates: templatesData || [],
      subscriptions: enrichedSubscriptions || [],
      payments: paymentsData || [],
      feedback: feedbackData || [],
      reports: reportsData || [],
      checklists: checklistsData || [],
      templateAssignments: templateAssignmentsData || [],
      notifications: notificationsData || [],
      holidays: holidaysData || [],
      staffUnavailability: staffUnavailabilityData || [],
      auditLogs: auditLogsData || [],
      backups: backupsData || [],
    })
  } catch (error: any) {
    console.error("[v0] Dashboard data fetch error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
