import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, FileText, TrendingUp, Users } from "lucide-react"
import { redirect } from "next/navigation"
import { batchQuery, getUserProfile } from "@/lib/database-utils"
import { ErrorDisplay } from "@/components/error-display"
import { DashboardAnalyticsClient } from "./dashboard-analytics-client"

export const dynamic = "force-dynamic"
export const revalidate = 0

console.log("[v0] Admin Dashboard Analytics page - File loaded and parsing")

export default async function AdminDashboardAnalyticsPage() {
  console.log("[v0] Admin Dashboard Analytics page - Component function called")

  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    console.log("[v0] Admin Dashboard Analytics page - User ID:", user?.id)

    if (!user) {
      console.log("[v0] Admin Dashboard Analytics page - No user found, redirecting to login")
      redirect("/auth/login")
    }

    const profileResult = await getUserProfile(user.id)
    if (profileResult.error || !profileResult.data?.organization_id) {
      console.log("[v0] Admin Dashboard Analytics page - Profile error:", profileResult.error)
      return (
        <div className="space-y-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Reports and Analytics</h1>
              <p className="text-red-600 mt-2">Error: User profile not found</p>
            </div>
          </div>
          <ErrorDisplay
            error={profileResult.error || "User profile not found"}
            title="Unable to Load Analytics"
            description="Your user profile could not be found. Please try logging in again."
          />
        </div>
      )
    }

    const profile = profileResult.data
    console.log("[v0] Admin Dashboard Analytics page - Organization ID:", profile.organization_id)

    const batchResult = await batchQuery([
      async () => {
        const result = await supabase
          .from("template_assignments")
          .select(`
            id,
            status,
            completed_at,
            assigned_to,
            assigned_at,
            template_id,
            checklist_templates(id, name),
            assigned_to_profile:profiles!assigned_to(first_name, last_name, full_name, email)
          `)
          .eq("organization_id", profile.organization_id)
          .eq("is_active", true)
          .order("created_at", { ascending: false })
        return { data: result.data, error: result.error }
      },
      async () => {
        const result = await supabase
          .from("submitted_reports")
          .select(`
            id,
            assignment_id,
            submitted_at,
            report_data
          `)
          .eq("organization_id", profile.organization_id)
          .order("submitted_at", { ascending: false })
        return { data: result.data, error: result.error }
      },
      async () => {
        const result = await supabase
          .from("external_submissions")
          .select(`
            id,
            submitter_name,
            status,
            submitted_at,
            template_id,
            checklist_templates(id, name, description, schedule_type)
          `)
          .eq("organization_id", profile.organization_id)
          .order("submitted_at", { ascending: false })
        return { data: result.data, error: result.error }
      },
      async () => {
        const result = await supabase
          .from("profiles")
          .select("id, full_name, first_name, last_name, email, role")
          .eq("organization_id", profile.organization_id)
          .in("role", ["staff", "admin"])
          .order("full_name")
        return { data: result.data, error: result.error }
      },
      async () => {
        const result = await supabase
          .from("organizations")
          .select(`
            id,
            subscription_plan,
            subscriptions(id, plan, status)
          `)
          .eq("id", profile.organization_id)
          .single()
        return { data: result.data, error: result.error }
      },
    ])

    const assignments = batchResult.data?.[0] || []
    const submittedReports = batchResult.data?.[1] || []
    const externalSubmissions = batchResult.data?.[2] || []
    const teamMembers = batchResult.data?.[3] || []
    const organization = batchResult.data?.[4] || null

    const hasPaidPlan =
      organization?.subscription_plan === "growth" ||
      organization?.subscription_plan === "scale" ||
      organization?.subscriptions?.some(
        (sub: any) => sub.status === "active" && (sub.plan === "growth" || sub.plan === "scale"),
      )

    const submissionMap = new Map()
    submittedReports.forEach((report: any) => {
      if (!submissionMap.has(report.assignment_id)) {
        submissionMap.set(report.assignment_id, [])
      }
      submissionMap.get(report.assignment_id).push(report)
    })

    const allReports = [
      ...(assignments || []).map((a: any) => {
        const submissions = submissionMap.get(a.id) || []
        const latestSubmission = submissions.length > 0 ? submissions[0] : null

        return {
          id: a.id,
          template_id: a.template_id,
          template_name: a.checklist_templates?.name || "Unknown Template",
          user_name: a.assigned_to_profile?.full_name || a.assigned_to_profile?.email || "Unknown User",
          user_email: a.assigned_to_profile?.email,
          status: a.status,
          completed_at: a.completed_at,
          assigned_at: a.assigned_at,
          submitted_at: latestSubmission?.submitted_at || null,
          type: "assignment" as const,
          submission_count: submissions.length,
          submissions: submissions.sort(
            (a: any, b: any) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime(),
          ),
        }
      }),
      ...(externalSubmissions || []).map((e: any) => ({
        id: e.id,
        template_id: e.template_id,
        template_name: e.checklist_templates?.name || "Unknown Template",
        user_name: e.submitter_name,
        user_email: null,
        status: e.status || "completed",
        completed_at: e.submitted_at,
        assigned_at: e.submitted_at,
        submitted_at: e.submitted_at,
        type: "external" as const,
        submission_count: 1,
        submissions: [{ id: e.id, submitted_at: e.submitted_at, report_data: null }],
      })),
    ]

    const subscriptionPlan =
      organization?.subscriptions?.find((sub: any) => sub.status === "active")?.plan ||
      organization?.subscription_plan ||
      "starter"
    const retentionDays = subscriptionPlan === "starter" ? 30 : 90

    const now = new Date()
    const reportsNearDeletion = allReports
      .filter((r) => r.submitted_at) // Only check submitted reports
      .map((r) => {
        const submittedDate = new Date(r.submitted_at!)
        const deletionDate = new Date(submittedDate)
        deletionDate.setDate(deletionDate.getDate() + retentionDays)

        const daysUntilDeletion = Math.ceil((deletionDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

        return {
          ...r,
          daysUntilDeletion,
          deletionDate,
        }
      })
      .filter((r) => r.daysUntilDeletion > 0 && r.daysUntilDeletion <= 10) // Within 10 days of deletion
      .sort((a, b) => a.daysUntilDeletion - b.daysUntilDeletion) // Oldest first

    const oldestReportNearDeletion = reportsNearDeletion.length > 0 ? reportsNearDeletion[0] : null

    const totalReports = allReports.length
    const completedReports = allReports.filter((r) => r.status === "completed").length
    const today = new Date().toISOString().split("T")[0]
    const completedToday = allReports.filter(
      (r) => r.status === "completed" && r.completed_at?.startsWith(today),
    ).length
    const pendingReports = allReports.filter((r) => r.status !== "completed").length
    const completionRate = totalReports > 0 ? Math.round((completedReports / totalReports) * 100) : 0

    return (
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Reports and Analytics</h1>
            <p className="text-muted-foreground mt-2">
              Overview of all report submissions including external contractors
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalReports}</div>
              <p className="text-xs text-muted-foreground">All assignments and external reports</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Submissions Today</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{completedToday}</div>
              <p className="text-xs text-muted-foreground">Today's submissions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Reports</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{pendingReports}</div>
              <p className="text-xs text-muted-foreground">Awaiting completion</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{completionRate}%</div>
              <p className="text-xs text-muted-foreground">Overall completion</p>
            </CardContent>
          </Card>
        </div>

        <DashboardAnalyticsClient
          reports={allReports}
          teamMembers={teamMembers}
          organizationId={profile.organization_id}
          hasPaidPlan={hasPaidPlan}
          oldestReportNearDeletion={oldestReportNearDeletion}
          reportsNearDeletionCount={reportsNearDeletion.length}
        />
      </div>
    )
  } catch (error) {
    console.error("Admin Dashboard Analytics page - Unexpected error:", error)
    return (
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Reports and Analytics</h1>
            <p className="text-red-600 mt-2">Unexpected error occurred</p>
          </div>
        </div>
        <ErrorDisplay
          error={error instanceof Error ? error.message : "Unknown error occurred"}
          title="Something went wrong"
          description="Please try refreshing the page"
          onRetry={() => window.location.reload()}
        />
      </div>
    )
  }
}
