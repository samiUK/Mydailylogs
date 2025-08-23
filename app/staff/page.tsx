import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function StaffDashboard() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  // Get user profile
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  const { data: assignedTemplates } = await supabase
    .from("template_assignments")
    .select(`
      *,
      checklist_templates:template_id(
        id,
        name,
        description,
        frequency
      )
    `)
    .eq("assigned_to", user.id)
    .eq("is_active", true)
    .order("assigned_at", { ascending: false })

  console.log(
    "[v0] All assigned templates:",
    assignedTemplates?.map((a) => ({
      name: a.checklist_templates?.name,
      status: a.status,
      completed_at: a.completed_at,
      assigned_at: a.assigned_at,
    })),
  )

  const today = new Date().toDateString()
  console.log("[v0] Today's date string:", today)

  const availableTemplates = assignedTemplates?.filter((assignment) => {
    // If template was completed today, hide it until tomorrow
    if (assignment.completed_at) {
      const completedDate = new Date(assignment.completed_at).toDateString()
      console.log("[v0] Template completed date:", completedDate, "vs today:", today)
      if (completedDate === today) {
        console.log("[v0] Hiding template completed today:", assignment.checklist_templates?.name)
        return false // Hide completed templates for today
      }
    }
    return true // Show active templates and templates completed on previous days
  })

  console.log(
    "[v0] Available templates after filtering:",
    availableTemplates?.map((a) => a.checklist_templates?.name),
  )

  const totalAssigned = assignedTemplates?.length || 0
  const completedTemplates = assignedTemplates?.filter((a) => a.status === "completed").length || 0
  const activeTemplates =
    availableTemplates?.filter((a) => {
      // Don't count templates completed today as active
      if (a.completed_at && new Date(a.completed_at).toDateString() === today) {
        return false
      }
      return a.status === "active" || !a.status
    }).length || 0

  const completedToday =
    assignedTemplates?.filter((a) => {
      if (!a.completed_at) return false
      return new Date(a.completed_at).toDateString() === today
    }).length || 0

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const completedThisWeek =
    assignedTemplates?.filter((a) => {
      if (!a.completed_at) return false
      return new Date(a.completed_at) >= weekAgo
    }).length || 0

  console.log("[v0] Dashboard stats:", {
    totalAssigned,
    completedTemplates,
    activeTemplates,
    completedToday,
  })

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">My Assigned Tasks</h1>
        <p className="text-muted-foreground mt-2">Complete your assigned compliance checklists</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned Templates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAssigned}</div>
            <p className="text-xs text-muted-foreground">Active assignments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completedToday}</div>
            <p className="text-xs text-muted-foreground">Finished today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{activeTemplates}</div>
            <p className="text-xs text-muted-foreground">Pending completion</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{completedThisWeek}</div>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-xl font-semibold text-foreground mb-4">My Assigned Templates</h2>
        {availableTemplates && availableTemplates.length > 0 ? (
          <div className="space-y-4">
            {availableTemplates.map((assignment) => {
              const template = assignment.checklist_templates
              const status =
                assignment.status === "completed" &&
                assignment.completed_at &&
                new Date(assignment.completed_at).toDateString() !== today
                  ? "active" // Reset to active for templates completed on previous days
                  : assignment.status || "active"

              return (
                <Card key={assignment.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{template?.name}</CardTitle>
                        <CardDescription className="mt-1">{template?.description}</CardDescription>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {template?.frequency}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Assigned: {new Date(assignment.assigned_at).toLocaleDateString()}
                          </span>
                          {assignment.completed_at && new Date(assignment.completed_at).toDateString() !== today && (
                            <span className="text-xs text-green-600">
                              Last completed: {new Date(assignment.completed_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge
                        variant={status === "completed" ? "default" : "secondary"}
                        className={
                          status === "completed"
                            ? "bg-green-100 text-green-800 hover:bg-green-100"
                            : "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                        }
                      >
                        {status === "completed" ? "Completed" : "Active"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center">
                      <div className="text-sm text-muted-foreground">
                        <p>Status: Ready to start</p>
                      </div>
                      <div className="flex gap-2">
                        <Link href={`/staff/checklist/${template.id}`}>
                          <Button size="sm">Start Checklist</Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {assignedTemplates && assignedTemplates.length > 0
                  ? "All tasks completed for today! Great job!"
                  : "No templates assigned"}
              </h3>
              <p className="text-muted-foreground">
                {assignedTemplates && assignedTemplates.length > 0
                  ? "Your assigned templates will reappear tomorrow for the next day's tasks."
                  : "Contact your administrator to get assigned compliance checklists."}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
