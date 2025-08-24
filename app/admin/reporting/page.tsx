"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart3, Users, CheckCircle, Download, Search, TrendingUp, FileText } from "lucide-react"

console.log("[v0] Reporting page - File loaded and parsing")

interface DailyChecklist {
  id: string
  created_at: string
  status: string
  template_name: string
  assigned_user: string
  completion_rate: number
  responses: any[]
}

interface TeamMember {
  id: string
  first_name: string
  last_name: string
  email: string
  completion_rate: number
  total_submissions: number
}

export default function ReportingPage() {
  console.log("[v0] Reporting page - Component function called")

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [submissions, setSubmissions] = useState<DailyChecklist[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [stats, setStats] = useState({
    totalSubmissions: 0,
    completedSubmissions: 0,
    averageCompletionRate: 0,
    activeUsers: 0,
  })

  useEffect(() => {
    console.log("[v0] Reporting page - useEffect triggered")
    loadReportingData()
  }, [])

  const loadReportingData = async () => {
    try {
      console.log("[v0] Reporting page - Starting data load")
      setLoading(true)
      setError(null)

      const supabase = createClient()

      // Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()
      console.log("[v0] Reporting page - User:", user?.email)

      if (userError || !user) {
        console.log("[v0] Reporting page - Authentication error:", userError)
        setError("authentication")
        return
      }

      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("email", user.email)
        .single()

      console.log("[v0] Reporting page - Profile:", profile)

      if (profileError || !profile) {
        console.log("[v0] Reporting page - Profile error:", profileError)
        setError("profile")
        return
      }

      if (!profile.organization_id) {
        console.log("[v0] Reporting page - No organization ID")
        setError("organization")
        return
      }

      // Fetch daily checklists with related data
      const { data: checklistsData, error: checklistsError } = await supabase
        .from("daily_checklists")
        .select(`
          *,
          profiles!daily_checklists_user_id_fkey(first_name, last_name, email),
          checklist_templates!daily_checklists_template_id_fkey(name)
        `)
        .eq("organization_id", profile.organization_id)
        .order("created_at", { ascending: false })
        .limit(100)

      console.log("[v0] Reporting page - Checklists data:", checklistsData?.length || 0)

      if (checklistsError) {
        console.log("[v0] Reporting page - Checklists error:", checklistsError)
        throw checklistsError
      }

      // Process submissions data
      const processedSubmissions = (checklistsData || []).map((checklist) => ({
        id: checklist.id,
        created_at: checklist.created_at,
        status: checklist.status || "pending",
        template_name: checklist.checklist_templates?.name || "Unknown Template",
        assigned_user:
          `${checklist.profiles?.first_name || ""} ${checklist.profiles?.last_name || ""}`.trim() ||
          checklist.profiles?.email ||
          "Unknown User",
        completion_rate: Math.round((checklist.completion_percentage || 0) * 100),
        responses: [],
      }))

      setSubmissions(processedSubmissions)

      // Calculate stats
      const totalSubmissions = processedSubmissions.length
      const completedSubmissions = processedSubmissions.filter((s) => s.status === "completed").length
      const averageCompletionRate =
        processedSubmissions.length > 0
          ? Math.round(
              processedSubmissions.reduce((sum, s) => sum + s.completion_rate, 0) / processedSubmissions.length,
            )
          : 0

      // Get team performance data
      const { data: teamData, error: teamError } = await supabase
        .from("profiles")
        .select("*")
        .eq("organization_id", profile.organization_id)
        .neq("role", "admin")

      console.log("[v0] Reporting page - Team data:", teamData?.length || 0)

      const processedTeamMembers = (teamData || []).map((member) => ({
        id: member.id,
        first_name: member.first_name || "",
        last_name: member.last_name || "",
        email: member.email,
        completion_rate: Math.floor(Math.random() * 40) + 60, // Mock data for now
        total_submissions: Math.floor(Math.random() * 20) + 5, // Mock data for now
      }))

      setTeamMembers(processedTeamMembers)

      setStats({
        totalSubmissions,
        completedSubmissions,
        averageCompletionRate,
        activeUsers: processedTeamMembers.length,
      })

      console.log("[v0] Reporting page - Data loaded successfully")
    } catch (err) {
      console.error("[v0] Reporting page - Error loading data:", err)
      setError("general")
    } finally {
      setLoading(false)
    }
  }

  const filteredSubmissions = submissions.filter(
    (submission) =>
      submission.template_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submission.assigned_user.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const exportToPDF = () => {
    console.log("[v0] Reporting page - Exporting to PDF")
    // PDF export functionality would go here
    alert("PDF export functionality will be implemented")
  }

  const exportToCSV = () => {
    console.log("[v0] Reporting page - Exporting to CSV")
    // CSV export functionality would go here
    alert("CSV export functionality will be implemented")
  }

  if (loading) {
    console.log("[v0] Reporting page - Rendering loading state")
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (error === "authentication") {
    console.log("[v0] Reporting page - Rendering authentication error")
    return (
      <div className="container mx-auto p-6">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-red-600">Authentication Required</CardTitle>
            <CardDescription>Please log in to access reporting features.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <a href="/auth/login">Go to Login</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error === "profile") {
    console.log("[v0] Reporting page - Rendering profile error")
    return (
      <div className="container mx-auto p-6">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-red-600">Profile Not Found</CardTitle>
            <CardDescription>Your user profile could not be found.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={loadReportingData}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error === "organization") {
    console.log("[v0] Reporting page - Rendering organization error")
    return (
      <div className="container mx-auto p-6">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-red-600">Organization Not Found</CardTitle>
            <CardDescription>No organization is associated with your account.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={loadReportingData}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error === "general") {
    console.log("[v0] Reporting page - Rendering general error")
    return (
      <div className="container mx-auto p-6">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-red-600">Error Loading Data</CardTitle>
            <CardDescription>There was an error loading the reporting data.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={loadReportingData}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  console.log("[v0] Reporting page - Rendering main content")

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reporting</h1>
          <p className="text-muted-foreground mt-2">Comprehensive analytics and reporting for your organization</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportToPDF} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
          <Button onClick={exportToCSV} variant="outline">
            <Download className="w-4 h-4 mr-2" />
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
            <div className="text-2xl font-bold">{stats.totalSubmissions}</div>
            <p className="text-xs text-muted-foreground">+12% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedSubmissions}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalSubmissions > 0 ? Math.round((stats.completedSubmissions / stats.totalSubmissions) * 100) : 0}
              % completion rate
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Completion</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageCompletionRate}%</div>
            <p className="text-xs text-muted-foreground">+5% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeUsers}</div>
            <p className="text-xs text-muted-foreground">Team members</p>
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
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Recent Submissions</CardTitle>
                  <CardDescription>Latest checklist submissions from your team</CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search submissions..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 w-64"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredSubmissions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {searchTerm ? "No submissions match your search." : "No submissions found."}
                  </div>
                ) : (
                  filteredSubmissions.map((submission) => (
                    <div key={submission.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="flex-1">
                          <h4 className="font-medium">{submission.template_name}</h4>
                          <p className="text-sm text-muted-foreground">Submitted by {submission.assigned_user}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(submission.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="text-sm font-medium">{submission.completion_rate}%</div>
                          <div className="text-xs text-muted-foreground">Complete</div>
                        </div>
                        <Badge variant={submission.status === "completed" ? "default" : "secondary"}>
                          {submission.status}
                        </Badge>
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
              <CardDescription>Individual team member performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {teamMembers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No team members found.</div>
                ) : (
                  teamMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-sm font-medium">
                            {member.first_name.charAt(0)}
                            {member.last_name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-medium">
                            {member.first_name} {member.last_name}
                          </h4>
                          <p className="text-sm text-muted-foreground">{member.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-6">
                        <div className="text-center">
                          <div className="text-sm font-medium">{member.total_submissions}</div>
                          <div className="text-xs text-muted-foreground">Submissions</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-medium">{member.completion_rate}%</div>
                          <div className="text-xs text-muted-foreground">Completion</div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Analytics Dashboard</CardTitle>
              <CardDescription>Detailed analytics and trends</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Advanced analytics features coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
