import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { BarChart3, FileText, TrendingUp, Users, Eye, Download } from "lucide-react"
import { redirect } from "next/navigation"
import { batchQuery, getUserProfile } from "@/lib/database-utils"
import { ErrorDisplay } from "@/components/error-display"
import { createBrowserClient } from "@supabase/ssr"

export const dynamic = "force-dynamic"
export const revalidate = 300 // Cache for 5 minutes to improve performance

console.log("[v0] Admin Dashboard Analytics page - File loaded and parsing")

async function clearSubmissionNotifications(userId: string, organizationId: string) {
  try {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    console.log("[v0] Auto-clearing submission notifications for reports page visit")

    // Mark all submission-related notifications as read
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .in("type", ["submission", "report_submitted", "daily_log_submitted"])
      .eq("is_read", false)

    if (error) {
      console.error("[v0] Error auto-clearing submission notifications:", error)
    } else {
      console.log("[v0] Successfully auto-cleared submission notifications")
    }
  } catch (error) {
    console.error("[v0] Error in clearSubmissionNotifications:", error)
  }
}

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

    if (typeof window !== "undefined") {
      setTimeout(() => clearSubmissionNotifications(user.id, profile.organization_id), 100)
    }

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
            checklist_templates(id, name),
            assigned_to_profile:profiles!assigned_to(first_name, last_name, full_name, email)
          `)
          .eq("organization_id", profile.organization_id)
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(100)
        return { data: result.data, error: result.error }
      },
      async () => {
        const result = await supabase
          .from("daily_checklists")
          .select(`
            id,
            date,
            status,
            completed_at,
            assigned_to,
            checklist_templates(id, name),
            assigned_to_profile:profiles!assigned_to(first_name, last_name, full_name, email)
          `)
          .eq("organization_id", profile.organization_id)
          .order("date", { ascending: false })
          .limit(100)
        return { data: result.data, error: result.error }
      },
    ])

    if (batchResult.error) {
      console.log("[v0] Admin Dashboard Analytics page - Batch query error:", batchResult.error)
      return (
        <div className="space-y-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Reports and Analytics</h1>
              <p className="text-red-600 mt-2">Error loading data</p>
            </div>
          </div>
          <ErrorDisplay
            error={batchResult.error}
            title="Unable to Load Analytics"
            description="There was an error loading your analytics data."
            onRetry={() => window.location.reload()}
          />
        </div>
      )
    }

    const assignments = batchResult.data?.[0] || []
    const dailyChecklists = batchResult.data?.[1] || []
    console.log("[v0] Admin Dashboard Analytics page - Assignments found:", assignments?.length || 0)
    console.log("[v0] Admin Dashboard Analytics page - Daily checklists found:", dailyChecklists?.length || 0)

    const allReports = [
      ...(assignments || []).map((a: any) => ({
        id: a.id,
        template_name: a.checklist_templates?.name || "Unknown Template",
        user_name: a.assigned_to_profile?.full_name || a.assigned_to_profile?.email || "Unknown User",
        status: a.status,
        completed_at: a.completed_at,
        assigned_at: a.assigned_at,
        type: "assignment" as const,
      })),
      ...(dailyChecklists || []).map((d: any) => ({
        id: d.id,
        template_name: d.checklist_templates?.name || "Unknown Template",
        user_name: d.assigned_to_profile?.full_name || d.assigned_to_profile?.email || "Unknown User",
        status: d.status,
        completed_at: d.completed_at,
        assigned_at: d.date,
        type: "daily" as const,
      })),
    ]

    const totalReports = allReports.length
    const completedReports = allReports.filter((r) => r.status === "completed").length
    const today = new Date().toISOString().split("T")[0]
    const completedToday = allReports.filter(
      (r) => r.status === "completed" && r.completed_at?.startsWith(today),
    ).length
    const pendingReports = allReports.filter((r) => r.status !== "completed").length
    const completionRate = totalReports > 0 ? Math.round((completedReports / totalReports) * 100) : 0

    const recentActivity = allReports
      .sort((a, b) => {
        const dateA = a.completed_at || a.assigned_at || a.id
        const dateB = b.completed_at || b.assigned_at || b.id
        return dateB.localeCompare(dateA)
      })
      .slice(0, 6)

    console.log("[v0] Admin Dashboard Analytics page - Metrics calculated successfully")

    return (
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Reports and Analytics</h1>
            <p className="text-muted-foreground mt-2">Overview of report completion and performance metrics</p>
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
              <p className="text-xs text-muted-foreground">All active assignments</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
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

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest assignments and report submissions</CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivity.length > 0 ? (
              <div className="space-y-4">
                {recentActivity.map((report) => (
                  <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">{report.template_name}</h4>
                      <p className="text-sm text-muted-foreground">{report.user_name}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant={report.status === "completed" ? "default" : "secondary"}>
                        {report.status || "pending"}
                      </Badge>
                      {report.completed_at ? (
                        <span className="text-sm text-muted-foreground">
                          Completed: {new Date(report.completed_at).toLocaleDateString()}
                        </span>
                      ) : report.assigned_at ? (
                        <span className="text-sm text-muted-foreground">
                          Assigned: {new Date(report.assigned_at).toLocaleDateString()}
                        </span>
                      ) : null}
                      <div className="flex items-center gap-2">
                        <Link href={`/admin/reports/${report.id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        </Link>
                        {report.status === "completed" && (
                          <Link href={`/admin/reports/${report.id}?download=true`}>
                            <Button variant="default" size="sm">
                              <Download className="w-4 h-4 mr-1" />
                              Download
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No pending reports</h3>
                <p className="text-muted-foreground">
                  Assignments and reports will appear here once you start assigning tasks to team members
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  } catch (error) {
    console.error("[v0] Admin Dashboard Analytics page - Unexpected error:", error)
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
