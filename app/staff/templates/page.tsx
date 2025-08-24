console.log("[v0] Staff Templates page - File loaded and parsing")

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckSquare, Calendar, Clock, AlertCircle } from "lucide-react"

export default async function StaffTemplatesPage() {
  console.log("[v0] Staff Templates page - Component function called")

  const supabase = createClient()

  // Get user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  console.log("[v0] Staff Templates page - User:", user ? "found" : "not found")

  if (!user) {
    console.log("[v0] Staff Templates page - No user found, redirecting to login")
    redirect("/auth/login")
  }

  // Get user's profile and organization
  const { data: userProfile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  console.log("[v0] Staff Templates page - Profile:", userProfile ? "found" : "not found")
  console.log("[v0] Staff Templates page - Profile error:", profileError)

  if (!userProfile?.organization_id) {
    console.log("[v0] Staff Templates page - No organization found")
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Profile Setup Required</h2>
          <p className="text-gray-600">Your profile needs to be set up with an organization.</p>
        </div>
      </div>
    )
  }

  // Get available templates for the organization
  const { data: availableTemplates, error: templatesError } = await supabase
    .from("checklist_templates")
    .select(`
      *,
      checklist_items(id, name, task_type, description)
    `)
    .eq("organization_id", userProfile.organization_id)
    .eq("is_active", true)
    .order("name")

  console.log("[v0] Staff Templates page - Templates found:", availableTemplates?.length || 0)
  console.log("[v0] Staff Templates page - Templates error:", templatesError)

  const templates = availableTemplates || []

  const getScheduleIcon = (scheduleType: string) => {
    switch (scheduleType) {
      case "daily":
        return <Calendar className="w-4 h-4 text-blue-500" />
      case "weekly":
        return <Clock className="w-4 h-4 text-green-500" />
      case "monthly":
        return <AlertCircle className="w-4 h-4 text-orange-500" />
      case "specific":
        return <CheckSquare className="w-4 h-4 text-purple-500" />
      default:
        return <CheckSquare className="w-4 h-4 text-gray-500" />
    }
  }

  const getScheduleLabel = (scheduleType: string) => {
    switch (scheduleType) {
      case "daily":
        return "Daily"
      case "weekly":
        return "Weekly"
      case "monthly":
        return "Monthly"
      case "specific":
        return "Specific Date"
      default:
        return "One-time"
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Available Templates</h1>
        <p className="text-gray-600 mt-2">View available compliance templates for your organization</p>
      </div>

      {/* Templates Grid */}
      {templates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <Card key={template.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <div className="flex items-center gap-1">
                    {getScheduleIcon(template.schedule_type)}
                    <Badge variant="secondary" className="text-xs">
                      {getScheduleLabel(template.schedule_type)}
                    </Badge>
                  </div>
                </div>
                {template.description && <CardDescription>{template.description}</CardDescription>}
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-2">
                      <strong>{template.checklist_items?.length || 0}</strong> tasks to complete
                    </p>
                    {template.checklist_items?.slice(0, 3).map((item: any) => (
                      <div key={item.id} className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                        <CheckSquare className="w-3 h-3" />
                        <span>{item.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {item.task_type}
                        </Badge>
                      </div>
                    ))}
                    {template.checklist_items?.length > 3 && (
                      <p className="text-xs text-gray-400">+{template.checklist_items.length - 3} more tasks...</p>
                    )}
                  </div>

                  <div className="text-center">
                    <p className="text-sm text-gray-600">Contact your admin to get this template assigned</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <CheckSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Templates Available</h3>
            <p className="text-gray-600">
              No templates are currently available for your organization. Contact your admin for more information.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
