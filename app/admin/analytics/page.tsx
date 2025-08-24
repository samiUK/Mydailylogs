import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, Download, Users, FileText, TrendingUp, AlertCircle } from "lucide-react"
import Link from "next/link"

console.log("[v0] Admin Analytics page - File loaded and parsing")

export default async function AdminAnalyticsPage() {
  console.log("[v0] Admin Analytics page - Component function called")

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  console.log("[v0] Admin Analytics page - User ID:", user?.id)

  if (!user) {
    console.log("[v0] Admin Analytics page - No user found, redirecting to login")
    redirect("/auth/login")
  }

  // Get user profile
  const { data: profile, error: profileError } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  console.log("[v0] Admin Analytics page - Profile query error:", profileError)

  if (profileError || !profile?.organization_id) {
    console.log("[v0] Admin Analytics page - Profile not found or no organization")
    return (
      <div className="container mx-auto p-6">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Profile Not Found
            </CardTitle>
            <CardDescription>Your user profile could not be loaded. Please try again.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/admin/analytics">Retry</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  console.log("[v0] Admin Analytics page - Profile found, organization_id:", profile.organization_id)

  // Load submissions
  const { data: submissions, error: submissionsError } = await supabase
    .from("template_assignments")
    .select(`
      *,
      profiles!template_assignments_assigned_to_fkey (
        full_name,
        email
      ),
      checklist_templates (
        name
      )
    `)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(100)

  console.log("[v0] Admin Analytics page - Submissions query error:", submissionsError)
  console.log("[v0] Admin Analytics page - Submissions found:", submissions?.length || 0)

  // Load team members
  const { data: teamMembers, error: teamError } = await supabase
    .from("profiles")
    .select("*")
    .eq("organization_id", profile.organization_id)
    .neq("id", user.id)

  console.log("[v0] Admin Analytics page - Team members query error:", teamError)
  console.log("[v0] Admin Analytics page - Team members found:", teamMembers?.length || 0)

  // Load templates
  const { data: templates, error: templatesError } = await supabase
    .from("checklist_templates")
    .select("*")
    .eq("organization_id", profile.organization_id)

  console.log("[v0] Admin Analytics page - Templates query error:", templatesError)
  console.log("[v0] Admin Analytics page - Templates found:", templates?.length || 0)

  // Calculate stats
  const totalSubmissions = submissions?.length || 0
  const activeTeamMembers = teamMembers?.filter((member) => member.is_active).length || 0
  const totalTemplates = templates?.length || 0
  const completionRate =
    totalSubmissions > 0
      ? Math.round(((submissions?.filter((s) => s.status === "completed").length || 0) / totalSubmissions) * 100)
      : 0

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Comprehensive reporting and analytics for your organization</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSubmissions}</div>
            <p className="text-xs text-muted-foreground">All report submissions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Team Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeTeamMembers}</div>
            <p className="text-xs text-muted-foreground">{teamMembers?.length || 0} total members</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Report Templates</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTemplates}</div>
            <p className="text-xs text-muted-foreground">Active report templates</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completionRate}%</div>
            <p className="text-xs text-muted-foreground">Average completion rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="submissions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="submissions">Recent Submissions</TabsTrigger>
          <TabsTrigger value="team">Team Performance</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="submissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Submissions</CardTitle>
              <CardDescription>Latest report submissions from your team</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {!submissions || submissions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No submissions found</p>
                ) : (
                  submissions.slice(0, 10).map((submission) => (
                    <div key={submission.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <p className="font-medium">{submission.profiles?.full_name || "Unknown User"}</p>
                        <p className="text-sm text-muted-foreground">
                          {submission.checklist_templates?.name || "Unknown Report Template"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(submission.completed_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={submission.status === "completed" ? "default" : "secondary"}>
                          {submission.status}
                        </Badge>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Team Performance</CardTitle>
              <CardDescription>Performance metrics for your team members</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {!teamMembers || teamMembers.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No team members found</p>
                ) : (
                  teamMembers.map((member) => {
                    const memberSubmissions = submissions?.filter((s) => s.assigned_to === member.id) || []
                    const memberCompletionRate =
                      memberSubmissions.length > 0
                        ? Math.round(
                            (memberSubmissions.filter((s) => s.status === "completed").length /
                              memberSubmissions.length) *
                              100,
                          )
                        : 0

                    return (
                      <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-1">
                          <p className="font-medium">{member.full_name}</p>
                          <p className="text-sm text-muted-foreground">{member.email}</p>
                          <p className="text-xs text-muted-foreground">Role: {member.role}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{memberSubmissions.length} submissions</p>
                          <p className="text-sm text-muted-foreground">{memberCompletionRate}% completion rate</p>
                          <Badge variant={member.is_active ? "default" : "secondary"}>
                            {member.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Analytics Overview</CardTitle>
              <CardDescription>Detailed analytics and insights</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Submission Trends</h3>
                  <p className="text-muted-foreground">
                    Your team has submitted {totalSubmissions} reports with a {completionRate}% completion rate.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">Report Template Usage</h3>
                  <div className="space-y-2">
                    {templates && templates.length > 0 ? (
                      templates.map((template) => {
                        const templateSubmissions = submissions?.filter((s) => s.template_id === template.id) || []
                        return (
                          <div key={template.id} className="flex justify-between items-center p-2 border rounded">
                            <span>{template.name}</span>
                            <Badge variant="outline">{templateSubmissions.length} uses</Badge>
                          </div>
                        )
                      })
                    ) : (
                      <p className="text-muted-foreground">No report templates found</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
