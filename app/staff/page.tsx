"use client"

import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Clock, Bell, AlertTriangle, ArrowLeft } from "lucide-react"
import { useState, useEffect } from "react"
import { exitImpersonation } from "@/lib/impersonation-utils"

export default function StaffDashboard() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [assignedTemplates, setAssignedTemplates] = useState<any[]>([])
  const [dailyChecklists, setDailyChecklists] = useState<any[]>([])
  const [notifications, setNotifications] = useState<any[]>([])
  const [completedReports, setCompletedReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [impersonationBanner, setImpersonationBanner] = useState<any>(null)

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      const supabase = createClient()

      const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", notificationId)

      if (error) {
        console.error("Error marking notification as read:", error)
        return
      }

      setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
    } catch (error) {
      console.error("Error updating notification:", error)
    }
  }

  useEffect(() => {
    const loadUser = async () => {
      const supabase = createClient()

      try {
        const urlParams = new URLSearchParams(window.location.search)
        const impersonateToken = urlParams.get("impersonate")

        if (impersonateToken) {
          try {
            const impersonationData = JSON.parse(atob(impersonateToken))
            console.log("[v0] Impersonation token detected:", impersonationData)

            localStorage.setItem("masterAdminImpersonation", "true")
            localStorage.setItem("impersonatedUserEmail", impersonationData.userEmail)
            localStorage.setItem("impersonatedUserId", impersonationData.userId)
            localStorage.setItem("impersonatedUserRole", impersonationData.userRole)
            localStorage.setItem("impersonatedOrganizationId", impersonationData.organizationId)
            localStorage.setItem("masterAdminEmail", impersonationData.masterAdminEmail)

            window.history.replaceState({}, document.title, window.location.pathname)

            const { data: profile, error: profileError } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", impersonationData.userId)
              .single()

            if (profileError || !profile) {
              console.error("[v0] Error loading impersonated profile:", profileError)
              localStorage.clear()
              return
            }

            setUser({ email: profile.email, id: profile.id })
            setProfile(profile)
            setLoading(false)

            const [assignedTemplatesData, dailyChecklistsData, completedReportsData, notificationsData] =
              await Promise.all([
                supabase
                  .from("template_assignments")
                  .select(`
                  *,
                  checklist_templates!inner(
                    id,
                    name,
                    description,
                    frequency,
                    schedule_type,
                    deadline_date,
                    specific_date,
                    schedule_time,
                    is_active
                  )
                `)
                  .eq("assigned_to", profile.id)
                  .eq("is_active", true)
                  .eq("checklist_templates.is_active", true)
                  .order("assigned_at", { ascending: false })
                  .limit(20)
                  .then((result) => {
                    console.log("[v0] Assigned templates for user:", profile.id)
                    console.log("[v0] Found assignments:", result.data?.length || 0)
                    if (result.data) {
                      result.data.forEach((assignment: any) => {
                        console.log(
                          `[v0] - ${assignment.checklist_templates?.name} (Template ID: ${assignment.template_id}, Active: ${assignment.is_active})`,
                        )
                      })
                    }
                    if (result.error) {
                      console.error("[v0] Error loading assignments:", result.error)
                    }
                    return result
                  }),
                supabase
                  .from("daily_checklists")
                  .select(`
                  *,
                  checklist_templates:template_id(
                    id,
                    name,
                    description
                  )
                `)
                  .eq("assigned_to", profile.id)
                  .in("status", ["pending", "overdue"])
                  .order("date", { ascending: true })
                  .limit(30),
                supabase
                  .from("template_assignments")
                  .select(`
                  *,
                  checklist_templates:template_id(
                    id,
                    name,
                    description
                  ),
                  profiles:assigned_to(
                    full_name,
                    email
                  )
                `)
                  .eq("assigned_to", profile.id)
                  .eq("status", "completed")
                  .not("completed_at", "is", null)
                  .order("completed_at", { ascending: false })
                  .limit(5),
                supabase
                  .from("notifications")
                  .select("*")
                  .eq("user_id", profile.id)
                  .eq("is_read", false)
                  .eq("type", "missed_task")
                  .order("created_at", { ascending: false })
                  .limit(10),
              ])

            setAssignedTemplates(assignedTemplatesData.data || [])
            setDailyChecklists(dailyChecklistsData.data || [])
            setCompletedReports(completedReportsData.data || [])
            setNotifications(notificationsData.data || [])
            return
          } catch (e) {
            console.error("[v0] Invalid impersonation token:", e)
          }
        }

        const {
          data: { user },
          error,
        } = await supabase.auth.getUser()

        if (error || !user) {
          console.error("Error getting user:", error)
          return
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single()

        if (profileError || !profile) {
          console.error("Error loading profile:", profileError)
          return
        }

        setUser({ email: user.email, id: user.id })
        setProfile(profile)

        const [assignedTemplatesData, dailyChecklistsData, completedReportsData, notificationsData] = await Promise.all(
          [
            supabase
              .from("template_assignments")
              .select(`
              *,
              checklist_templates!inner(
                id,
                name,
                description,
                frequency,
                schedule_type,
                deadline_date,
                specific_date,
                schedule_time,
                is_active
              )
            `)
              .eq("assigned_to", user.id)
              .eq("is_active", true)
              .eq("checklist_templates.is_active", true)
              .order("assigned_at", { ascending: false })
              .limit(20)
              .then((result) => {
                console.log("[v0] Assigned templates for user:", user.id)
                console.log("[v0] Found assignments:", result.data?.length || 0)
                if (result.data) {
                  result.data.forEach((assignment: any) => {
                    console.log(
                      `[v0] - ${assignment.checklist_templates?.name} (Template ID: ${assignment.template_id}, Active: ${assignment.is_active})`,
                    )
                  })
                }
                if (result.error) {
                  console.error("[v0] Error loading assignments:", result.error)
                }
                return result
              }),
            supabase
              .from("daily_checklists")
              .select(`
              *,
              checklist_templates:template_id(
                id,
                name,
                description
              )
            `)
              .eq("assigned_to", user.id)
              .in("status", ["pending", "overdue"])
              .order("date", { ascending: true })
              .limit(30),
            supabase
              .from("template_assignments")
              .select(`
              *,
              checklist_templates:template_id(
                id,
                name,
                description
              ),
              profiles:assigned_to(
                full_name,
                email
              )
            `)
              .eq("assigned_to", user.id)
              .eq("status", "completed")
              .not("completed_at", "is", null)
              .order("completed_at", { ascending: false })
              .limit(5),
            supabase
              .from("notifications")
              .select("*")
              .eq("user_id", user.id)
              .eq("is_read", false)
              .eq("type", "missed_task")
              .order("created_at", { ascending: false })
              .limit(10),
          ],
        )

        setAssignedTemplates(assignedTemplatesData.data || [])
        setDailyChecklists(dailyChecklistsData.data || [])
        setCompletedReports(completedReportsData.data || [])
        setNotifications(notificationsData.data || [])
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadUser()
  }, [])

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Assigned Logs</h1>
          <p className="text-muted-foreground mt-2">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  const today = new Date()
  const todayString = today.toISOString().split("T")[0]

  const overdueDailyTasks = dailyChecklists.filter((dc) => dc.status === "overdue")
  const todayDailyTasks = dailyChecklists.filter((dc) => dc.status === "pending" && dc.date === todayString)

  const upcomingReports: any[] = []
  const regularReports: any[] = []

  assignedTemplates?.forEach((assignment) => {
    const template = assignment.checklist_templates
    if (!template) return

    if (assignment.completed_at && new Date(assignment.completed_at).toDateString() === today.toDateString()) {
      return
    }

    let dueDate: Date | null = null

    if (template.deadline_date) {
      dueDate = new Date(template.deadline_date)
    } else if (template.specific_date) {
      dueDate = new Date(template.specific_date)
    } else if (template.schedule_type === "daily") {
      dueDate = new Date(today)
      dueDate.setHours(23, 59, 59, 999)
    } else if (template.schedule_type === "weekly") {
      dueDate = new Date(today)
      dueDate.setDate(today.getDate() + (7 - today.getDay()))
      dueDate.setHours(23, 59, 59, 999)
    } else if (template.schedule_type === "monthly") {
      dueDate = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      dueDate.setHours(23, 59, 59, 999)
    }

    if (
      template.schedule_type === "deadline" ||
      template.schedule_type === "specific_date" ||
      template.deadline_date ||
      template.specific_date
    ) {
      upcomingReports.push({ ...assignment, dueDate, template })
    } else if (
      template.schedule_type === "daily" ||
      template.schedule_type === "weekly" ||
      template.schedule_type === "monthly" ||
      template.frequency === "daily" ||
      template.frequency === "weekly" ||
      template.frequency === "monthly"
    ) {
      regularReports.push({ ...assignment, dueDate, template })
    } else {
      regularReports.push({ ...assignment, dueDate, template })
    }
  })

  upcomingReports.sort((a, b) => {
    if (!a.dueDate && !b.dueDate) return 0
    if (!a.dueDate) return 1
    if (!b.dueDate) return -1
    return a.dueDate.getTime() - b.dueDate.getTime()
  })

  const frequencyPriority = { daily: 1, weekly: 2, monthly: 3, custom: 4 }
  regularReports.sort((a, b) => {
    const aPriority = frequencyPriority[a.template.frequency as keyof typeof frequencyPriority] || 5
    const bPriority = frequencyPriority[b.template.frequency as keyof typeof frequencyPriority] || 5
    return aPriority - bPriority
  })

  const totalAssigned = assignedTemplates?.length || 0
  const completedTemplates = assignedTemplates?.filter((a) => a.status === "completed").length || 0
  const activeTemplates = upcomingReports.length + regularReports.length + todayDailyTasks.length

  const completedToday =
    assignedTemplates?.filter((a) => {
      if (!a.completed_at) return false
      return new Date(a.completed_at).toDateString() === today.toDateString()
    }).length || 0

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const completedThisWeek =
    assignedTemplates?.filter((a) => {
      if (!a.completed_at) return false
      return new Date(a.completed_at) >= weekAgo
    }).length || 0

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">My Assigned Logs</h1>
        <p className="text-muted-foreground mt-2">Complete your assigned compliance checklists</p>
      </div>

      {notifications?.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notifications
          </h2>

          {notifications?.map((notification) => (
            <Alert key={notification.id} onClick={() => markNotificationAsRead(notification.id)}>
              <Bell className="h-4 w-4" />
              <AlertTitle>Log Reminder</AlertTitle>
              <AlertDescription>{notification.message}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAssigned}</div>
            <p className="text-xs text-muted-foreground">Total logs</p>
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
            <CardTitle className="text-sm font-medium">Active Logs</CardTitle>
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

      {overdueDailyTasks.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-red-600 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Overdue Tasks ({overdueDailyTasks.length})
          </h2>
          <p className="text-sm text-red-600">
            These daily tasks were not completed on time and need immediate attention.
          </p>
          <div className="space-y-4">
            {overdueDailyTasks.map((task) => {
              const taskDate = new Date(task.date)
              const daysOverdue = Math.floor((today.getTime() - taskDate.getTime()) / (1000 * 60 * 60 * 24))

              return (
                <Card key={task.id} className="border-red-300 bg-red-50">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg text-red-900">{task.checklist_templates?.name}</CardTitle>
                        <CardDescription className="mt-1 text-red-700">
                          {task.checklist_templates?.description}
                        </CardDescription>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="destructive" className="text-xs">
                            Daily Task
                          </Badge>
                          <span className="text-xs font-medium text-red-700">Due: {taskDate.toLocaleDateString()}</span>
                          <span className="text-xs text-red-600 font-semibold">
                            {daysOverdue} day{daysOverdue > 1 ? "s" : ""} overdue
                          </span>
                        </div>
                      </div>
                      <Badge variant="destructive">Overdue</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center">
                      <div className="text-sm text-red-700">
                        <p>Status: Requires immediate action</p>
                      </div>
                      <Link href={`/staff/checklist/${task.id}`}>
                        <Button size="sm" variant="destructive">
                          Complete Now
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

      {todayDailyTasks.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Today's Tasks ({todayDailyTasks.length})
          </h2>
          <p className="text-sm text-muted-foreground">Daily tasks that need to be completed today</p>
          <div className="space-y-4">
            {todayDailyTasks.map((task) => (
              <Card key={task.id} className="border-blue-200 bg-blue-50">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{task.checklist_templates?.name}</CardTitle>
                      <CardDescription className="mt-1">{task.checklist_templates?.description}</CardDescription>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs bg-white">
                          Daily
                        </Badge>
                        <span className="text-xs text-blue-700 font-medium">Due: Today</span>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      Pending
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-muted-foreground">
                      <p>Status: Ready to start</p>
                    </div>
                    <Link href={`/staff/checklist/${task.id}`}>
                      <Button size="sm">Start Log</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {upcomingReports.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Upcoming Logs ({upcomingReports.length})
          </h2>
          <div className="space-y-4">
            {upcomingReports.map((report) => {
              const isOverdue = report.dueDate && today > report.dueDate
              const daysLeft = report.dueDate
                ? Math.ceil((report.dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                : null

              return (
                <Card
                  key={report.id}
                  className={`${isOverdue ? "border-red-200 bg-red-50" : "border-yellow-200 bg-yellow-50"}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{report.template.name}</CardTitle>
                        <CardDescription className="mt-1">{report.template.description}</CardDescription>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {report.template.schedule_type === "deadline" ? "Deadline" : "Custom Date"}
                          </Badge>
                          {report.dueDate && (
                            <span className={`text-xs font-medium ${isOverdue ? "text-red-700" : "text-yellow-700"}`}>
                              Due: {report.dueDate.toLocaleDateString()}
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
                      <Link href={`/staff/checklist/${report.id}`}>
                        <Button size="sm" variant={isOverdue ? "destructive" : "default"}>
                          {isOverdue ? "Start Now" : "Start Log"}
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

      {regularReports.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Regular Logs ({regularReports.length})</h2>
          <p className="text-sm text-muted-foreground">Your logs that need to be completed regularly</p>

          <div className="space-y-4">
            {regularReports.map((report) => (
              <Card key={report.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{report.template.name}</CardTitle>
                      <CardDescription className="mt-1">{report.template.description}</CardDescription>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs capitalize">
                          {report.template.frequency}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Assigned: {new Date(report.assigned_at).toLocaleDateString()}
                        </span>
                        {report.completed_at && (
                          <span className="text-xs text-green-600">
                            Last completed: {new Date(report.completed_at).toLocaleDateString()}
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
                    <Link href={`/staff/checklist/${report.id}`}>
                      <Button size="sm">Start Log</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {overdueDailyTasks.length === 0 &&
        todayDailyTasks.length === 0 &&
        upcomingReports.length === 0 &&
        regularReports.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {assignedTemplates && assignedTemplates.length > 0
                  ? "All logs completed for today! Great job!"
                  : "No logs assigned"}
              </h3>
              <p className="text-muted-foreground">
                {assignedTemplates && assignedTemplates.length > 0
                  ? "Your assigned logs will reappear tomorrow for the next day's work."
                  : "Contact your administrator to get assigned compliance checklists."}
              </p>
            </CardContent>
          </Card>
        )}

      {impersonationBanner?.show && (
        <div className="bg-orange-50 border border-orange-200 text-orange-800 px-3 py-2 rounded-md text-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs">Viewing as {impersonationBanner.userEmail}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => exitImpersonation()}
              className="h-6 px-2 text-xs text-orange-700 hover:bg-orange-100"
            >
              <ArrowLeft className="w-3 h-3 mr-1" />
              Exit
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
