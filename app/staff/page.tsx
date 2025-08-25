"use client"

import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Clock, Bell, AlertTriangle, ArrowLeft, History } from "lucide-react"
import { useState, useEffect } from "react"

export default function StaffDashboard() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [assignedTemplates, setAssignedTemplates] = useState<any[]>([])
  const [notifications, setNotifications] = useState<any[]>([])
  const [completedReports, setCompletedReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [isImpersonating, setIsImpersonating] = useState(false)
  const [impersonationData, setImpersonationData] = useState<any>(null)

  useEffect(() => {
    const loadUser = async () => {
      const supabase = createClient()

      try {
        const impersonationContext = sessionStorage.getItem("masterAdminImpersonation")

        if (impersonationContext) {
          const impersonationData = JSON.parse(impersonationContext)

          // Always honor valid impersonation context for master admin
          setIsImpersonating(true)
          setImpersonationData(impersonationData)

          const { data: targetProfile } = await supabase
            .from("profiles")
            .select("*")
            .eq("email", impersonationData.targetUserEmail)
            .single()

          if (targetProfile) {
            setUser({ email: impersonationData.targetUserEmail, id: targetProfile.id })
            setProfile(targetProfile)
            return
          }
        }

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError || !user) {
          console.error("Error getting user:", userError)
          return
        }

        setUser(user)

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single()

        if (profileError) {
          console.error("Error getting profile:", profileError)
          return
        }

        setProfile(profile)
      } catch (error) {
        console.error("Error loading user data:", error)
      }
    }

    loadUser()
  }, [])

  useEffect(() => {
    const loadData = async () => {
      if (!user || !profile) return

      try {
        const supabase = createClient()

        const { data: assignedTemplatesData } = await supabase
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
          .or(
            `status.neq.completed,and(status.eq.completed,checklist_templates.schedule_type.in.(daily,weekly,monthly,recurring))`,
          )
          .order("assigned_at", { ascending: false })

        const { data: completedReportsData } = await supabase
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
          .limit(10)

        const { data: notificationsData } = await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", user.id)
          .eq("is_read", false)
          .eq("type", "missed_task")
          .order("created_at", { ascending: false })

        setAssignedTemplates(assignedTemplatesData || [])
        setCompletedReports(completedReportsData || [])
        setNotifications(notificationsData || [])

        console.log(
          "[v0] All assigned templates:",
          assignedTemplatesData?.map((a) => ({
            name: a.checklist_templates?.name,
            status: a.status,
            completed_at: a.completed_at,
            assigned_at: a.assigned_at,
          })),
        )

        console.log("[v0] Completed reports:", completedReportsData?.length || 0)
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [user, profile])

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Assigned Reports</h1>
          <p className="text-muted-foreground mt-2">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  const today = new Date()
  const todayString = today.toDateString()
  console.log("[v0] Today's date string:", todayString)

  const upcomingReports: any[] = []
  const regularReports: any[] = []

  assignedTemplates?.forEach((assignment) => {
    const template = assignment.checklist_templates
    if (!template) return

    if (assignment.completed_at && new Date(assignment.completed_at).toDateString() === todayString) {
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
  const activeTemplates = upcomingReports.length + regularReports.length

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
    upcomingReports: upcomingReports.length,
    regularReports: regularReports.length,
  })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">My Assigned Reports</h1>
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
              <AlertTitle>Report Reminder</AlertTitle>
              <AlertDescription>{notification.message}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAssigned}</div>
            <p className="text-xs text-muted-foreground">Total reports</p>
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
            <CardTitle className="text-sm font-medium">Active Reports</CardTitle>
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

      {upcomingReports.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Upcoming Reports ({upcomingReports.length})
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
                      <Link href={`/staff/checklist/${report.template.id}`}>
                        <Button size="sm" variant={isOverdue ? "destructive" : "default"}>
                          {isOverdue ? "Start Now" : "Start Report"}
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
          <h2 className="text-xl font-semibold text-foreground">Regular Reports ({regularReports.length})</h2>
          <div className="space-y-4">
            {regularReports.map((report) => {
              return (
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
                      <Link href={`/staff/checklist/${report.template.id}`}>
                        <Button size="sm">Start Report</Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {upcomingReports.length === 0 && regularReports.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {assignedTemplates && assignedTemplates.length > 0
                ? "All reports completed for today! Great job!"
                : "No reports assigned"}
            </h3>
            <p className="text-muted-foreground">
              {assignedTemplates && assignedTemplates.length > 0
                ? "Your assigned reports will reappear tomorrow for the next day's work."
                : "Contact your administrator to get assigned compliance checklists."}
            </p>
          </CardContent>
        </Card>
      )}

      {completedReports.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <History className="w-5 h-5" />
            Report History ({completedReports.length})
          </h2>
          <p className="text-sm text-muted-foreground">Your completed reports</p>

          <div className="space-y-4">
            {completedReports.map((report) => (
              <Card key={report.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-foreground mb-1">
                        {report.checklist_templates?.name || "Unknown Report"}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                        <span>
                          {new Date(report.completed_at).toLocaleDateString()} at{" "}
                          {new Date(report.completed_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          Completed
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {report.checklist_templates?.description || "Your submission history"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {isImpersonating && impersonationData && (
        <div className="bg-orange-50 border border-orange-200 text-orange-800 px-3 py-2 rounded-md text-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs">Viewing as {impersonationData.targetUserEmail}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                sessionStorage.removeItem("masterAdminImpersonation")
                document.cookie = "masterAdminImpersonation=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
                window.location.href = "/masterdashboard"
              }}
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
