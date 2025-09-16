"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Eye, Download, Search, Loader2, ExternalLink, UserPlus } from "lucide-react"
import Link from "next/link"

console.log("[v0] Admin Reports Analytics page - File loaded and parsing")

export default function AdminReportsAnalyticsPage() {
  console.log("[v0] Admin Reports Analytics page - Component function called")

  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [allReports, setAllReports] = useState<any[]>([])
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [assigningReport, setAssigningReport] = useState<any>(null)
  const [selectedMember, setSelectedMember] = useState("")
  const [assigning, setAssigning] = useState(false)
  const router = useRouter()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  useEffect(() => {
    async function loadData() {
      try {
        console.log("[v0] Admin Reports Analytics page - Loading user data")

        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          console.log("[v0] Admin Reports Analytics page - No user found, redirecting to login")
          router.push("/auth/login")
          return
        }

        setUser(user)
        console.log("[v0] Admin Reports Analytics page - User found:", user.email)

        const { data: profile } = await supabase
          .from("profiles")
          .select("organization_id, role")
          .eq("id", user.id)
          .single()

        if (!profile || profile.role !== "admin") {
          console.log("[v0] Admin Reports Analytics page - Not admin, redirecting")
          router.push("/auth/login")
          return
        }

        setProfile(profile)
        console.log("[v0] Admin Reports Analytics page - Profile loaded, org:", profile.organization_id)

        console.log("[v0] Auto-clearing submission notifications for reports page visit")
        const { error: clearError } = await supabase
          .from("notifications")
          .update({ is_read: true })
          .eq("user_id", user.id)
          .in("type", ["submission", "report_submitted", "daily_log_submitted"])
          .eq("is_read", false)

        if (clearError) {
          console.error("[v0] Error auto-clearing submission notifications:", clearError)
        } else {
          console.log("[v0] Successfully auto-cleared submission notifications")
        }

        const { data: members } = await supabase
          .from("profiles")
          .select("id, full_name, first_name, last_name, email, role")
          .eq("organization_id", profile.organization_id)
          .in("role", ["staff", "admin"])
          .order("full_name")

        setTeamMembers(members || [])

        // Load reports data
        console.log("[v0] Admin Reports Analytics page - Loading reports data")

        const { data: regularReports } = await supabase
          .from("template_assignments")
          .select(`
            id,
            status,
            assigned_at,
            completed_at,
            checklist_templates!inner(id, name, description, schedule_type),
            profiles!template_assignments_assigned_to_fkey(id, full_name, first_name, last_name, email)
          `)
          .eq("organization_id", profile.organization_id)
          .order("assigned_at", { ascending: false })

        const { data: dailyReports } = await supabase
          .from("daily_checklists")
          .select(`
            id,
            status,
            date,
            completed_at,
            checklist_templates!inner(id, name, description, schedule_type),
            profiles!daily_checklists_assigned_to_fkey(id, full_name, first_name, last_name, email)
          `)
          .eq("organization_id", profile.organization_id)
          .order("date", { ascending: false })

        const { data: externalReports } = await supabase
          .from("external_submissions")
          .select(`
            id,
            submitter_name,
            status,
            submitted_at,
            template_id,
            checklist_templates!inner(id, name, description, schedule_type)
          `)
          .eq("organization_id", profile.organization_id)
          .order("submitted_at", { ascending: false })

        // Combine and format reports
        const combinedReports = [
          ...(regularReports || []).map((report) => ({
            id: report.id,
            type: "regular" as const,
            name: report.checklist_templates?.[0]?.name || "Unknown Template",
            description: report.checklist_templates?.[0]?.description,
            schedule_type: report.checklist_templates?.[0]?.schedule_type,
            status: report.status || "pending",
            date: report.assigned_at,
            completed_at: report.completed_at,
            assignee:
              report.profiles?.[0]?.full_name ||
              `${report.profiles?.[0]?.first_name} ${report.profiles?.[0]?.last_name}` ||
              "Unknown User",
            assignee_email: report.profiles?.[0]?.email,
          })),
          ...(dailyReports || []).map((report) => ({
            id: report.id,
            type: "daily" as const,
            name: report.checklist_templates?.[0]?.name || "Unknown Template",
            description: report.checklist_templates?.[0]?.description,
            schedule_type: report.checklist_templates?.[0]?.schedule_type,
            status: report.status || "pending",
            date: report.date,
            completed_at: report.completed_at,
            assignee:
              report.profiles?.[0]?.full_name ||
              `${report.profiles?.[0]?.first_name} ${report.profiles?.[0]?.last_name}` ||
              "Unknown User",
            assignee_email: report.profiles?.[0]?.email,
          })),
          ...(externalReports || []).map((report) => ({
            id: report.id,
            type: "external" as const,
            name: report.checklist_templates?.[0]?.name || "Unknown Template",
            description: report.checklist_templates?.[0]?.description,
            schedule_type: report.checklist_templates?.[0]?.schedule_type,
            status: report.status || "completed",
            date: report.submitted_at,
            completed_at: report.submitted_at,
            assignee: report.submitter_name,
            assignee_email: null,
            template_id: report.template_id,
          })),
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

        setAllReports(combinedReports)
        console.log("[v0] Admin Reports Analytics page - Found", combinedReports.length, "total reports")
      } catch (error) {
        console.error("[v0] Admin Reports Analytics page - Error loading data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [router, supabase])

  const handleAssignToMember = async () => {
    if (!assigningReport || !selectedMember) return

    setAssigning(true)
    try {
      console.log("[v0] Assigning external report to team member:", selectedMember)

      // Create a new template assignment for the selected team member
      const { error: assignmentError } = await supabase.from("template_assignments").insert({
        template_id: assigningReport.template_id,
        assigned_to: selectedMember,
        organization_id: profile.organization_id,
        status: "active",
        assigned_at: new Date().toISOString(),
        is_active: true,
      })

      if (assignmentError) throw assignmentError

      // Update external submission status to indicate it's been assigned
      const { error: updateError } = await supabase
        .from("external_submissions")
        .update({
          status: "assigned_to_team",
          updated_at: new Date().toISOString(),
        })
        .eq("id", assigningReport.id)

      if (updateError) throw updateError

      console.log("[v0] Successfully assigned external report to team member")

      // Refresh the reports list
      window.location.reload()
    } catch (error) {
      console.error("[v0] Error assigning report:", error)
      alert("Error assigning report to team member. Please try again.")
    } finally {
      setAssigning(false)
      setAssigningReport(null)
      setSelectedMember("")
    }
  }

  // Filter reports based on search and filters
  const filteredReports = allReports.filter((report) => {
    const matchesSearch =
      searchTerm === "" ||
      report.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.assignee.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" || report.status === statusFilter
    const matchesType = typeFilter === "all" || report.type === typeFilter

    return matchesSearch && matchesStatus && matchesType
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading reports...</span>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Reports and Analytics</h1>
        <p className="text-muted-foreground mt-2">
          View and analyze all report submissions including external contractors
        </p>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Search Reports
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input
              placeholder="Search by report name or assignee..."
              className="flex-1"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="active">Active</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="daily">Daily Reports</SelectItem>
                <SelectItem value="regular">Regular Reports</SelectItem>
                <SelectItem value="external">External Reports</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Reports List */}
      <Card>
        <CardHeader>
          <CardTitle>All Reports ({filteredReports.length})</CardTitle>
          <CardDescription>Complete list of report submissions including external contractors</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredReports.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm || statusFilter !== "all" || typeFilter !== "all"
                  ? "No reports match your filters"
                  : "No reports found"}
              </div>
            ) : (
              filteredReports.map((report) => (
                <div
                  key={`${report.type}-${report.id}`}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-medium">{report.name}</h3>
                      <Badge
                        variant={
                          report.type === "daily" ? "default" : report.type === "external" ? "outline" : "secondary"
                        }
                        className={report.type === "external" ? "border-blue-500 text-blue-700" : ""}
                      >
                        {report.type === "daily" ? (
                          "Daily"
                        ) : report.type === "external" ? (
                          <span className="flex items-center gap-1">
                            <ExternalLink className="w-3 h-3" />
                            External
                          </span>
                        ) : (
                          "Regular"
                        )}
                      </Badge>
                      <Badge
                        variant={
                          report.status === "completed"
                            ? "default"
                            : report.status === "active"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {report.status || "pending"}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      <span>
                        {report.type === "external" ? "Submitted by:" : "Assigned to:"} {report.assignee}
                      </span>
                      <span className="mx-2">•</span>
                      <span>Date: {new Date(report.date).toLocaleDateString()}</span>
                      {report.completed_at && (
                        <>
                          <span className="mx-2">•</span>
                          <span>
                            {report.type === "external" ? "Submitted:" : "Completed:"}{" "}
                            {new Date(report.completed_at).toLocaleDateString()}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/admin/reports/${report.type}-${report.id}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4 mr-1" />
                        View Report
                      </Button>
                    </Link>
                    {report.type === "external" && report.status !== "assigned_to_team" && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => setAssigningReport(report)}>
                            <UserPlus className="w-4 h-4 mr-1" />
                            Assign
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Assign External Report to Team Member</DialogTitle>
                            <DialogDescription>
                              Assign "{report.name}" submitted by {report.assignee} to an internal team member.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-medium">Select Team Member</label>
                              <Select value={selectedMember} onValueChange={setSelectedMember}>
                                <SelectTrigger className="w-full mt-1">
                                  <SelectValue placeholder="Choose a team member..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {teamMembers.map((member) => (
                                    <SelectItem key={member.id} value={member.id}>
                                      {member.full_name || `${member.first_name} ${member.last_name}`} ({member.email})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                onClick={handleAssignToMember}
                                disabled={!selectedMember || assigning}
                                className="flex-1"
                              >
                                {assigning ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Assigning...
                                  </>
                                ) : (
                                  <>
                                    <UserPlus className="w-4 h-4 mr-2" />
                                    Assign Report
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Export Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Export Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Download CSV
            </Button>
            <Link href="/admin/reports/export">
              <Button variant="outline">Advanced Export</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
