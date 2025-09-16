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
import { Trash2, RotateCcw, Calendar, User, FileText, Download, Filter, Search } from "lucide-react"

interface DeletedReport {
  id: string
  template_title: string
  submitted_by: string
  submitted_at: string
  deleted_at: string
  responses: any
  organization_id: string
}

export function ReportDirectoryContent() {
  const [deletedReports, setDeletedReports] = useState<DeletedReport[]>([])
  const [filteredReports, setFilteredReports] = useState<DeletedReport[]>([])
  const [loading, setLoading] = useState(true)
  const [usernameFilter, setUsernameFilter] = useState("")
  const [dateFromFilter, setDateFromFilter] = useState("")
  const [dateToFilter, setDateToFilter] = useState("")

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  useEffect(() => {
    fetchDeletedReports()
  }, [])

  useEffect(() => {
    filterReports()
  }, [deletedReports, usernameFilter, dateFromFilter, dateToFilter])

  const fetchDeletedReports = async () => {
    try {
      const { data, error } = await supabase
        .from("submitted_reports")
        .select("*")
        .not("deleted_at", "is", null)
        .gte("deleted_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order("deleted_at", { ascending: false })

      if (error) throw error
      setDeletedReports(data || [])
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
      filtered = filtered.filter((report) => report.submitted_by.toLowerCase().includes(usernameFilter.toLowerCase()))
    }

    if (dateFromFilter) {
      filtered = filtered.filter((report) => new Date(report.submitted_at) >= new Date(dateFromFilter))
    }

    if (dateToFilter) {
      filtered = filtered.filter((report) => new Date(report.submitted_at) <= new Date(dateToFilter))
    }

    setFilteredReports(filtered)
  }

  const restoreReport = async (reportId: string) => {
    try {
      const { error } = await supabase.from("submitted_reports").update({ deleted_at: null }).eq("id", reportId)

      if (error) throw error

      toast.success("Report restored successfully and moved back to admin reports area")
      fetchDeletedReports()
    } catch (error) {
      console.error("Error restoring report:", error)
      toast.error("Failed to restore report")
    }
  }

  const downloadReport = async (report: DeletedReport) => {
    try {
      const reportData = {
        template_title: report.template_title,
        submitted_by: report.submitted_by,
        submitted_at: report.submitted_at,
        responses: report.responses,
      }

      const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${report.template_title}_${report.submitted_by}_${new Date(report.submitted_at).toISOString().split("T")[0]}.json`
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
    const expiryDate = new Date(deletedDate.getTime() + 30 * 24 * 60 * 60 * 1000)
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
        <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground mb-2">No accidentally deleted reports</h3>
        <p className="text-sm text-muted-foreground">
          Accidentally deleted reports by users will appear here for 30 days before permanent removal.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filter Deleted Reports
          </CardTitle>
          <CardDescription>Search and filter accidentally deleted reports from the last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="username-filter">Username (Email)</Label>
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
          {(usernameFilter || dateFromFilter || dateToFilter) && (
            <div className="mt-4 flex items-center gap-2">
              <Badge variant="secondary">
                Showing {filteredReports.length} of {deletedReports.length} reports
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setUsernameFilter("")
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
        {filteredReports.map((report) => {
          const daysRemaining = getDaysRemaining(report.deleted_at)
          return (
            <Card key={report.id} className="border-l-4 border-l-red-500">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{report.template_title}</CardTitle>
                    <CardDescription className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        {report.submitted_by}
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
                  <Badge variant={daysRemaining <= 7 ? "destructive" : "secondary"}>
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
                    onClick={() => restoreReport(report.id)}
                    className="flex items-center gap-2"
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
                          <p className="font-medium">"{report.template_title}"</p>
                          <p>Submitted by: {report.submitted_by}</p>
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
