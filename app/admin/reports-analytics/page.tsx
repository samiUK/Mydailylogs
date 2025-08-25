"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Eye, Download, Search, Loader2 } from "lucide-react"
import Link from "next/link"

console.log("[v0] Admin Reports Analytics page - File loaded and parsing")

export default function AdminReportsAnalyticsPage() {
  console.log("[v0] Admin Reports Analytics page - Component function called")

  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [allReports, setAllReports] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
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

        // Combine and format reports
        const combinedReports = [
          ...(regularReports || []).map((report) => ({
            id: report.id,
            type: "regular" as const,
            name: report.checklist_templates?.name || "Unknown Template",
            description: report.checklist_templates?.description,
            schedule_type: report.checklist_templates?.schedule_type,
            status: report.status || "pending",
            date: report.assigned_at,
            completed_at: report.completed_at,
            assignee:
              report.profiles?.full_name ||
              `${report.profiles?.first_name} ${report.profiles?.last_name}` ||
              "Unknown User",
            assignee_email: report.profiles?.email,
          })),
          ...(dailyReports || []).map((report) => ({
            id: report.id,
            type: "daily" as const,
            name: report.checklist_templates?.name || "Unknown Template",
            description: report.checklist_templates?.description,
            schedule_type: report.checklist_templates?.schedule_type,
            status: report.status || "pending",
            date: report.date,
            completed_at: report.completed_at,
            assignee:
              report.profiles?.full_name ||
              `${report.profiles?.first_name} ${report.profiles?.last_name}` ||
              "Unknown User",
            assignee_email: report.profiles?.email,
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
        <p className="text-muted-foreground mt-2">View and analyze all report submissions</p>
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
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Reports List */}
      <Card>
        <CardHeader>
          <CardTitle>All Reports ({filteredReports.length})</CardTitle>
          <CardDescription>Complete list of report submissions</CardDescription>
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
                      <Badge variant={report.type === "daily" ? "default" : "secondary"}>
                        {report.type === "daily" ? "Daily" : "Regular"}
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
                      <span>Assigned to: {report.assignee}</span>
                      <span className="mx-2">•</span>
                      <span>Date: {new Date(report.date).toLocaleDateString()}</span>
                      {report.completed_at && (
                        <>
                          <span className="mx-2">•</span>
                          <span>Completed: {new Date(report.completed_at).toLocaleDateString()}</span>
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
