"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Eye, Download, Calendar, User } from "lucide-react"
import { format } from "date-fns"

interface SubmittedReport {
  id: string
  template_name: string
  template_description: string
  submitted_by: string
  submitted_at: string
  status: string
  report_data: any
  notes: string
  profiles: {
    full_name: string
    email: string
  }
}

export default function SubmittedReportsPage() {
  const [reports, setReports] = useState<SubmittedReport[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  useEffect(() => {
    fetchSubmittedReports()
  }, [])

  const fetchSubmittedReports = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single()

      if (!profile) return

      const { data, error } = await supabase
        .from("submitted_reports")
        .select(`
          *,
          profiles!submitted_by (
            full_name,
            email
          )
        `)
        .eq("organization_id", profile.organization_id)
        .order("submitted_at", { ascending: false })

      if (error) throw error

      setReports(data || [])
    } catch (err) {
      console.error("Error fetching submitted reports:", err)
      setError("Failed to load submitted reports")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading submitted reports...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center text-red-600">{error}</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Submitted Reports</h1>
        <p className="text-muted-foreground mt-2">
          View all completed reports submitted by your team members. These reports are preserved independently of
          templates.
        </p>
      </div>

      {reports.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">No submitted reports found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {reports.map((report) => (
            <Card key={report.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{report.template_name}</CardTitle>
                    <CardDescription className="mt-1">{report.template_description}</CardDescription>
                  </div>
                  <Badge variant="secondary" className="ml-4">
                    {report.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Submitted by: {report.profiles?.full_name || "Unknown"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{format(new Date(report.submitted_at), "PPP p")}</span>
                  </div>
                </div>

                {report.notes && (
                  <div className="mb-4">
                    <p className="text-sm text-muted-foreground mb-1">Notes:</p>
                    <p className="text-sm bg-muted p-2 rounded">{report.notes}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
