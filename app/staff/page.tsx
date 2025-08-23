import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Clock, Bell } from "lucide-react"

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
        frequency,
        schedule_type,
        deadline_date,
        specific_date,
        schedule_time
      )
    `)
    .eq("assigned_to", user.id)
    .eq("is_active", true)
    .order("assigned_at", { ascending: false })

  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_read", false)
    .eq("type", "missed_task")
    .order("created_at", { ascending: false })

  console.log(
    "[v0] All assigned templates:",
    assignedTemplates?.map((a) => ({
      name: a.checklist_templates?.name,
      status: a.status,
      completed_at: a.completed_at,
      assigned_at: a.assigned_at,
    })),
  )

  const today = new Date()
  const todayString = today.toDateString()
  console.log("[v0] Today's date string:", todayString)

  const upcomingTasks: any[] = []
  const regularTasks: any[] = []

  assignedTemplates?.forEach((assignment) => {
    const template = assignment.checklist_templates
    if (!template) return

    // Skip if completed today
    if (assignment.completed_at && new Date(assignment.completed_at).toDateString() === todayString) {
      return
    }

    // Calculate due date based on template scheduling
    let dueDate: Date | null = null

    if (template.deadline_date) {
      dueDate = new Date(template.deadline_date)
    } else if (template.specific_date) {
      dueDate = new Date(template.specific_date)
    } else if (template.schedule_type === "daily") {
      // For daily tasks, due date is today
      dueDate = new Date(today)
      dueDate.setHours(23, 59, 59, 999) // End of day
    } else if (template.schedule_type === "weekly") {
      // For weekly tasks, due date is end of week
      dueDate = new Date(today)
      dueDate.setDate(today.getDate() + (7 - today.getDay()))
      dueDate.setHours(23, 59, 59, 999)
    } else if (template.schedule_type === "monthly") {
      // For monthly tasks, due date is end of month
      dueDate = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      dueDate.setHours(23, 59, 59, 999)
    }

    // Categorize tasks based on schedule type
    if (
      template.schedule_type === "deadline" ||
      template.schedule_type === "specific_date" ||
      template.deadline_date ||
      template.specific_date
    ) {
      // Custom dated or deadline jobs go to upcoming tasks
      upcomingTasks.push({ ...assignment, dueDate, template })
    } else {
      // Recurring jobs go to regular tasks
      regularTasks.push({ ...assignment, dueDate, template })
    }
  })

  // Sort upcoming tasks by due date
  upcomingTasks.sort((a, b) => {
    if (!a.dueDate && !b.dueDate) return 0
    if (!a.dueDate) return 1
    if (!b.dueDate) return -1
    return a.dueDate.getTime() - b.dueDate.getTime()
  })

  // Sort regular tasks by frequency priority (daily, weekly, monthly)
  const frequencyPriority = { daily: 1, weekly: 2, monthly: 3, custom: 4 }
  regularTasks.sort((a, b) => {
    const aPriority = frequencyPriority[a.template.frequency as keyof typeof frequencyPriority] || 5
    const bPriority = frequencyPriority[b.template.frequency as keyof typeof frequencyPriority] || 5
    return aPriority - bPriority
  })

  const totalAssigned = assignedTemplates?.length || 0
  const completedTemplates = assignedTemplates?.filter((a) => a.status === "completed").length || 0
  const activeTemplates = upcomingTasks.length + regularTasks.length

  const completedToday =
    assignedTemplates?.filter((a) => {
      if (!a.completed_at) return false
      return new Date(a.completed_at).toDateString() === todayString
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
    upcomingTasks: upcomingTasks.length,
    regularTasks: regularTasks.length,
  })

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">My Assigned Tasks</h1>
        <p className="text-muted-foreground mt-2">Complete your assigned compliance checklists</p>
      </div>

      {notifications?.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notifications
          </h2>

          {notifications?.map((notification) => (
            <Alert key={notification.id}>
              <Bell className="h-4 w-4" />
              <AlertTitle>Task Reminder</AlertTitle>
              <AlertDescription>{notification.message}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAssigned}</div>
            <p className="text-xs text-muted-foreground">Total assignments</p>
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

      {upcomingTasks.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Upcoming Tasks ({upcomingTasks.length})
          </h2>
          <div className="space-y-4">
            {upcomingTasks.map((task) => {
              const isOverdue = task.dueDate && today > task.dueDate
              const daysLeft = task.dueDate
                ? Math.ceil((task.dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                : null

              return (
                <Card
                  key={task.id}
                  className={`${isOverdue ? "border-red-200 bg-red-50" : "border-yellow-200 bg-yellow-50"}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{task.template.name}</CardTitle>
                        <CardDescription className="mt-1">{task.template.description}</CardDescription>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {task.template.schedule_type === "deadline" ? "Deadline" : "Custom Date"}
                          </Badge>
                          {task.dueDate && (
                            <span className={`text-xs font-medium ${isOverdue ? "text-red-700" : "text-yellow-700"}`}>
                              Due: {task.dueDate.toLocaleDateString()}
                            </span>
                          )}
                          {daysLeft !== null && (
                            <span className={`text-xs ${isOverdue ? "text-red-600" : "text-muted-foreground"}`}>
                              {isOverdue ? `${Math.abs(daysLeft)} days overdue` : `${daysLeft} days left`}
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge variant={isOverdue ? "destructive" : "secondary"}>
                        {isOverdue ? "Overdue" : "Pending"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center">
                      <div className="text-sm text-muted-foreground">
                        <p>Status: Ready to start</p>
                      </div>
                      <Link href={`/staff/checklist/${task.template.id}`}>
                        <Button size="sm" variant={isOverdue ? "destructive" : "default"}>
                          {isOverdue ? "Start Now" : "Start Task"}
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {regularTasks.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Regular Tasks ({regularTasks.length})</h2>
          <div className="space-y-4">
            {regularTasks.map((task) => {
              return (
                <Card key={task.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{task.template.name}</CardTitle>
                        <CardDescription className="mt-1">{task.template.description}</CardDescription>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs capitalize">
                            {task.template.frequency}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Assigned: {new Date(task.assigned_at).toLocaleDateString()}
                          </span>
                          {task.completed_at && (
                            <span className="text-xs text-green-600">
                              Last completed: {new Date(task.completed_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                        Active
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center">
                      <div className="text-sm text-muted-foreground">
                        <p>Status: Ready to start</p>
                      </div>
                      <Link href={`/staff/checklist/${task.template.id}`}>
                        <Button size="sm">Start Checklist</Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {upcomingTasks.length === 0 && regularTasks.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {assignedTemplates && assignedTemplates.length > 0
                ? "All tasks completed for today! Great job!"
                : "No tasks assigned"}
            </h3>
            <p className="text-muted-foreground">
              {assignedTemplates && assignedTemplates.length > 0
                ? "Your assigned tasks will reappear tomorrow for the next day's work."
                : "Contact your administrator to get assigned compliance checklists."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
