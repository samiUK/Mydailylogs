"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileText, RotateCcw, Trash2, Shield } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface DeletedReport {
  id: string
  report_name: string
  organization_name: string
  deleted_at: string
  deleted_by: string
  days_until_removal: number
}

export function ReportDirectorySection() {
  const [reports, setReports] = useState<DeletedReport[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const { toast } = useToast()

  const fetchDeletedReports = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/master/deleted-reports")
      const data = await response.json()
      setReports(data.reports || [])
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load deleted reports",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDeletedReports()
  }, [])

  const handleRestore = async (reportId: string) => {
    if (!confirm("Are you sure you want to restore this report?")) return

    setActionLoading(reportId)
    try {
      const response = await fetch("/api/master/restore-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Report restored successfully",
        })
        fetchDeletedReports()
      } else {
        throw new Error("Failed to restore")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to restore report",
        variant: "destructive",
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handlePermanentDelete = async (reportId: string) => {
    if (!confirm("⚠️ PERMANENT DELETE: This report will be removed forever. Are you absolutely sure?")) return

    setActionLoading(reportId)
    try {
      const response = await fetch("/api/master/permanent-delete-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Report permanently deleted",
        })
        fetchDeletedReports()
      } else {
        throw new Error("Failed to delete")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to permanently delete report",
        variant: "destructive",
      })
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="w-6 h-6" />
        <h2 className="text-xl font-semibold">Report Directory</h2>
      </div>
      <p className="text-gray-600 mb-6">
        Manage deleted reports - view, restore, or permanently delete reports within 30 days
      </p>

      {loading ? (
        <div className="bg-white rounded-lg border p-8 text-center">
          <p className="text-gray-500">Loading deleted reports...</p>
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-white rounded-lg border p-8 text-center">
          <Shield className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="font-semibold mb-2">No accidentally deleted reports</h3>
          <p className="text-gray-500 text-sm">
            Accidentally deleted reports from Scale organizations appear here for 90 days before permanent removal.
          </p>
          <Badge className="mt-4 bg-emerald-100 text-emerald-800">Scale Plan Premium Feature</Badge>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <div key={report.id} className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{report.report_name}</h3>
                  <p className="text-sm text-gray-600">{report.organization_name}</p>
                </div>
                <Badge
                  className={
                    report.days_until_removal < 7
                      ? "bg-red-100 text-red-800"
                      : report.days_until_removal < 14
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-emerald-100 text-emerald-800"
                  }
                >
                  {report.days_until_removal} days left
                </Badge>
              </div>

              <div className="text-sm text-gray-600 mb-4 space-y-1">
                <p>Deleted: {new Date(report.deleted_at).toLocaleString("en-GB")}</p>
                <p>Deleted by: {report.deleted_by}</p>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleRestore(report.id)}
                  disabled={actionLoading === report.id}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Restore
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handlePermanentDelete(report.id)}
                  disabled={actionLoading === report.id}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete Forever
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
