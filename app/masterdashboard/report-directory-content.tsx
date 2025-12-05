"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { RefreshCw, Trash2, RotateCcw } from "lucide-react"

interface DeletedReport {
  id: string
  template_name: string
  template_description: string
  submitted_by: string
  deleted_at: string
  deleted_by: string
  organization_id: string
  notes: string
}

export function ReportDirectoryContent() {
  const [deletedReports, setDeletedReports] = useState<DeletedReport[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  useEffect(() => {
    fetchDeletedReports()
  }, [])

  async function fetchDeletedReports() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("submitted_reports")
        .select("*")
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false })

      if (error) throw error

      setDeletedReports(data || [])
    } catch (error) {
      console.error("[v0] Error fetching deleted reports:", error)
      toast.error("Failed to load deleted reports")
    } finally {
      setLoading(false)
    }
  }

  async function handleRestore(reportId: string) {
    setActionLoading(reportId)
    try {
      const { error } = await supabase
        .from("submitted_reports")
        .update({
          deleted_at: null,
          deleted_by: null,
        })
        .eq("id", reportId)

      if (error) throw error

      toast.success("Report restored successfully")
      fetchDeletedReports()
    } catch (error) {
      console.error("[v0] Error restoring report:", error)
      toast.error("Failed to restore report")
    } finally {
      setActionLoading(null)
    }
  }

  async function handlePermanentDelete(reportId: string) {
    if (!confirm("Are you sure you want to permanently delete this report? This action cannot be undone.")) {
      return
    }

    setActionLoading(reportId)
    try {
      const { error } = await supabase.from("submitted_reports").delete().eq("id", reportId)

      if (error) throw error

      toast.success("Report permanently deleted")
      fetchDeletedReports()
    } catch (error) {
      console.error("[v0] Error permanently deleting report:", error)
      toast.error("Failed to delete report")
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-600">Loading deleted reports...</span>
      </div>
    )
  }

  if (deletedReports.length === 0) {
    return (
      <div className="text-center py-12">
        <Trash2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No deleted reports found</p>
        <p className="text-sm text-gray-500 mt-2">
          Deleted reports will appear here for 30 days before automatic removal
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-600">Showing {deletedReports.length} deleted report(s)</p>
        <Button onClick={fetchDeletedReports} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {deletedReports.map((report) => {
        const deletedDate = new Date(report.deleted_at)
        const daysAgo = Math.floor((Date.now() - deletedDate.getTime()) / (1000 * 60 * 60 * 24))
        const daysRemaining = Math.max(0, 30 - daysAgo)

        return (
          <Card key={report.id} className="border-red-200">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{report.template_name}</CardTitle>
                  <CardDescription>{report.template_description}</CardDescription>
                </div>
                <Badge variant={daysRemaining < 7 ? "destructive" : "secondary"}>{daysRemaining} days left</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 mb-4 text-sm text-gray-600">
                <p>Submitted by: {report.submitted_by}</p>
                <p>
                  Deleted: {deletedDate.toLocaleDateString()} ({daysAgo} days ago)
                </p>
                <p>Deleted by: {report.deleted_by}</p>
                {report.notes && <p>Notes: {report.notes}</p>}
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => handleRestore(report.id)}
                  disabled={actionLoading === report.id}
                  variant="outline"
                  size="sm"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Restore
                </Button>
                <Button
                  onClick={() => handlePermanentDelete(report.id)}
                  disabled={actionLoading === report.id}
                  variant="destructive"
                  size="sm"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Permanently
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
