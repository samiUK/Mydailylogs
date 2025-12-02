"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Eye, Download, Calendar, FileText, AlertCircle } from "lucide-react"
import { format } from "date-fns"
import { useRouter } from "next/navigation"

interface SubmittedReport {
  id: string
  template_name: string
  template_description: string | null
  submitted_at: string
  status: string
  report_data: any
  notes: string | null
}

export default function StaffReportsPage() {
  const [reports, setReports] = useState<SubmittedReport[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchMyReports()
  }, [])

  const fetchMyReports = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setError("Please log in to view your reports.")
        setLoading(false)
        return
      }

      const { data, error: reportsError } = await supabase
        .from("submitted_reports")
        .select("*")
        .eq("submitted_by", user.id)
        .order("submitted_at", { ascending: false })

      if (reportsError) throw reportsError

      setReports(data || [])
    } catch (err) {
      console.error("Error fetching reports:", err)
      setError("Failed to load your submitted reports")
    } finally {
      setLoading(false)
    }
  }

  const handleViewReport = (reportId: string) => {
    router.push(`/staff/reports/${reportId}`)
  }

  const handleDownloadPDF = async (reportId: string) => {
    router.push(`/staff/reports/${reportId}`)
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Card className="bg-red-50 border-red-200">
          <CardContent className="flex items-center gap-3 py-6">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-red-700">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Reports & Analytics</h1>
        <p className="text-muted-foreground mt-2">View and download all your submitted compliance reports</p>
      </div>

      {reports.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground text-lg">No submitted reports found</p>
            <p className="text-sm text-muted-foreground mt-2">Complete and submit checklists to see them here</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {reports.map((report) => (
            <Card key={report.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl">{report.template_name}</CardTitle>
                    {report.template_description && (
                      <CardDescription className="mt-1">{report.template_description}</CardDescription>
                    )}
                  </div>
                  <Badge variant={report.status === "completed" ? "default" : "secondary"} className="ml-4">
                    {report.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Submitted on {format(new Date(report.submitted_at), "PPP 'at' p")}
                  </span>
                </div>

                {report.notes && (
                  <div className="mb-4 p-3 bg-muted rounded-md">
                    <p className="text-sm font-medium mb-1">Notes:</p>
                    <p className="text-sm text-muted-foreground">{report.notes}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button variant="default" size="sm" onClick={() => handleViewReport(report.id)}>
                    <Eye className="h-4 w-4 mr-2" />
                    View Report
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDownloadPDF(report.id)}>
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {reports.length > 0 && (
        <div className="text-center text-sm text-muted-foreground pt-4">
          Showing {reports.length} {reports.length === 1 ? "report" : "reports"}
        </div>
      )}
    </div>
  )
}
