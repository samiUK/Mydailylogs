"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, FileText, Plus } from "lucide-react"
import { toast } from "sonner"

interface Template {
  id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
  is_recurring: boolean
  recurrence_type: string | null
}

interface StaffNewReportPageProps {
  templates: Template[]
  user: any
  profile: any
}

export default function StaffNewReportPage({ templates, user, profile }: StaffNewReportPageProps) {
  const [isCreating, setIsCreating] = useState<string | null>(null)
  const router = useRouter()

  const handleStartReport = async (templateId: string) => {
    setIsCreating(templateId)

    try {
      const response = await fetch("/api/staff/create-report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ templateId }),
      })

      const data = await response.json()

      if (response.ok) {
        // Show success toast
        toast.success(data.message)

        // Navigate to the checklist page
        if (data.type === "daily") {
          router.push(`/staff/checklist/daily/${data.reportId}`)
        } else {
          router.push(`/staff/checklist/${data.reportId}`)
        }
      } else {
        toast.error(data.error || "Failed to create report")
      }
    } catch (error) {
      console.error("Error creating report:", error)
      toast.error("Failed to create report. Please try again.")
    } finally {
      setIsCreating(null)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Create New Report</h1>
          <p className="text-muted-foreground">Choose from available report templates to create a new report</p>
        </div>
      </div>

      {templates && templates.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                  </div>
                  <Badge variant="secondary">Active</Badge>
                </div>
                <CardDescription className="line-clamp-2">
                  {template.description || "No description available"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4" />
                    <span>Created {new Date(template.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4" />
                    <span>Updated {new Date(template.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <Button
                  onClick={() => handleStartReport(template.id)}
                  disabled={isCreating === template.id}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {isCreating === template.id ? "Creating..." : "Start Report"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
              <div>
                <h3 className="text-lg font-semibold">No Report Templates Available</h3>
                <p className="text-muted-foreground">
                  No active report templates found. Contact your administrator to create report templates.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
