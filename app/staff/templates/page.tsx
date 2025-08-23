"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Calendar, CheckSquare, Clock, AlertCircle } from "lucide-react"
import { toast } from "sonner"

export default function StaffTemplatesPage() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [templates, setTemplates] = useState<any[]>([])
  const [filteredTemplates, setFilteredTemplates] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<"all" | "daily" | "weekly" | "monthly" | "specific">("all")
  const [assigning, setAssigning] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      const supabase = createClient()

      // Get user
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser()
      if (!currentUser) return

      setUser(currentUser)

      // Get user's profile and organization
      const { data: userProfile } = await supabase.from("profiles").select("*").eq("id", currentUser.id).single()

      setProfile(userProfile)

      if (!userProfile?.organization_id) return

      // Get available templates for the organization
      const { data: availableTemplates } = await supabase
        .from("checklist_templates")
        .select(`
          *,
          checklist_items(id, name, task_type, description)
        `)
        .eq("organization_id", userProfile.organization_id)
        .eq("is_active", true)
        .order("name")

      setTemplates(availableTemplates || [])
      setFilteredTemplates(availableTemplates || [])
      setLoading(false)
    }

    loadData()
  }, [])

  useEffect(() => {
    let filtered = [...templates]

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (template) =>
          template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          template.description?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Apply type filter
    if (filterType !== "all") {
      filtered = filtered.filter((template) => template.schedule_type === filterType)
    }

    setFilteredTemplates(filtered)
  }, [templates, searchTerm, filterType])

  const assignTemplateToSelf = async (templateId: string) => {
    if (!user || !profile) return

    setAssigning(templateId)
    const supabase = createClient()

    try {
      // Check if already assigned
      const { data: existingAssignment } = await supabase
        .from("template_assignments")
        .select("id")
        .eq("template_id", templateId)
        .eq("assigned_to", user.id)
        .eq("status", "pending")
        .single()

      if (existingAssignment) {
        toast.error("You already have this template assigned")
        return
      }

      // Create new assignment
      const { error } = await supabase.from("template_assignments").insert({
        template_id: templateId,
        assigned_to: user.id,
        assigned_by: user.id, // Self-assigned
        organization_id: profile.organization_id,
        status: "pending",
        assigned_at: new Date().toISOString(),
        due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Due tomorrow
      })

      if (error) throw error

      toast.success("Template assigned successfully! Check your dashboard to complete it.")
    } catch (error) {
      console.error("Error assigning template:", error)
      toast.error("Failed to assign template")
    } finally {
      setAssigning(null)
    }
  }

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading templates...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <div>Please log in to view templates.</div>
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Available Templates</h1>
        <p className="text-gray-600 mt-2">Assign yourself to available compliance templates</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white"
            />
          </div>
        </div>
        <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
          <SelectTrigger className="w-48 bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Templates</SelectItem>
            <SelectItem value="daily">Daily Reports</SelectItem>
            <SelectItem value="weekly">Weekly Reports</SelectItem>
            <SelectItem value="monthly">Monthly Reports</SelectItem>
            <SelectItem value="specific">Specific Date</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Templates Grid */}
      {filteredTemplates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
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

                  <Button
                    onClick={() => assignTemplateToSelf(template.id)}
                    disabled={assigning === template.id}
                    className="w-full"
                  >
                    {assigning === template.id ? "Assigning..." : "Assign to Myself"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <CheckSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Templates Found</h3>
            <p className="text-gray-600">
              {searchTerm || filterType !== "all"
                ? "No templates match your search criteria"
                : "No templates are currently available for self-assignment"}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
