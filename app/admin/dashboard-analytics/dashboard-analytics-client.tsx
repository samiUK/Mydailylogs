"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Eye, Download, Trash2, FileText, Search, CheckSquare } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface Report {
  id: string
  template_id: string
  template_name: string
  user_name: string
  status: string
  completed_at: string | null
  assigned_at: string
  type: "assignment"
  submissions: Array<{
    id: string
    submitted_at: string
    report_data: any
  }>
}

export function DashboardAnalyticsClient({ reports }: { reports: Report[] }) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [deleteReport, setDeleteReport] = useState<Report | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [selectedReports, setSelectedReports] = useState<Set<string>>(new Set())
  const itemsPerPage = 10

  // Filter reports based on search
  const filteredReports = reports.filter(
    (report) =>
      searchTerm === "" ||
      report.template_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.user_name.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  // Paginate filtered reports
  const totalPages = Math.ceil(filteredReports.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedReports = filteredReports.slice(startIndex, startIndex + itemsPerPage)

  const handleDelete = async (downloadFirst: boolean) => {
    if (!deleteReport) return

    setDeleting(true)
    try {
      if (downloadFirst) {
        // Download the report first
        window.open(`/admin/reports/${deleteReport.id}?download=true`, "_blank")
        // Wait a bit for download to start
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }

      // Delete the report
      const response = await fetch(`/api/admin/delete-report?id=${deleteReport.id}&type=assignment`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed to delete report")

      router.refresh()
      setDeleteReport(null)
    } catch (error) {
      console.error("Error deleting report:", error)
      alert("Failed to delete report. Please try again.")
    } finally {
      setDeleting(false)
    }
  }

  const toggleReportSelection = (reportId: string) => {
    const newSelected = new Set(selectedReports)
    if (newSelected.has(reportId)) {
      newSelected.delete(reportId)
    } else {
      newSelected.add(reportId)
    }
    setSelectedReports(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedReports.size === paginatedReports.length) {
      setSelectedReports(new Set())
    } else {
      setSelectedReports(new Set(paginatedReports.map((r) => r.id)))
    }
  }

  const handleBulkDownload = () => {
    selectedReports.forEach((reportId) => {
      window.open(`/admin/reports/${reportId}?download=true`, "_blank")
    })
    setSelectedReports(new Set())
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <>
      {/* Search and Bulk Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Search and Manage Reports
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-center">
            <Input
              placeholder="Search by template name or assignee..."
              className="flex-1"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1) // Reset to first page on search
              }}
            />
            {selectedReports.size > 0 && (
              <Button onClick={handleBulkDownload} variant="default">
                <Download className="w-4 h-4 mr-2" />
                Download Selected ({selectedReports.size})
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Reports List with Pagination */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Latest assignments and report submissions (Page {currentPage} of {totalPages})
              </CardDescription>
            </div>
            {paginatedReports.length > 0 && (
              <Button variant="outline" size="sm" onClick={toggleSelectAll}>
                <CheckSquare className="w-4 h-4 mr-2" />
                {selectedReports.size === paginatedReports.length ? "Deselect All" : "Select All"}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {paginatedReports.length > 0 ? (
            <div className="space-y-4">
              {paginatedReports.map((report) => (
                <div key={report.id} className="flex items-start gap-4 p-4 border rounded-lg">
                  <input
                    type="checkbox"
                    checked={selectedReports.has(report.id)}
                    onChange={() => toggleReportSelection(report.id)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{report.template_name}</h4>
                      <Badge variant={report.status === "completed" ? "default" : "secondary"}>
                        {report.status || "pending"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{report.user_name}</p>

                    {/* Show multiple submissions with timestamps */}
                    {report.submissions.length > 0 ? (
                      <div className="space-y-1">
                        {report.submissions.map((submission, idx) => (
                          <div key={submission.id} className="text-sm text-muted-foreground">
                            <span className="font-medium">Submission {idx + 1}:</span>{" "}
                            {formatDateTime(submission.submitted_at)}
                          </div>
                        ))}
                      </div>
                    ) : report.assigned_at ? (
                      <span className="text-sm text-muted-foreground">
                        Assigned: {formatDateTime(report.assigned_at)}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/admin/reports/${report.id}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                    </Link>
                    {report.status === "completed" && report.submissions.length > 0 && (
                      <Link href={`/admin/reports/${report.id}?download=true`}>
                        <Button variant="default" size="sm">
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </Button>
                      </Link>
                    )}
                    <Button variant="destructive" size="sm" onClick={() => setDeleteReport(report)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {searchTerm ? "No matching reports" : "No reports yet"}
              </h3>
              <p className="text-muted-foreground">
                {searchTerm
                  ? "Try adjusting your search terms"
                  : "Assignments and reports will appear here once you start assigning tasks"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteReport} onOpenChange={(open) => !open && setDeleteReport(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Report?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deleteReport?.template_name}" for {deleteReport?.user_name}. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <Button variant="outline" onClick={() => handleDelete(true)} disabled={deleting}>
              <Download className="w-4 h-4 mr-2" />
              Download & Delete
            </Button>
            <AlertDialogAction onClick={() => handleDelete(false)} disabled={deleting} className="bg-destructive">
              <Trash2 className="w-4 h-4 mr-2" />
              Just Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
