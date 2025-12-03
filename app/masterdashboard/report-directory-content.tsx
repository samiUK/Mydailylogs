"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { Trash2, RotateCcw, Calendar, User, Download, Filter, Search, ShieldCheck } from "lucide-react"
import type { uuid } from "uuid"

interface DeletedReport {
  id: string
  template_name: string
  submitted_by: uuid
  submitted_at: string
  deleted_at: string
  report_data: any
  organization_id: string
  organization?: {
    organization_name: string
    subscription?: {
      plan_name: string
    }
  }
}

export function ReportDirectoryContent() {
  const [deletedReports, setDeletedReports] = useState<DeletedReport[]>([])
  const [filteredReports, setFilteredReports] = useState<DeletedReport[]>([])
  const [loading, setLoading] = useState(true)
  const [usernameFilter, setUsernameFilter] = useState("")
  const [dateFromFilter, setDateFromFilter] = useState("")
  const [dateToFilter, setDateToFilter] = useState("")
  const [organizationFilter, setOrganizationFilter] = useState("")

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  useEffect(() => {
    fetchDeletedReports()
  }, [])

  useEffect(() => {
    filterReports()
  }, [deletedReports, usernameFilter, dateFromFilter, dateToFilter, organizationFilter])

  const fetchDeletedReports = async () => {
    try {
      const { data, error } = await supabase
        .from("submitted_reports")
        .select(`
          *,
          organization:organizations!inner(
            organization_name,
            subscription:subscriptions!inner(
              plan_name
            )
          ),
          profile:profiles!submitted_reports_submitted_by_fkey(
            email
          )
        `)
        .not("deleted_at", "is", null)
        .gte("deleted_at", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
        .eq("organization.subscription.plan_name", "scale")
        .order("deleted_at", { ascending: false })

      if (error) throw error

      // Map the data to include submitter email
      const mappedData = (data || []).map((report: any) => ({
        ...report,
        submitter_email: report.profile?.email || "Unknown",
        organization_name: report.organization?.organization_name || "Unknown",
      }))

      setDeletedReports(mappedData || [])
    } catch (error) {
      console.error("Error fetching deleted reports:", error)
      toast.error("Failed to load deleted reports")
    } finally {
      setLoading(false)
    }
  }

  const filterReports = () => {
    let filtered = [...deletedReports]

    if (usernameFilter) {
      filtered = filtered.filter((report: any) =>
        report.submitter_email?.toLowerCase().includes(usernameFilter.toLowerCase()),
      )
    }

    if (organizationFilter) {
      filtered = filtered.filter((report: any) =>
        report.organization_name?.toLowerCase().includes(organizationFilter.toLowerCase()),
      )
    }

    if (dateFromFilter) {
      filtered = filtered.filter((report) => new Date(report.submitted_at) >= new Date(dateFromFilter))
    }

    if (dateToFilter) {
      filtered = filtered.filter((report) => new Date(report.submitted_at) <= new Date(dateToFilter))
    }

    setFilteredReports(filtered)
  }

  const restoreReport = async (reportId: string, organizationName: string) => {
    try {
      const response = await fetch("/api/master/restore-deleted-report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-master-admin-password": prompt("Enter master admin password to restore report:") || "",
        },
        body: JSON.stringify({ reportId }),
      })

      if (!response.ok) throw new Error("Failed to restore report")

      toast.success(`Report restored successfully for ${organizationName}`)
      fetchDeletedReports()
    } catch (error) {
      console.error("Error restoring report:", error)
      toast.error("Failed to restore report. Check your master admin credentials.")
    }
  }

  const downloadReport = async (report: DeletedReport) => {
    try {
      const reportData = {
        template_name: report.template_name,
        submitted_by: (report as any).submitter_email,
        submitted_at: report.submitted_at,
        organization: (report as any).organization_name,
        report_data: report.report_data,
      }

      const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${report.template_name}_${(report as any).submitter_email}_${new Date(report.submitted_at).toISOString().split("T")[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success("Report downloaded successfully")
    } catch (error) {
      console.error("Error downloading report:", error)
      toast.error("Failed to download report")
    }
  }

  const permanentlyDeleteReport = async (reportId: string) => {
    try {
      const password = prompt("Enter master admin password to permanently delete:")
      if (!password) return

      const { error } = await supabase.from("submitted_reports").delete().eq("id", reportId)

      if (error) throw error

      toast.success("Report permanently deleted")
      fetchDeletedReports()
    } catch (error) {
      console.error("Error permanently deleting report:", error)
      toast.error("Failed to permanently delete report")
    }
  }

  const getDaysRemaining = (deletedAt: string) => {
    const deletedDate = new Date(deletedAt)
    const expiryDate = new Date(deletedDate.getTime() + 90 * 24 * 60 * 60 * 1000)
    const now = new Date()
    const daysRemaining = Math.ceil((expiryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
    return Math.max(0, daysRemaining)
  }

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading deleted reports...</div>
  }

  if (deletedReports.length === 0) {
    return (
      <div className="text-center p-8">
        <ShieldCheck className="w-12 h-12 text-purple-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground mb-2">No accidentally deleted reports</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Accidentally deleted reports from Scale organizations appear here for 90 days before permanent removal.
        </p>
        <Badge variant="outline" className="bg-purple-50 border-purple-200 text-purple-700">
          Scale Plan Premium Feature
        </Badge>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Deletion Recovery Directory</h3>
          <p className="text-sm text-muted-foreground">Manage accidentally deleted reports from Scale organizations</p>
        </div>
        <Badge variant="outline" className="bg-purple-50 border-purple-200 text-purple-700">
          <ShieldCheck className="w-3 h-3 mr-1" />
          Scale Plan Exclusive
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filter Deleted Reports
          </CardTitle>
          <CardDescription>
            Search and filter accidentally deleted reports (90-day retention for Scale customers)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="organization-filter">Organization</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="organization-filter"
                  placeholder="Search by organization..."
                  value={organizationFilter}
                  onChange={(e) => setOrganizationFilter(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="username-filter">Submitter Email</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="username-filter"
                  placeholder="Search by email..."
                  value={usernameFilter}
                  onChange={(e) => setUsernameFilter(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date-from">Submitted From</Label>
              <Input
                id="date-from"
                type="date"
                value={dateFromFilter}
                onChange={(e) => setDateFromFilter(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date-to">Submitted To</Label>
              <Input id="date-to" type="date" value={dateToFilter} onChange={(e) => setDateToFilter(e.target.value)} />
            </div>
          </div>
          {(usernameFilter || dateFromFilter || dateToFilter || organizationFilter) && (
            <div className="mt-4 flex items-center gap-2">
              <Badge variant="secondary">
                Showing {filteredReports.length} of {deletedReports.length} reports
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setUsernameFilter("")
                  setOrganizationFilter("")
                  setDateFromFilter("")
                  setDateToFilter("")
                }}
              >
                Clear Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {filteredReports.map((report: any) => {
          const daysRemaining = getDaysRemaining(report.deleted_at)
          return (
            <Card key={report.id} className="border-l-4 border-l-purple-500">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{report.template_name}</CardTitle>
                      <Badge variant="outline" className="text-xs">
                        {report.organization_name}
                      </Badge>
                    </div>
                    <CardDescription className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        {report.submitter_email}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        Submitted: {new Date(report.submitted_at).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        Deleted: {new Date(report.deleted_at).toLocaleDateString()}
                      </span>
                    </CardDescription>
                  </div>
                  <Badge variant={daysRemaining <= 10 ? "destructive" : daysRemaining <= 30 ? "secondary" : "default"}>
                    {daysRemaining} days remaining
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadReport(report)}
                    className="flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => restoreReport(report.id, report.organization_name)}
                    className="flex items-center gap-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Restore
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" className="flex items-center gap-2">
                        <Trash2 className="w-4 h-4" />
                        Delete Permanently
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>⚠️ Critical Deletion Warning</AlertDialogTitle>
                        <AlertDialogDescription className="space-y-2">
                          <p className="font-medium text-red-600">
                            This action cannot be undone. This will permanently delete the report:
                          </p>
                          <p className="font-medium">"{report.template_name}"</p>
                          <p>Organization: {report.organization_name}</p>
                          <p>Submitted by: {report.submitter_email}</p>
                          <p>Submitted on: {new Date(report.submitted_at).toLocaleDateString()}</p>
                          <p className="text-sm text-muted-foreground mt-4">
                            This report will be completely removed from the system and cannot be recovered.
                          </p>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => permanentlyDeleteReport(report.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Yes, Delete Permanently
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
