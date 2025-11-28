"use client"

import type React from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useState, useEffect, useMemo } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ChevronDown,
  Users,
  UserCheck,
  Plus,
  UserPlus,
  AlertTriangle,
  ClipboardList,
  CheckCircle2,
  CheckCheck,
  Clock,
  Activity,
  AlertCircle,
  RotateCw,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import Link from "next/link"
import { FeedbackBanner } from "@/components/feedback-banner"
import { useRouter } from "next/navigation"
import { formatUKDate, formatUKDateTime, formatRelativeTime } from "@/lib/date-formatter"

export const dynamic = "force-dynamic"

export default function AdminDashboard() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [templates, setTemplates] = useState<any[]>([])
  const [activeTemplates, setActiveTemplates] = useState<any[]>([])
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [todayChecklists, setTodayChecklists] = useState<any[]>([])
  const [notifications, setNotifications] = useState<any[]>([])
  const [missedTasks, setMissedTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [assigningTemplate, setAssigningTemplate] = useState<string | null>(null)
  const [selectedMembers, setSelectedMembers] = useState<{ [key: string]: string[] }>({})

  const [showTeamModal, setShowTeamModal] = useState(false)
  const [isCreatingTeamMember, setIsCreatingTeamMember] = useState(false)
  const [admins, setAdmins] = useState<any[]>([])

  const [teamForm, setTeamForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    position: "",
    role: "staff" as "admin" | "staff",
    reportsTo: "none",
  })

  const [allNotifications, setAllNotifications] = useState<any[]>([])
  const [activityLog, setActivityLog] = useState<any[]>([])
  const [activityLoading, setActivityLoading] = useState(true)
  const [activityFilter, setActivityFilter] = useState<"all" | "overdue" | "due-soon" | "critical">("all")
  const [overdueCount, setOverdueCount] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const router = useRouter()
  const organizationId = profile?.organization_id

  const checkMissedTasks = async () => {
    if (!organizationId) return

    const supabase = createClient()
    const today = new Date()

    const { data: assignments } = await supabase
      .from("template_assignments")
      .select(`
        *,
        checklist_templates:template_id(
          id,
          name,
          description,
          deadline_date,
          specific_date,
          schedule_type
        ),
        assigned_to_profile:profiles!template_assignments_assigned_to_fkey(
          id,
          first_name,
          last_name,
          full_name
        )
      `)
      .eq("organization_id", organizationId)
      .neq("status", "completed")
      .eq("is_active", true)

    const missedTasksList: any[] = []

    assignments?.forEach((assignment) => {
      const template = assignment.checklist_templates
      if (!template) return

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

      if (dueDate && today > dueDate) {
        missedTasksList.push({
          ...assignment,
          dueDate,
          template,
          staffMember: assignment.assigned_to_profile,
        })
      }
    })

    setMissedTasks(missedTasksList)

    for (const missedTask of missedTasksList) {
      const existingNotification = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", missedTask.assigned_to)
        .eq("template_id", missedTask.template_id)
        .eq("type", "missed_task")
        .single()

      if (!existingNotification.data) {
        await supabase.from("notifications").insert({
          user_id: missedTask.assigned_to,
          template_id: missedTask.template_id,
          type: "missed_task",
          message: `You have missed the deadline for "${missedTask.template.name}". Please complete it as soon as possible.`,
          is_read: false,
        })
      }
    }
  }

  const handleAssign = async (templateId: string, memberIds: string[]) => {
    if (memberIds.length === 0) return

    setAssigningTemplate(templateId)
    const supabase = createClient()

    try {
      const response = await fetch("/api/admin/assign-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId,
          memberIds,
          organizationId,
        }),
      })

      if (!response.ok) throw new Error("Failed to assign template")

      setSelectedMembers((prev) => ({ ...prev, [templateId]: [] }))
      alert("Template assigned successfully!")
    } catch (error) {
      console.error("Error assigning template:", error)
      alert("Failed to assign template")
    } finally {
      setAssigningTemplate(null)
    }
  }

  const handleAssignReport = async (templateId: string, memberIds: string[]) => {
    if (memberIds.length === 0) return

    setAssigningTemplate(templateId)
    const supabase = createClient()

    try {
      const response = await fetch("/api/admin/assign-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId,
          memberIds,
          organizationId,
        }),
      })

      if (!response.ok) throw new Error("Failed to assign template")

      setSelectedMembers((prev) => ({ ...prev, [templateId]: [] }))
      alert("Report template assigned successfully!")
    } catch (error) {
      console.error("Error assigning template:", error)
      alert("Failed to assign report template")
    } finally {
      setAssigningTemplate(null)
    }
  }

  const toggleMember = (templateId: string, memberId: string) => {
    setSelectedMembers((prev) => {
      const current = prev[templateId] || []
      const updated = current.includes(memberId) ? current.filter((id) => id !== memberId) : [...current, memberId]
      return { ...prev, [templateId]: updated }
    })
  }

  const selectAllMembers = (templateId: string) => {
    setSelectedMembers((prev) => ({
      ...prev,
      [templateId]: teamMembers.map((member) => member.id),
    }))
  }

  const clearSelection = (templateId: string) => {
    setSelectedMembers((prev) => ({ ...prev, [templateId]: [] }))
  }

  const commonRoles = [
    "Manager",
    "Supervisor",
    "Staff",
    "Kitchen Staff",
    "Front Desk",
    "Maintenance",
    "Security",
    "Cleaning",
    "Admin",
    "Technician",
  ]

  const handleCreateTeamMember = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreatingTeamMember(true)

    try {
      const response = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: teamForm.email,
          password: teamForm.password,
          firstName: teamForm.firstName,
          lastName: teamForm.lastName,
          position: teamForm.position,
          role: teamForm.role,
          organizationId,
          reportsTo: teamForm.reportsTo === "none" ? null : teamForm.reportsTo,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to create user")
      }

      setTeamForm({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        position: "",
        role: "staff",
        reportsTo: "none",
      })
      setShowTeamModal(false)

      const supabase = createClient()
      const { data: updatedTeamMembers } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, full_name, role")
        .eq("organization_id", organizationId)
        .neq("id", user.id)
        .order("first_name")
      setTeamMembers(updatedTeamMembers || [])

      alert("Team member created successfully!")
    } catch (error) {
      console.error("Error creating team member:", error)
      alert(error instanceof Error ? error.message : "Failed to create team member")
    } finally {
      setIsCreatingTeamMember(false)
    }
  }

  const reportStats = useMemo(() => {
    const total = templates.length
    const completed = templates.filter((template) => template.is_active).length
    const pending = total - completed
    return { total, completed, pending }
  }, [templates])

  const pendingAssignments = useMemo(() => {
    return todayChecklists?.filter((assignment) => assignment.status !== "completed") || []
  }, [todayChecklists])

  const completionStats = useMemo(() => {
    const completedToday =
      todayChecklists?.filter((c) => {
        if (c.status !== "completed" || !c.completed_at) return false
        const completedDate = new Date(c.completed_at).toDateString()
        const today = new Date().toDateString()
        return completedDate === today
      }).length || 0

    const totalCompleted = todayChecklists?.filter((c) => c.status === "completed").length || 0
    const inProgressToday = todayChecklists?.filter((c) => c.status === "active" || !c.status).length || 0

    return { completedToday, totalCompleted, inProgressToday }
  }, [todayChecklists])

  useEffect(() => {
    const loadUser = async () => {
      try {
        const supabase = createClient()

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
              router.push("/auth/login")
              return
            }

            if (profile.role !== "admin" && profile.role !== "master_admin") {
              router.push("/unauthorized")
              return
            }

            setUser({ id: profile.id, email: profile.email })
            setProfile(profile)
            setLoading(false)
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
          router.push("/auth/login")
          return
        }

        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single()

        if (profileError || !profileData) {
          router.push("/auth/login")
          return
        }

        if (profileData.role !== "admin" && profileData.role !== "master_admin") {
          router.push("/unauthorized")
          return
        }

        setUser(user)
        setProfile(profileData)
        setLoading(false)
      } catch (error) {
        console.error("Error loading user data:", error)
        router.push("/auth/login")
      }
    }

    loadUser()
  }, [router])

  const fetchActivityLog = async () => {
    if (!organizationId) return

    try {
      setActivityLoading(true)
      const supabase = createClient()
      const now = new Date()
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

      // Fetch template assignments with due date tracking
      const { data: assignments, error: assignmentsError } = await supabase
        .from("template_assignments")
        .select(`
          *,
          template:checklist_templates(name),
          assigned_to_profile:profiles!template_assignments_assigned_to_fkey(first_name, last_name, full_name),
          assigned_by_profile:profiles!template_assignments_assigned_by_fkey(first_name, last_name, full_name)
        `)
        .eq("organization_id", organizationId)
        .gte("created_at", twentyFourHoursAgo.toISOString()) // Filter last 24 hours
        .order("created_at", { ascending: false })
        .limit(100)

      console.log("[v0] Template assignments fetched:", assignments)

      // Fetch submitted reports
      const { data: submissions, error: submissionsError } = await supabase
        .from("submitted_reports")
        .select(`
          *,
          submitter:profiles!submitted_reports_submitted_by_fkey(first_name, last_name, full_name)
        `)
        .eq("organization_id", organizationId)
        .gte("submitted_at", twentyFourHoursAgo.toISOString()) // Filter last 24 hours
        .order("submitted_at", { ascending: false })
        .limit(50)

      console.log("[v0] Submitted reports fetched:", submissions)

      // Fetch daily checklists with due date tracking
      const { data: checklists, error: checklistsError } = await supabase
        .from("daily_checklists")
        .select(`
          *,
          template:checklist_templates(name),
          assigned_user:profiles!daily_checklists_assigned_to_fkey(first_name, last_name, full_name)
        `)
        .eq("organization_id", organizationId)
        .gte("updated_at", twentyFourHoursAgo.toISOString()) // Filter last 24 hours
        .order("updated_at", { ascending: false })
        .limit(100)

      console.log("[v0] Daily checklists fetched:", checklists)

      if (assignmentsError) throw assignmentsError
      if (submissionsError) throw submissionsError
      if (checklistsError) throw checklistsError

      const activities: any[] = []
      let overdueCounter = 0

      // Add assignment activities with overdue detection
      assignments?.forEach((assignment: any) => {
        const dueDate = assignment.scheduled_date ? new Date(assignment.scheduled_date) : null
        const isOverdue = dueDate && dueDate < now && assignment.status !== "completed"
        const isDueSoon =
          dueDate &&
          !isOverdue &&
          dueDate.getTime() - now.getTime() < 3 * 24 * 60 * 60 * 1000 &&
          assignment.status !== "completed"

        if (isOverdue) overdueCounter++

        if (assignment.status === "completed") {
          activities.push({
            id: `completed-assignment-${assignment.id}`,
            type: "completion",
            action: "Task Completed",
            description: `${assignment.assigned_to_profile?.full_name || assignment.assigned_to_profile?.first_name + " " + assignment.assigned_to_profile?.last_name || "Team Member"} completed "${assignment.template?.name || "Task"}"`,
            timestamp: assignment.completed_at || assignment.updated_at,
            dueDate: dueDate,
            status: "completed",
            icon: "check",
            isOverdue: false,
            isDueSoon: false,
            priority: 5,
          })
        } else {
          // Add assignment activity for non-completed tasks
          activities.push({
            id: `assignment-${assignment.id}`,
            type: "assignment",
            action: isOverdue ? "OVERDUE Task" : isDueSoon ? "Due Soon" : "Task Assigned",
            description: `${assignment.assigned_by_profile?.full_name || assignment.assigned_by_profile?.first_name + " " + assignment.assigned_by_profile?.last_name || "Admin"} assigned "${assignment.template?.name || "Task"}" to ${assignment.assigned_to_profile?.full_name || assignment.assigned_to_profile?.first_name + " " + assignment.assigned_to_profile?.last_name || "Team Member"}`,
            timestamp: assignment.assigned_at || assignment.created_at,
            dueDate: dueDate,
            status: assignment.status,
            icon: isOverdue ? "alert" : "assignment",
            isOverdue,
            isDueSoon,
            priority: isOverdue ? 1 : isDueSoon ? 2 : 3,
          })
        }
      })

      // Add submission activities
      submissions?.forEach((submission: any) => {
        activities.push({
          id: `submission-${submission.id}`,
          type: "submission",
          action: "Report Submitted",
          description: `${submission.submitter?.full_name || submission.submitter?.first_name + " " + submission.submitter?.last_name || "Team Member"} submitted "${submission.template_name || "Report"}"`,
          timestamp: submission.submitted_at || submission.created_at,
          status: submission.status,
          icon: "submission",
          isOverdue: false,
          isDueSoon: false,
          priority: 4,
        })
      })

      // Add checklist activities with overdue detection
      checklists?.forEach((checklist: any) => {
        const dueDate = checklist.date ? new Date(checklist.date) : null
        const isOverdue = dueDate && dueDate < now && checklist.status !== "completed"
        const isDueSoon =
          dueDate &&
          !isOverdue &&
          dueDate.getTime() - now.getTime() < 3 * 24 * 60 * 60 * 1000 &&
          checklist.status !== "completed"

        if (isOverdue) overdueCounter++

        if (checklist.status === "completed") {
          activities.push({
            id: `completed-${checklist.id}`,
            type: "completion",
            action: "Task Completed",
            description: `${checklist.assigned_user?.full_name || checklist.assigned_user?.first_name + " " + checklist.assigned_user?.last_name || "Team Member"} completed "${checklist.template?.name || "Task"}"`,
            timestamp: checklist.completed_at || checklist.updated_at,
            dueDate: dueDate,
            status: "completed",
            icon: "check",
            isOverdue: false,
            isDueSoon: false,
            priority: 5,
          })
        } else if (checklist.status === "pending" || checklist.status === "in_progress") {
          activities.push({
            id: `pending-${checklist.id}`,
            type: "pending",
            action: isOverdue
              ? "OVERDUE Task"
              : isDueSoon
                ? "Due Soon"
                : checklist.status === "in_progress"
                  ? "Task In Progress"
                  : "Task Pending",
            description: `"${checklist.template?.name || "Task"}" is ${checklist.status === "in_progress" ? "in progress" : "pending"} for ${checklist.assigned_user?.full_name || checklist.assigned_user?.first_name + " " + checklist.assigned_user?.last_name || "Team Member"}`,
            timestamp: checklist.updated_at,
            dueDate: dueDate,
            status: checklist.status,
            icon: isOverdue ? "alert" : "clock",
            isOverdue,
            isDueSoon,
            priority: isOverdue ? 1 : isDueSoon ? 2 : 3,
          })
        }
      })

      // Sort by priority first (overdue, due soon, then recent), then by timestamp
      activities.sort((a, b) => {
        if (a.priority !== b.priority) {
          return a.priority - b.priority
        }
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      })

      setOverdueCount(overdueCounter)
      setActivityLog(activities)
    } catch (error) {
      console.error("Error fetching activity log:", error)
    } finally {
      setActivityLoading(false)
    }
  }

  const refreshActivityLog = async () => {
    setIsRefreshing(true)
    await fetchActivityLog()
    setIsRefreshing(false)
  }

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user || !organizationId) return

      try {
        const supabase = createClient()

        const [templatesRes, activeTemplatesRes, teamMembersRes, assignmentsRes, adminsRes] = await Promise.all([
          supabase
            .from("checklist_templates")
            .select("id, name, description, is_active, created_at")
            .eq("organization_id", organizationId)
            .limit(5),
          supabase
            .from("checklist_templates")
            .select("id, name, description")
            .eq("organization_id", organizationId)
            .eq("is_active", true)
            .order("name")
            .limit(5),
          supabase
            .from("profiles")
            .select("id, first_name, last_name, full_name, role")
            .eq("organization_id", organizationId)
            .neq("id", user.id)
            .order("first_name")
            .limit(10),
          supabase
            .from("template_assignments")
            .select(`
              *,
              checklist_templates:template_id(
                id,
                name,
                description,
                deadline_date,
                specific_date,
                schedule_type,
                frequency
              ),
              assigned_to_profile:profiles!template_assignments_assigned_to_fkey(
                id,
                first_name,
                last_name,
                full_name,
                email
              )
            `)
            .eq("organization_id", organizationId)
            .neq("status", "completed")
            .eq("is_active", true)
            .order("assigned_at", { ascending: false }),
          supabase
            .from("profiles")
            .select("id, first_name, last_name, full_name, email")
            .eq("organization_id", organizationId)
            .eq("role", "admin"),
        ])

        setTemplates(templatesRes.data || [])
        setActiveTemplates(activeTemplatesRes.data || [])
        setTeamMembers(teamMembersRes.data || [])
        setTodayChecklists(assignmentsRes.data || [])
        setAdmins(adminsRes.data || [])

        await checkMissedTasks()
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
      }
    }

    if (user && organizationId) {
      fetchDashboardData()
      fetchActivityLog()
    }
  }, [user, organizationId])

  if (loading || !user) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-2">Welcome back!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <FeedbackBanner />

      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-2">
          Manage your organization's compliance checklists and team members
        </p>
      </div>

      {missedTasks.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Staff Missed Tasks ({missedTasks.length})</AlertTitle>
          <AlertDescription>
            {missedTasks.length} task{missedTasks.length > 1 ? "s have" : " has"} been missed by staff members. Please
            follow up with the team.
            <div className="mt-3 space-y-2">
              {missedTasks.slice(0, 5).map((task) => (
                <div key={task.id} className="text-sm bg-red-50 p-2 rounded border border-red-200">
                  <div className="font-medium">
                    {task.staffMember?.full_name ||
                      `${task.staffMember?.first_name} ${task.staffMember?.last_name}` ||
                      "Staff Member"}
                  </div>
                  <div className="text-red-700">
                    Missed: {task.template.name} (Due: {formatUKDate(task.dueDate)})
                  </div>
                </div>
              ))}
              {missedTasks.length > 5 && (
                <div className="text-sm text-red-700">And {missedTasks.length - 5} more missed tasks...</div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Report Overview</CardTitle>
            <CardDescription className="text-sm sm:text-base">Report templates awaiting completion</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 p-2 sm:p-3 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-blue-600">{reportStats.total}</div>
                <div className="text-xs text-muted-foreground">Total Reports</div>
              </div>
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-green-600">{reportStats.completed}</div>
                <div className="text-xs text-muted-foreground">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-orange-600">{reportStats.pending}</div>
                <div className="text-xs text-muted-foreground">Pending</div>
              </div>
            </div>

            <div className="space-y-3 max-h-64 sm:max-h-48 overflow-y-auto text-left">
              {pendingAssignments.length === 0 ? (
                <div className="text-sm sm:text-base text-muted-foreground text-left py-4">No pending reports</div>
              ) : (
                pendingAssignments.slice(0, 5).map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 border rounded-lg gap-2"
                  >
                    <div className="flex-1 text-left">
                      <h5 className="text-sm sm:text-base font-medium text-foreground">
                        {assignment.checklist_templates?.name || "Template"}
                      </h5>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Assigned to: {assignment.assigned_to_profile?.full_name || "Team Member"}
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {assignment.checklist_templates?.specific_date
                          ? `Due: ${formatUKDate(new Date(assignment.checklist_templates.specific_date))}`
                          : assignment.checklist_templates?.deadline_date
                            ? `Deadline: ${formatUKDate(new Date(assignment.checklist_templates.deadline_date))}`
                            : `Frequency: ${assignment.checklist_templates?.frequency || "Not scheduled"}`}
                      </p>
                      <p className="text-xs text-blue-600">
                        Assigned: {formatUKDateTime(new Date(assignment.assigned_at))}
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                        Pending
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Report Templates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeTemplates?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Report templates</p>
            <p className="text-xs text-blue-600 font-medium mt-1">
              Remaining quota: {Math.max(0, 3 - (activeTemplates?.length || 0))}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm sm:text-base">Team Members</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Team overview</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamMembers?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Total members</p>
            <p className="text-xs text-blue-600 font-medium mt-1">
              Members logged in: {Math.floor((teamMembers?.length || 0) * 0.7)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Quick Actions</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 sm:space-y-3">
            <Link href="/admin/templates/new">
              <Button variant="outline" className="w-full justify-start bg-transparent h-12 text-sm sm:text-base">
                <Plus className="h-4 w-4 mr-2" />+ New Report Template
              </Button>
            </Link>

            <Dialog open={showTeamModal} onOpenChange={setShowTeamModal}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full justify-start bg-transparent h-12 text-sm sm:text-base">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Team Member
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Team Member</DialogTitle>
                  <DialogDescription>Create a new team member account with login credentials</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateTeamMember} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        value={teamForm.firstName}
                        onChange={(e) => setTeamForm({ ...teamForm, firstName: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        value={teamForm.lastName}
                        onChange={(e) => setTeamForm({ ...teamForm, lastName: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="position">Position</Label>
                    <Input
                      id="position"
                      placeholder="e.g. Operations Manager"
                      value={teamForm.position}
                      onChange={(e) => setTeamForm({ ...teamForm, position: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="user@company.com"
                      value={teamForm.email}
                      onChange={(e) => setTeamForm({ ...teamForm, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Minimum 6 characters"
                      value={teamForm.password}
                      onChange={(e) => setTeamForm({ ...teamForm, password: e.target.value })}
                      minLength={6}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select
                      value={teamForm.role}
                      onValueChange={(value: "admin" | "staff") => setTeamForm({ ...teamForm, role: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="staff">Staff</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reportsTo">Reports To</Label>
                    <Select
                      value={teamForm.reportsTo}
                      onValueChange={(value) => setTeamForm({ ...teamForm, reportsTo: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select supervisor (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No supervisor</SelectItem>
                        {admins.map((admin) => (
                          <SelectItem key={admin.id} value={admin.id}>
                            {admin.full_name || `${admin.first_name} ${admin.last_name}` || admin.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button type="submit" disabled={isCreatingTeamMember} className="flex-1">
                      {isCreatingTeamMember ? "Creating..." : "Create Member"}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setShowTeamModal(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            {activeTemplates.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active templates available</p>
            ) : (
              activeTemplates.map((template) => (
                <div key={template.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <h5 className="text-sm font-medium text-foreground">{template.name}</h5>
                    {template.description && (
                      <p className="text-xs text-muted-foreground mt-1">{template.description}</p>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" disabled={assigningTemplate === template.id}>
                        {assigningTemplate === template.id ? "Assigning..." : "Assign"}
                        <ChevronDown className="ml-2 h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem onClick={() => selectAllMembers(template.id)}>
                        <Users className="mr-2 h-4 w-4" />
                        Select All ({teamMembers.length})
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => clearSelection(template.id)}>Clear Selection</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {teamMembers.map((member) => (
                        <DropdownMenuItem key={member.id} onClick={() => toggleMember(template.id, member.id)}>
                          <div className="flex items-center w-full">
                            <input
                              type="checkbox"
                              checked={(selectedMembers[template.id] || []).includes(member.id)}
                              onChange={() => {}}
                              className="mr-2"
                            />
                            <span className="flex-1">
                              {member.full_name || `${member.first_name} ${member.last_name}`}
                            </span>
                            <span className="text-xs text-muted-foreground ml-2">{member.role}</span>
                          </div>
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleAssign(template.id, selectedMembers[template.id] || [])}
                        disabled={(selectedMembers[template.id] || []).length === 0}
                      >
                        <UserCheck className="mr-2 h-4 w-4" />
                        Assign to {(selectedMembers[template.id] || []).length} member(s)
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Activity Log
                {overdueCount > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {overdueCount} Overdue
                  </Badge>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={refreshActivityLog}
                disabled={isRefreshing}
                className="bg-transparent"
              >
                <RotateCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              </Button>
            </CardTitle>
            <CardDescription>Real-time monitoring of all team activities and deadlines</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              {activityLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : activityLog.length === 0 ? (
                <div className="text-sm text-muted-foreground py-8 text-center">No activity in the last 24 hours</div>
              ) : (
                activityLog.map((activity, index) => (
                  <div
                    key={activity.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                      activity.isOverdue
                        ? "bg-red-50 border-red-200 hover:bg-red-100"
                        : activity.isDueSoon
                          ? "bg-amber-50 border-amber-200 hover:bg-amber-100"
                          : "bg-card hover:bg-accent/50"
                    }`}
                  >
                    <div
                      className={`mt-0.5 rounded-full p-1.5 ${
                        activity.isOverdue
                          ? "bg-red-500 text-white animate-pulse"
                          : activity.isDueSoon
                            ? "bg-amber-500 text-white"
                            : activity.type === "assignment"
                              ? "bg-blue-100 text-blue-600"
                              : activity.type === "submission"
                                ? "bg-green-100 text-green-600"
                                : activity.type === "completion"
                                  ? "bg-purple-100 text-purple-600"
                                  : "bg-orange-100 text-orange-600"
                      }`}
                    >
                      {activity.icon === "alert" && <AlertCircle className="h-4 w-4" />}
                      {activity.icon === "assignment" && <ClipboardList className="h-4 w-4" />}
                      {activity.icon === "submission" && <CheckCircle2 className="h-4 w-4" />}
                      {activity.icon === "check" && <CheckCheck className="h-4 w-4" />}
                      {activity.icon === "clock" && <Clock className="h-4 w-4" />}
                      {activity.icon === "activity" && <Activity className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-xs font-semibold ${
                            activity.isOverdue
                              ? "text-red-700"
                              : activity.isDueSoon
                                ? "text-amber-700"
                                : "text-foreground"
                          }`}
                        >
                          {activity.action}
                        </span>
                        {activity.status && (
                          <Badge
                            variant="secondary"
                            className={`text-xs ${
                              activity.status === "completed"
                                ? "bg-green-100 text-green-700"
                                : activity.status === "pending"
                                  ? "bg-orange-100 text-orange-700"
                                  : activity.status === "in_progress"
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {activity.status.replace("_", " ")}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{activity.description}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <p className="text-xs text-muted-foreground">
                          {formatRelativeTime(new Date(activity.timestamp))}
                        </p>
                        {activity.dueDate && (
                          <>
                            <span className="text-xs text-muted-foreground">•</span>
                            <p
                              className={`text-xs font-medium ${
                                activity.isOverdue
                                  ? "text-red-600"
                                  : activity.isDueSoon
                                    ? "text-amber-600"
                                    : "text-muted-foreground"
                              }`}
                            >
                              Due: {formatUKDate(activity.dueDate)}
                              {activity.isOverdue && (
                                <span className="ml-1 font-semibold">
                                  (
                                  {Math.floor(
                                    (new Date().getTime() - activity.dueDate.getTime()) / (1000 * 60 * 60 * 24),
                                  )}{" "}
                                  days overdue)
                                </span>
                              )}
                              {activity.isDueSoon && !activity.isOverdue && (
                                <span className="ml-1 font-semibold">
                                  (
                                  {Math.ceil(
                                    (activity.dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
                                  )}{" "}
                                  days left)
                                </span>
                              )}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
