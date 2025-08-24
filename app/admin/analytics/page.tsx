import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, Users, FileText, TrendingUp, AlertCircle, Search, Download } from "lucide-react"
import Link from "next/link"

console.log("[v0] Admin Reports and Analytics page - File loaded and parsing")

export default async function AdminReportsAnalyticsPage() {
  console.log("[v0] Admin Reports and Analytics page - Component function called")

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  console.log("[v0] Admin Reports and Analytics page - User ID:", user?.id)

  if (!user) {
    console.log("[v0] Admin Reports and Analytics page - No user found, redirecting to login")
    redirect("/auth/login")
  }

  // Get user profile
  const { data: profile, error: profileError } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  console.log("[v0] Admin Reports and Analytics page - Profile query error:", profileError)

  if (profileError || !profile?.organization_id) {
    console.log("[v0] Admin Reports and Analytics page - Profile not found or no organization")
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

  console.log("[v0] Admin Reports and Analytics page - Profile found, organization_id:", profile.organization_id)

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

  console.log("[v0] Admin Reports and Analytics page - Submissions query error:", submissionsError)
  console.log("[v0] Admin Reports and Analytics page - Submissions found:", submissions?.length || 0)

  // Load team members
  const { data: teamMembers, error: teamError } = await supabase
    .from("profiles")
    .select("*")
    .eq("organization_id", profile.organization_id)
    .neq("id", user.id)

  console.log("[v0] Admin Reports and Analytics page - Team members query error:", teamError)
  console.log("[v0] Admin Reports and Analytics page - Team members found:", teamMembers?.length || 0)

  // Load templates
  const { data: templates, error: templatesError } = await supabase
    .from("checklist_templates")
    .select("*")
    .eq("organization_id", profile.organization_id)

  console.log("[v0] Admin Reports and Analytics page - Templates query error:", templatesError)
  console.log("[v0] Admin Reports and Analytics page - Templates found:", templates?.length || 0)

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
          <h1 className="text-3xl font-bold">Reports and Analytics</h1>
          <p className="text-muted-foreground">Comprehensive reporting and analytics for your organization</p>
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
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search reports..." className="pl-10" />
                  </div>
                </div>
                <Select>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Report Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Report Types</SelectItem>
                    {templates?.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Submitted By" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Team Members</SelectItem>
                    {teamMembers?.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select>
                  <SelectTrigger className="w-full md:w-32">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2025">2025</SelectItem>
                    <SelectItem value="2024">2024</SelectItem>
                    <SelectItem value="2023">2023</SelectItem>
                  </SelectContent>
                </Select>
                <Select>
                  <SelectTrigger className="w-full md:w-32">
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="01">January</SelectItem>
                    <SelectItem value="02">February</SelectItem>
                    <SelectItem value="03">March</SelectItem>
                    <SelectItem value="04">April</SelectItem>
                    <SelectItem value="05">May</SelectItem>
                    <SelectItem value="06">June</SelectItem>
                    <SelectItem value="07">July</SelectItem>
                    <SelectItem value="08">August</SelectItem>
                    <SelectItem value="09">September</SelectItem>
                    <SelectItem value="10">October</SelectItem>
                    <SelectItem value="11">November</SelectItem>
                    <SelectItem value="12">December</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>

              <div className="space-y-2">
                {!submissions || submissions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No submissions found</p>
                ) : (
                  submissions.slice(0, 50).map((submission) => (
                    <div
                      key={submission.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="font-medium truncate">{submission.profiles?.full_name || "Unknown User"}</div>
                        <div className="text-sm text-muted-foreground truncate">
                          {submission.checklist_templates?.name || "Unknown Report Template"}
                        </div>
                        <div className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(submission.completed_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge
                          variant={submission.status === "completed" ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {submission.status}
                        </Badge>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/admin/reports/${submission.id}`} target="_blank" rel="noopener noreferrer">
                            View Report
                          </Link>
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
