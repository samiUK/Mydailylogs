"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Eye, Download } from "lucide-react"
import { getSubscriptionLimits } from "@/lib/subscription-limits"

export default function ReportsPage() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [organization, setOrganization] = useState<any>(null)
  const [subscriptionLimits, setSubscriptionLimits] = useState<any>(null)
  const [stats, setStats] = useState({
    totalCount: 0,
    completedCount: 0,
    weeklyCount: 0,
    todayCount: 0,
    completionRate: 0,
  })
  const [teamStats, setTeamStats] = useState<Record<string, { name: string; total: number; completed: number }>>({})
  const [recentSubmissions, setRecentSubmissions] = useState<any[]>([])
  const [detailedResponses, setDetailedResponses] = useState<any[]>([])

  useEffect(() => {
    const loadData = async () => {
      const supabase = createClient()

      // Get user
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser()
      if (!currentUser) return

      setUser(currentUser)

      // Get user's organization
      const { data: userProfile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", currentUser.id)
        .single()

      setProfile(userProfile)

      if (!userProfile?.organization_id) return

      // Get organization data
      const { data: orgData } = await supabase
        .from("organizations")
        .select("name, logo_url, primary_color, secondary_color")
        .eq("id", userProfile.organization_id)
        .single()

      setOrganization(orgData)

      const limits = await getSubscriptionLimits(userProfile.organization_id)
      setSubscriptionLimits(limits)

      // Get reporting data
      const today = new Date()
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
      const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)

      // Get completion stats from template_assignments
      const { data: totalAssignments } = await supabase
        .from("template_assignments")
        .select("*")
        .eq("organization_id", userProfile.organization_id)
        .gte("assigned_at", thirtyDaysAgo.toISOString())

      const { data: completedAssignments } = await supabase
        .from("template_assignments")
        .select("*")
        .eq("organization_id", userProfile.organization_id)
        .eq("status", "completed")
        .gte("assigned_at", thirtyDaysAgo.toISOString())

      const { data: weeklyCompleted } = await supabase
        .from("template_assignments")
        .select("*")
        .eq("organization_id", userProfile.organization_id)
        .eq("status", "completed")
        .gte("completed_at", sevenDaysAgo.toISOString())

      const { data: todayCompleted } = await supabase
        .from("template_assignments")
        .select("*")
        .eq("organization_id", userProfile.organization_id)
        .eq("status", "completed")
        .gte("completed_at", today.toISOString().split("T")[0])

      const { data: submissions } = await supabase
        .from("template_assignments")
        .select(`
          *,
          checklist_templates(name, description),
          profiles!template_assignments_assigned_to_fkey(full_name, email)
        `)
        .eq("organization_id", userProfile.organization_id)
        .eq("status", "completed")
        .order("completed_at", { ascending: false })
        .limit(5)

      console.log("[v0] Recent submissions query result:", { data: submissions })
      console.log("[v0] Recent submissions data:", submissions)

      setRecentSubmissions(submissions || [])

      const submissionIds = submissions?.map((s) => s.template_id) || []
      if (submissionIds.length > 0) {
        const { data: responses } = await supabase
          .from("checklist_responses")
          .select(`
            *,
            checklist_items(name, task_type, description)
          `)
          .in("checklist_id", submissionIds)
          .eq("is_completed", true)

        setDetailedResponses(responses || [])
      }

      // Get team performance
      const { data: teamPerformance } = await supabase
        .from("template_assignments")
        .select("assigned_to, status, profiles!template_assignments_assigned_to_fkey(full_name)")
        .eq("organization_id", userProfile.organization_id)
        .gte("assigned_at", sevenDaysAgo.toISOString())

      // Calculate stats
      const totalCount = totalAssignments?.length || 0
      const completedCount = completedAssignments?.length || 0
      const weeklyCount = weeklyCompleted?.length || 0
      const todayCount = todayCompleted?.length || 0
      const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

      setStats({
        totalCount,
        completedCount,
        weeklyCount,
        todayCount,
        completionRate,
      })

      // Group team performance
      const teamStatsData = teamPerformance?.reduce(
        (acc, assignment) => {
          const userId = assignment.assigned_to
          const userName = assignment.profiles?.full_name || "Unknown"
          if (!acc[userId]) {
            acc[userId] = { name: userName, total: 0, completed: 0 }
          }
          acc[userId].total++
          if (assignment.status === "completed") {
            acc[userId].completed++
          }
          return acc
        },
        {} as Record<string, { name: string; total: number; completed: number }>,
      )

      setTeamStats(teamStatsData || {})
      setLoading(false)
    }

    loadData()
  }, [])

  const generatePDF = (submission: any, responses: any[]) => {
    const printWindow = window.open("", "_blank")
    if (!printWindow) return

    const hasCustomBranding = subscriptionLimits?.hasCustomBranding || false
    const displayName = hasCustomBranding ? organization?.name || "Your Organization" : "Mydailylogs"
    const displayLogo = hasCustomBranding ? organization?.logo_url : null
    const logoFallback = hasCustomBranding
      ? organization?.name
        ? organization.name.substring(0, 3).toUpperCase()
        : "ORG"
      : "MDL"

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Checklist Report - ${submission.checklist_templates?.name}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; line-height: 1.6; }
            .company-header { 
              background: linear-gradient(135deg, ${organization?.primary_color || "#667eea"} 0%, ${organization?.secondary_color || "#764ba2"} 100%); 
              color: white; 
              padding: 30px; 
              margin: -20px -20px 30px -20px; 
              text-align: center;
              position: relative;
            }
            .company-logo { 
              width: 80px; 
              height: 80px; 
              background: white; 
              border-radius: 50%; 
              margin: 0 auto 15px; 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              font-size: 24px; 
              font-weight: bold; 
              color: ${organization?.primary_color || "#667eea"};
              overflow: hidden;
            }
            .company-logo img {
              width: 100%;
              height: 100%;
              object-fit: cover;
              border-radius: 50%;
            }
            .company-name { 
              font-size: 28px; 
              font-weight: bold; 
              margin: 0 0 5px 0; 
            }
            .company-tagline { 
              font-size: 14px; 
              opacity: 0.9; 
              margin: 0;
            }
            .report-header { 
              border-bottom: 3px solid ${organization?.primary_color || "#667eea"}; 
              padding-bottom: 20px; 
              margin-bottom: 30px; 
              background: #f8f9ff;
              padding: 20px;
              border-radius: 8px;
            }
            .report-title { 
              font-size: 24px; 
              color: #333; 
              margin: 0 0 15px 0; 
              font-weight: bold;
            }
            .report-meta { 
              display: grid; 
              grid-template-columns: 1fr 1fr; 
              gap: 15px; 
              margin-top: 15px;
            }
            .meta-item { 
              background: white; 
              padding: 10px; 
              border-radius: 5px; 
              border-left: 4px solid ${organization?.primary_color || "#667eea"};
            }
            .meta-label { 
              font-weight: bold; 
              color: #555; 
              font-size: 12px; 
              text-transform: uppercase; 
              margin-bottom: 5px;
            }
            .meta-value { 
              color: #333; 
              font-size: 14px;
            }
            .task { 
              margin-bottom: 25px; 
              padding: 20px; 
              border: 1px solid #e1e5e9; 
              border-radius: 8px; 
              background: white;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .task-title { 
              font-weight: bold; 
              margin-bottom: 8px; 
              color: #333; 
              font-size: 16px;
            }
            .task-type { 
              background: ${organization?.primary_color || "#667eea"}; 
              color: white; 
              padding: 4px 12px; 
              border-radius: 20px; 
              font-size: 11px; 
              text-transform: uppercase; 
              font-weight: bold;
            }
            .task-description { 
              color: #666; 
              font-style: italic; 
              margin: 10px 0; 
              padding: 10px; 
              background: #f8f9ff; 
              border-radius: 5px;
            }
            .response { 
              margin-top: 15px; 
              padding: 15px; 
              background: #f9f9f9; 
              border-radius: 5px;
            }
            .response-item { 
              margin-bottom: 10px; 
              padding-bottom: 10px; 
              border-bottom: 1px solid #eee;
            }
            .response-item:last-child { 
              border-bottom: none; 
              margin-bottom: 0; 
              padding-bottom: 0;
            }
            .response-label { 
              font-weight: bold; 
              color: #555; 
              margin-bottom: 5px;
            }
            .response-value { 
              color: #333; 
              background: white; 
              padding: 8px; 
              border-radius: 3px; 
              border: 1px solid #ddd;
            }
            .photo { 
              max-width: 400px; 
              max-height: 300px; 
              margin: 10px 0; 
              border-radius: 8px; 
              box-shadow: 0 4px 8px rgba(0,0,0,0.1); 
              border: 3px solid #f0f0f0;
            }
            .completion-time { 
              font-size: 11px; 
              color: #888; 
              text-align: right; 
              margin-top: 10px; 
              padding-top: 10px; 
              border-top: 1px solid #eee;
            }
            .footer { 
              margin-top: 40px; 
              padding-top: 20px; 
              border-top: 2px solid ${organization?.primary_color || "#667eea"}; 
              text-align: center; 
              color: #666; 
              font-size: 12px;
            }
            .branding-notice {
              background: #f0f0f0;
              padding: 10px;
              margin-top: 20px;
              border-radius: 5px;
              text-align: center;
              font-size: 11px;
              color: #666;
            }
            @media print { 
              body { margin: 0; } 
              .company-header { margin: -20px -20px 20px -20px; }
            }
          </style>
        </head>
        <body>
          <div class="company-header">
            <div class="company-logo">
              ${displayLogo ? `<img src="${displayLogo}" alt="${displayName} Logo" />` : logoFallback}
            </div>
            <h1 class="company-name">${displayName}</h1>
            <p class="company-tagline">Professional Compliance & Quality Assurance</p>
          </div>
          
          <div class="report-header">
            <h1 class="report-title">${submission.checklist_templates?.name}</h1>
            <div class="report-meta">
              <div class="meta-item">
                <div class="meta-label">Submitted By</div>
                <div class="meta-value">${submission.profiles?.full_name}</div>
              </div>
              <div class="meta-item">
                <div class="meta-label">Email</div>
                <div class="meta-value">${submission.profiles?.email}</div>
              </div>
              <div class="meta-item">
                <div class="meta-label">Completion Date</div>
                <div class="meta-value">${new Date(submission.completed_at).toLocaleString()}</div>
              </div>
              <div class="meta-item">
                <div class="meta-label">Report Generated</div>
                <div class="meta-value">${new Date().toLocaleString()}</div>
              </div>
            </div>
          </div>
          
          <h2 style="color: #333; border-bottom: 2px solid ${organization?.primary_color || "#667eea"}; padding-bottom: 10px;">Task Responses</h2>
          ${responses
            .map(
              (response) => `
            <div class="task">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <div class="task-title">${response.checklist_items?.name}</div>
                <span class="task-type">${response.checklist_items?.task_type}</span>
              </div>
              ${response.checklist_items?.description ? `<div class="task-description">${response.checklist_items.description}</div>` : ""}
              
              <div class="response">
                ${
                  response.response_value
                    ? `
                  <div class="response-item">
                    <div class="response-label">Response:</div>
                    <div class="response-value">${response.response_value}</div>
                  </div>
                `
                    : ""
                }
                ${
                  response.notes
                    ? `
                  <div class="response-item">
                    <div class="response-label">Notes:</div>
                    <div class="response-value">${response.notes}</div>
                  </div>
                `
                    : ""
                }
                ${
                  response.photo_url
                    ? `
                  <div class="response-item">
                    <div class="response-label">Attached Photo:</div>
                    <img src="${response.photo_url}" alt="Task photo" class="photo" />
                  </div>
                `
                    : ""
                }
                <div class="completion-time">Completed: ${new Date(response.completed_at).toLocaleString()}</div>
              </div>
            </div>
          `,
            )
            .join("")}
            
          <div class="footer">
            <p>This report was generated by ${hasCustomBranding ? "your organization's" : "Mydailylogs"} compliance system.</p>
            <p>For questions or support, please contact your system administrator.</p>
            ${!hasCustomBranding ? '<div class="branding-notice">Upgrade your plan to customize report branding with your organization\'s logo and colors.</div>' : ""}
          </div>
        </body>
      </html>
    `

    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 250)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading reports...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <div>Please log in to view reports.</div>
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600 mt-2">Track compliance performance and generate insights</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/reports/detailed">
            <Button variant="outline">Detailed Reports</Button>
          </Link>
          <Link href="/admin/reports/export">
            <Button>Export Data</Button>
          </Link>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">30-Day Completion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completionRate}%</div>
            <p className="text-xs text-muted-foreground">
              {stats.completedCount} of {stats.totalCount} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.weeklyCount}</div>
            <p className="text-xs text-muted-foreground">Checklists completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.todayCount}</div>
            <p className="text-xs text-muted-foreground">Completed today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>Active this week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{Object.keys(teamStats || {}).length}</div>
            <p className="text-xs text-muted-foreground">Active this week</p>
          </CardContent>
        </Card>
      </div>

      {/* Team Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Team Performance (Last 7 Days)</CardTitle>
          <CardDescription>Individual completion rates and activity</CardDescription>
        </CardHeader>
        <CardContent>
          {teamStats && Object.keys(teamStats).length > 0 ? (
            <div className="space-y-4">
              {Object.entries(teamStats).map(([userId, stats]) => {
                const rate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0
                return (
                  <div key={userId} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-semibold">{stats.name}</h4>
                      <p className="text-sm text-gray-600">
                        {stats.completed} of {stats.total} completed
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${rate}%` }}></div>
                      </div>
                      <Badge variant={rate >= 80 ? "default" : rate >= 60 ? "secondary" : "destructive"}>{rate}%</Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-gray-500">No team activity in the last 7 days</p>
          )}
        </CardContent>
      </Card>

      {/* Recent Submissions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Submissions</CardTitle>
          <CardDescription>Latest completed checklists - click to view details</CardDescription>
        </CardHeader>
        <CardContent>
          {recentSubmissions && recentSubmissions.length > 0 ? (
            <div className="space-y-4">
              {recentSubmissions.map((submission) => {
                const submissionResponses =
                  detailedResponses?.filter((r) => r.checklist_id === submission.template_id) || []

                const hasCustomBranding = subscriptionLimits?.hasCustomBranding || false
                const displayName = hasCustomBranding ? organization?.name || "Your Organization" : "Mydailylogs"
                const displayLogo = hasCustomBranding ? organization?.logo_url : null
                const logoFallback = hasCustomBranding
                  ? organization?.name
                    ? organization.name.substring(0, 3).toUpperCase()
                    : "ORG"
                  : "MDL"

                return (
                  <div
                    key={submission.id}
                    className="border rounded-lg p-4 bg-white hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <h4 className="font-semibold">{submission.checklist_templates?.name}</h4>
                        <p className="text-sm text-gray-600">
                          By: <span className="font-medium">{submission.profiles?.full_name}</span>
                        </p>
                        <p className="text-xs text-gray-500">{new Date(submission.completed_at).toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="default">Completed</Badge>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Eye className="w-4 h-4 mr-1" />
                              View Report
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full flex items-center justify-center overflow-hidden">
                                    {displayLogo ? (
                                      <img
                                        src={displayLogo || "/placeholder.svg"}
                                        alt={`${displayName} Logo`}
                                        className="w-full h-full object-cover rounded-full"
                                      />
                                    ) : (
                                      <span className="text-white font-bold text-sm">{logoFallback}</span>
                                    )}
                                  </div>
                                  <span>{submission.checklist_templates?.name}</span>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => generatePDF(submission, submissionResponses)}
                                >
                                  <Download className="w-4 h-4 mr-1" />
                                  Download PDF
                                </Button>
                              </DialogTitle>
                              <DialogDescription>
                                Submitted by {submission.profiles?.full_name} on{" "}
                                {new Date(submission.completed_at).toLocaleString()}
                              </DialogDescription>
                            </DialogHeader>

                            <div className="mt-4 border rounded-lg bg-white">
                              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-t-lg text-center">
                                <div className="flex justify-center mb-3">
                                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center overflow-hidden">
                                    {displayLogo ? (
                                      <img
                                        src={displayLogo || "/placeholder.svg"}
                                        alt={`${displayName} Logo`}
                                        className="w-full h-full object-cover rounded-full"
                                      />
                                    ) : (
                                      <span className="text-indigo-600 font-bold text-lg">{logoFallback}</span>
                                    )}
                                  </div>
                                </div>
                                <h2 className="text-xl font-bold mb-1">{displayName}</h2>
                                <p className="text-sm opacity-90">Professional Compliance & Quality Assurance</p>
                              </div>

                              {/* Report Header */}
                              <div className="p-6 bg-blue-50 border-b">
                                <h3 className="text-xl font-bold text-gray-900 mb-4">
                                  {submission.checklist_templates?.name}
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="bg-white p-3 rounded border-l-4 border-indigo-500">
                                    <div className="text-xs font-bold text-gray-500 uppercase mb-1">Submitted By</div>
                                    <div className="text-sm text-gray-900">{submission.profiles?.full_name}</div>
                                  </div>
                                  <div className="bg-white p-3 rounded border-l-4 border-indigo-500">
                                    <div className="text-xs font-bold text-gray-500 uppercase mb-1">Email</div>
                                    <div className="text-sm text-gray-900">{submission.profiles?.email}</div>
                                  </div>
                                  <div className="bg-white p-3 rounded border-l-4 border-indigo-500">
                                    <div className="text-xs font-bold text-gray-500 uppercase mb-1">
                                      Completion Date
                                    </div>
                                    <div className="text-sm text-gray-900">
                                      {new Date(submission.completed_at).toLocaleString()}
                                    </div>
                                  </div>
                                  <div className="bg-white p-3 rounded border-l-4 border-indigo-500">
                                    <div className="text-xs font-bold text-gray-500 uppercase mb-1">
                                      Report Generated
                                    </div>
                                    <div className="text-sm text-gray-900">{new Date().toLocaleString()}</div>
                                  </div>
                                </div>
                              </div>

                              {/* Task Responses */}
                              <div className="p-6">
                                <h4 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b-2 border-indigo-500">
                                  Task Responses
                                </h4>
                                {submissionResponses.length > 0 ? (
                                  <div className="space-y-4">
                                    {submissionResponses.map((response) => (
                                      <div key={response.id} className="border rounded-lg p-4 bg-white shadow-sm">
                                        <div className="flex justify-between items-center mb-3">
                                          <h5 className="font-bold text-gray-900">{response.checklist_items?.name}</h5>
                                          <span className="bg-indigo-600 text-white px-3 py-1 rounded-full text-xs font-bold uppercase">
                                            {response.checklist_items?.task_type}
                                          </span>
                                        </div>

                                        {response.checklist_items?.description && (
                                          <div className="mb-3 p-2 bg-blue-50 rounded text-sm text-gray-600 italic">
                                            {response.checklist_items.description}
                                          </div>
                                        )}

                                        <div className="bg-gray-50 p-3 rounded">
                                          {response.response_value && (
                                            <div className="mb-2 pb-2 border-b border-gray-200">
                                              <div className="font-bold text-gray-700 text-sm mb-1">Response:</div>
                                              <div className="bg-white p-2 rounded border text-sm">
                                                {response.response_value}
                                              </div>
                                            </div>
                                          )}

                                          {response.notes && (
                                            <div className="mb-2 pb-2 border-b border-gray-200">
                                              <div className="font-bold text-gray-700 text-sm mb-1">Notes:</div>
                                              <div className="bg-white p-2 rounded border text-sm">
                                                {response.notes}
                                              </div>
                                            </div>
                                          )}

                                          {response.photo_url && (
                                            <div className="mb-2 pb-2 border-b border-gray-200">
                                              <div className="font-bold text-gray-700 text-sm mb-1">
                                                Attached Photo:
                                              </div>
                                              <img
                                                src={response.photo_url || "/placeholder.svg"}
                                                alt="Task photo"
                                                className="max-w-sm max-h-48 rounded-lg shadow-md border-2 border-gray-200 mt-2"
                                                onError={(e) => {
                                                  console.log("[v0] Photo failed to load:", response.photo_url)
                                                  e.currentTarget.src = "/photo-not-available.png"
                                                }}
                                              />
                                            </div>
                                          )}

                                          {!response.photo_url && response.checklist_items?.task_type === "photo" && (
                                            <div className="mb-2 pb-2 border-b border-gray-200">
                                              <div className="font-bold text-gray-700 text-sm mb-1">
                                                Attached Photo:
                                              </div>
                                              <div className="text-sm text-gray-500 italic">No photo uploaded</div>
                                            </div>
                                          )}

                                          <div className="text-xs text-gray-500 text-right pt-2 border-t border-gray-200">
                                            Completed: {new Date(response.completed_at).toLocaleString()}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-gray-500 text-center py-8">No detailed responses found</p>
                                )}

                                <div className="mt-8 pt-4 border-t-2 border-indigo-500 text-center text-gray-600 text-sm">
                                  <p>
                                    This report was generated by{" "}
                                    {hasCustomBranding ? "your organization's" : "Mydailylogs"} compliance system.
                                  </p>
                                  <p>For questions or support, please contact your system administrator.</p>
                                  {!hasCustomBranding && (
                                    <div className="mt-2 p-2 bg-gray-100 rounded text-xs">
                                      Upgrade your plan to customize report branding with your organization's logo and
                                      colors.
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-gray-500">No recent submissions found</p>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Compliance Reports</CardTitle>
            <CardDescription>Generate detailed compliance reports</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/reports/compliance">
              <Button className="w-full">View Compliance Report</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Template Analytics</CardTitle>
            <CardDescription>Analyze checklist template performance</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/reports/templates">
              <Button className="w-full bg-transparent" variant="outline">
                Template Reports
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Custom Reports</CardTitle>
            <CardDescription>Create custom date range reports</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/reports/custom">
              <Button className="w-full bg-transparent" variant="outline">
                Custom Report
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
