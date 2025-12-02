import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/admin"

export async function GET(request: Request) {
  try {
    // Check master admin auth
    const cookieHeader = request.headers.get("cookie") || ""
    const isMasterAdmin = cookieHeader.includes("masterAdminImpersonation=true")

    if (!isMasterAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const adminClient = createClient()

    // Fetch all data in parallel
    const [
      { data: organizationsData },
      { data: profilesData },
      { data: superusersData },
      { data: templatesData },
      { data: subscriptionsData },
      { data: paymentsData },
      { data: feedbackData },
      { data: reportsData },
      { data: checklistsData },
      { data: templateAssignmentsData },
      { data: notificationsData },
      { data: holidaysData },
      { data: staffUnavailabilityData },
      { data: auditLogsData },
      { data: backupsData },
    ] = await Promise.all([
      adminClient.from("organizations").select("*"),
      adminClient.from("profiles").select("*"),
      adminClient.from("superusers").select("*"),
      adminClient.from("checklist_templates").select("id, name, organization_id, is_active").limit(100),
      adminClient
        .from("subscriptions")
        .select(`*, organizations(organization_id, organization_name, logo_url, primary_color, slug)`),
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

    return NextResponse.json({
      organizations: organizationsData || [],
      profiles: profilesData || [],
      superusers: superusersData || [],
      templates: templatesData || [],
      subscriptions: subscriptionsData || [],
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
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
