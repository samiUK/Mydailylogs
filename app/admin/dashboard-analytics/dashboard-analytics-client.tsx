"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
import { Eye, Download, Trash2, FileText, Search, CheckSquare, ArrowUpDown } from "lucide-react"
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
  submitted_at: string | null
  submission_count: number
  type: "assignment" | "external"
  submissions: Array<{
    id: string
    submitted_at: string
    report_data: any
  }>
}

interface DashboardAnalyticsClientProps {
  reports: Report[]
  teamMembers: any[]
  organizationId: string
  hasPaidPlan: boolean
}

export function DashboardAnalyticsClient({
  reports,
  teamMembers,
  organizationId,
  hasPaidPlan,
}: DashboardAnalyticsClientProps) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [deleteReport, setDeleteReport] = useState<Report | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [selectedReports, setSelectedReports] = useState<Set<string>>(new Set())
  const [sortColumn, setSortColumn] = useState<"assigned" | "submitted" | "submittedBy">("submitted")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const itemsPerPage = 20

  const filteredReports = reports.filter(
    (report) =>
      searchTerm === "" ||
      report.template_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.user_name.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const sortedReports = [...filteredReports].sort((a, b) => {
    if (sortColumn === "assigned") {
      const aTime = new Date(a.assigned_at).getTime()
      const bTime = new Date(b.assigned_at).getTime()
      return sortOrder === "desc" ? bTime - aTime : aTime - bTime
    } else if (sortColumn === "submitted") {
      // Use submitted_at if available, otherwise use assigned_at
      const aTime = a.submitted_at ? new Date(a.submitted_at).getTime() : new Date(a.assigned_at).getTime()
      const bTime = b.submitted_at ? new Date(b.submitted_at).getTime() : new Date(b.assigned_at).getTime()
      return sortOrder === "desc" ? bTime - aTime : aTime - bTime
    } else {
      // submittedBy column
      const aName = a.user_name.toLowerCase()
      const bName = b.user_name.toLowerCase()
      return sortOrder === "desc" ? bName.localeCompare(aName) : aName.localeCompare(bName)
    }
  })

  const totalPages = Math.ceil(sortedReports.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedReports = sortedReports.slice(startIndex, startIndex + itemsPerPage)

  const toggleSort = () => {
    setSortOrder(sortOrder === "desc" ? "asc" : "desc")
    setCurrentPage(1)
  }

  const handleDelete = async (downloadFirst: boolean) => {
    if (!deleteReport) return

    setDeleting(true)
    try {
      if (downloadFirst) {
        window.open(`/admin/reports/${deleteReport.id}?download=true`, "_blank")
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }

      const response = await fetch(`/api/admin/delete-report?id=${deleteReport.id}&type=${deleteReport.type}`, {
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

  const handleBulkDelete = async (exportFirst: boolean) => {
    if (selectedReports.size === 0) return

    setDeleting(true)
    try {
      const response = await fetch("/api/admin/bulk-export-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportIds: Array.from(selectedReports),
          exportBeforeDelete: exportFirst,
        }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || "Failed to delete reports")
      }

      if (exportFirst && data.exportedData) {
        const blob = new Blob([JSON.stringify(data.exportedData, null, 2)], {
          type: "application/json",
        })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `reports-export-${new Date().toISOString().split("T")[0]}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }

      router.refresh()
      setSelectedReports(new Set())
    } catch (error) {
      console.error("[v0] Bulk delete error:", error)
      alert("Failed to delete reports. Please try again.")
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
    if (selectedReports.size === paginatedReports.length && paginatedReports.length > 0) {
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

  const handleColumnSort = (column: "assigned" | "submitted" | "submittedBy") => {
    if (sortColumn === column) {
      setSortOrder(sortOrder === "desc" ? "asc" : "desc")
    } else {
      setSortColumn(column)
      setSortOrder(column === "submittedBy" ? "asc" : "desc")
    }
    setCurrentPage(1)
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Search and Manage Reports
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-center flex-wrap">
            <Input
              placeholder="Search by template name or assignee..."
              className="flex-1 min-w-[200px]"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1)
              }}
            />
            {selectedReports.size > 0 && (
              <>
                <Button onClick={handleBulkDownload} variant="default">
                  <Download className="w-4 h-4 mr-2" />
                  Download Selected ({selectedReports.size})
                </Button>
                <Button onClick={() => handleBulkDelete(false)} variant="destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Selected
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Card data-reports-list>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
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
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-3 text-left w-12">
                        <input
                          type="checkbox"
                          checked={selectedReports.size === paginatedReports.length && paginatedReports.length > 0}
                          onChange={toggleSelectAll}
                          className="cursor-pointer"
                        />
                      </th>
                      <th className="p-3 text-left font-medium">Template</th>
                      <th className="p-3 text-left font-medium">
                        <button
                          onClick={() => handleColumnSort("submittedBy")}
                          className="flex items-center gap-1 hover:text-primary transition-colors"
                        >
                          Submitted By
                          <ArrowUpDown
                            className={`w-4 h-4 ${sortColumn === "submittedBy" ? "text-primary" : "text-muted-foreground"}`}
                          />
                        </button>
                      </th>
                      {hasPaidPlan && <th className="p-3 text-left font-medium">Submission Type</th>}
                      <th className="p-3 text-left font-medium">
                        <button
                          onClick={() => handleColumnSort("assigned")}
                          className="flex items-center gap-1 hover:text-primary transition-colors"
                        >
                          Assigned At
                          <ArrowUpDown
                            className={`w-4 h-4 ${sortColumn === "assigned" ? "text-primary" : "text-muted-foreground"}`}
                          />
                        </button>
                      </th>
                      <th className="p-3 text-left font-medium">
                        <button
                          onClick={() => handleColumnSort("submitted")}
                          className="flex items-center gap-1 hover:text-primary transition-colors"
                        >
                          Submitted At
                          <ArrowUpDown
                            className={`w-4 h-4 ${sortColumn === "submitted" ? "text-primary" : "text-muted-foreground"}`}
                          />
                        </button>
                      </th>
                      <th className="p-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedReports.map((report) => (
                      <tr key={report.id} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={selectedReports.has(report.id)}
                            onChange={() => toggleReportSelection(report.id)}
                            className="cursor-pointer"
                          />
                        </td>
                        <td className="p-3">
                          <div className="font-medium">{report.template_name}</div>
                        </td>
                        <td className="p-3">
                          <div className="text-sm">{report.user_name}</div>
                        </td>
                        {hasPaidPlan && (
                          <td className="p-3">
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                report.type === "external"
                                  ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                                  : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                              }`}
                            >
                              {report.type === "external" ? "External" : "Internal"}
                            </span>
                          </td>
                        )}
                        <td className="p-3">
                          <div className="text-sm">{formatDateTime(report.assigned_at)}</div>
                        </td>
                        <td className="p-3">
                          {report.submitted_at ? (
                            <div>
                              <div className="text-sm text-green-600 dark:text-green-400 font-medium">
                                {formatDateTime(report.submitted_at)}
                              </div>
                              {report.submission_count > 1 && (
                                <div className="text-xs text-muted-foreground">+{report.submission_count - 1} more</div>
                              )}
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground italic">Not submitted</div>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-end gap-2">
                            <Link href={`/admin/reports/${report.id}`}>
                              <Button variant="outline" size="sm">
                                <Eye className="w-4 h-4 mr-1" />
                                View
                              </Button>
                            </Link>
                            <Button variant="destructive" size="sm" onClick={() => setDeleteReport(report)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

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

      <AlertDialog open={!!deleteReport} onOpenChange={(open) => !open && setDeleteReport(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Report?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deleteReport?.template_name}" for {deleteReport?.user_name} and all
              associated photos from storage. This action cannot be undone.
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
