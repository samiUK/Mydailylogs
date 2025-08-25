"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import { Trash2, RotateCcw, Calendar, User, Building } from "lucide-react"
import { toast } from "sonner"

interface DeletedReport {
  id: string
  template_name: string
  submitted_by: string
  organization_name: string
  submitted_at: string
  deleted_at: string
  deleted_by: string
  responses: any[]
}

export default function ReportDirectoryPage() {
  const [deletedReports, setDeletedReports] = useState<DeletedReport[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchDeletedReports()
  }, [])

  const fetchDeletedReports = async () => {
    try {
      const { data, error } = await supabase
        .from("submitted_reports")
        .select(`
          *,
          profiles!submitted_reports_submitted_by_fkey(full_name),
          organizations(name)
        `)
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false })

      if (error) throw error
      setDeletedReports(data || [])
    } catch (error) {
      console.error("Error fetching deleted reports:", error)
      toast.error("Failed to load deleted reports")
    } finally {
      setIsLoading(false)
    }
  }

  const handleRestore = async (reportId: string) => {
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
      console.error("Error restoring report:", error)
      toast.error("Failed to restore report")
    }
  }

  const handlePermanentDelete = async (reportId: string) => {
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

  const getDaysInDirectory = (deletedAt: string) => {
    const deleted = new Date(deletedAt)
    const now = new Date()
    const diffTime = now.getTime() - deleted.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading deleted reports...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Report Directory</h1>
        <p className="text-muted-foreground mt-2">Deleted reports are kept here for 30 days before permanent removal</p>
      </div>

      {deletedReports.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <Trash2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No deleted reports</h3>
              <p className="text-muted-foreground">All reports are currently active</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {deletedReports.map((report) => {
            const daysInDirectory = getDaysInDirectory(report.deleted_at)
            const daysRemaining = 30 - daysInDirectory

            return (
              <Card key={report.id} className="border-destructive/20">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{report.template_name}</CardTitle>
                      <CardDescription className="flex items-center gap-4 mt-2">
                        <span className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {report.profiles?.full_name || "Unknown User"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Building className="h-4 w-4" />
                          {report.organizations?.name || "Unknown Organization"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Submitted: {new Date(report.submitted_at).toLocaleDateString()}
                        </span>
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={daysRemaining <= 7 ? "destructive" : "secondary"}>
                        {daysRemaining > 0 ? `${daysRemaining} days left` : "Expires today"}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Deleted {daysInDirectory} days ago • {report.responses?.length || 0} responses
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestore(report.id)}
                        className="flex items-center gap-1"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Restore
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm" className="flex items-center gap-1">
                            <Trash2 className="h-4 w-4" />
                            Delete Forever
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>⚠️ CRITICAL: Permanent Deletion</AlertDialogTitle>
                            <AlertDialogDescription className="space-y-2">
                              <p className="font-semibold text-destructive">
                                This action cannot be undone and will permanently remove this business report from the
                                system.
                              </p>
                              <p>
                                Report: <strong>{report.template_name}</strong>
                              </p>
                              <p>
                                Submitted by: <strong>{report.profiles?.full_name}</strong>
                              </p>
                              <p>
                                Organization: <strong>{report.organizations?.name}</strong>
                              </p>
                              <p className="text-sm text-muted-foreground mt-4">
                                Are you absolutely certain you want to permanently delete this report? This will remove
                                all associated data and responses forever.
                              </p>
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handlePermanentDelete(report.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Yes, Delete Forever
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
