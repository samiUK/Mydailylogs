"use client"

import type React from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useState, useEffect, useMemo } from "react"
import {
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
import { formatUKDate, formatRelativeTime } from "@/lib/date-formatter"
import { SubscriptionCancellationWarning } from "@/components/subscription-cancellation-warning"

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
  // Added state for subscription limits and usage
  const [subscriptionLimits, setSubscriptionLimits] = useState<any>(null)
  const [currentUsage, setCurrentUsage] = useState<any>(null)
  const [monthlySubmissions, setMonthlySubmissions] = useState<any>(null)
  const [activityPage, setActivityPage] = useState(1)
  const [activityTotal, setActivityTotal] = useState(0)
  const ACTIVITIES_PER_PAGE = 10

  const [templateAssignments, setTemplateAssignments] = useState<any[]>([])
  const [showVerificationSuccess, setShowVerificationSuccess] = useState(false)

  const [subscriptionEndWarning, setSubscriptionEndWarning] = useState<{
    daysRemaining: number
    periodEndDate: string
  } | null>(null)

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
    if (!templateAssignments) return { total: 0, completed: 0, pending: 0 }

    const total = templateAssignments.filter((a) => a.is_active).length
    const completed = templateAssignments.filter((a) => a.status === "completed" && a.is_active).length
    const pending = templateAssignments.filter((a) => a.status !== "completed" && a.is_active).length

    return { total, completed, pending }
  }, [templateAssignments])

  const pendingAssignments = useMemo(() => {
    if (!templateAssignments) return []

    // Pending assignments = templates assigned but not yet completed/submitted
    return templateAssignments.filter((assignment) => assignment.status !== "completed" && assignment.is_active)
  }, [templateAssignments])

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

            if (profile.role !== "admin" && profile.role !== "manager" && profile.role !== "master_admin") {
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

        if (profileData.role !== "admin" && profileData.role !== "manager" && profileData.role !== "master_admin") {
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

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get("verified") === "true") {
      setShowVerificationSuccess(true)
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname)
      // Hide message after 5 seconds
      setTimeout(() => setShowVerificationSuccess(false), 5000)
    }
  }, [])

  useEffect(() => {
    const loadLimitsAndUsage = async () => {
      if (!organizationId) return

      try {
        // Fetch subscription limits
        const limitsModule = await import("@/lib/subscription-limits")
        const limits = await limitsModule.getSubscriptionLimits(organizationId)
        const usage = await limitsModule.getCurrentUsage(organizationId)

        setSubscriptionLimits(limits)
        setCurrentUsage(usage)

        // Fetch monthly submissions for free users
        if (limits.planName === "Starter") {
          const response = await fetch("/api/admin/monthly-submissions")
          if (response.ok) {
            const data = await response.json()
            setMonthlySubmissions(data)
          }
        }
      } catch (error) {
        console.error("Error loading limits and usage:", error)
      }
    }

    loadLimitsAndUsage()
  }, [organizationId])

  // Modified useEffect to include subscription cancellation check
  useEffect(() => {
    const fetchData = async () => {
      if (!organizationId || !user) return

      try {
        const supabase = createClient()

        // Fetch basic organization and subscription data
        const { data: orgData, error: orgError } = await supabase
          .from("organizations")
          .select("subscription(*)")
          .eq("id", organizationId)
          .single()

        if (orgError) throw orgError

        if (orgData.subscription?.cancel_at_period_end && orgData.subscription?.current_period_end) {
          const periodEnd = new Date(orgData.subscription.current_period_end)
          const now = new Date()
          const daysRemaining = Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

          if (daysRemaining <= 3 && daysRemaining > 0) {
            setSubscriptionEndWarning({
              daysRemaining,
              periodEndDate: orgData.subscription.current_period_end,
            })
          }
        }
      } catch (error) {
        console.error("Error fetching organization or subscription data:", error)
      }
    }

    fetchData()
  }, [organizationId, user])

  const fetchActivityLog = async () => {
    if (!organizationId) return

    try {
      setActivityLoading(true)
      const supabase = createClient()
      const now = new Date()
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

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
        .gte("created_at", thirtyDaysAgo.toISOString()) // Filter last 30 days
        .order("created_at", { ascending: false })
        .limit(200)

      console.log("[v0] Template assignments fetched:", assignments)

      // Fetch submitted reports
      const { data: submissions, error: submissionsError } = await supabase
        .from("submitted_reports")
        .select(`
          *,
          submitter:profiles!submitted_reports_submitted_by_fkey(first_name, last_name, full_name)
        `)
        .eq("organization_id", organizationId)
        .gte("submitted_at", thirtyDaysAgo.toISOString()) // Filter last 30 days
        .order("submitted_at", { ascending: false })
        .limit(100)

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
        .gte("updated_at", thirtyDaysAgo.toISOString()) // Filter last 30 days
        .order("updated_at", { ascending: false })
        .limit(200)

      console.log("[v0] Daily checklists fetched:", checklists)

      const { data: deletedTaskNotifications, error: notificationsError } = await supabase
        .from("notifications")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("type", "task_auto_deleted")
        .gte("created_at", thirtyDaysAgo.toISOString())
        .order("created_at", { ascending: false })
        .limit(100)

      console.log("[v0] Auto-deleted task notifications fetched:", deletedTaskNotifications)

      if (assignmentsError) throw assignmentsError
      if (submissionsError) throw submissionsError
      if (checklistsError) throw checklistsError
      if (notificationsError) throw notificationsError

      const activities: any[] = []
      let overdueCounter = 0

      deletedTaskNotifications?.forEach((notification: any) => {
        activities.push({
          id: `deleted-task-${notification.id}`,
          type: "task_deleted",
          action: "Task Auto-Deleted",
          description: notification.message,
          timestamp: notification.created_at,
          status: "deleted",
          icon: "alert",
          isOverdue: true, // Red styling
          isDueSoon: false,
          priority: 0, // Highest priority
        })
      })

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
      setActivityTotal(activities.length)
      setActivityLog(activities)
    } catch (error) {
      console.error("Error fetching activity log:", error)
    } finally {
      setActivityLoading(false)
    }
  }

  const refreshActivityLog = async () => {
    setIsRefreshing(true)
    // Reset page to 1 when refreshing
    setActivityPage(1)
    await fetchActivityLog()
    setIsRefreshing(false)
  }

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const supabase = createClient()

        const [templatesRes, activeTemplatesRes, teamMembersRes, assignmentsRes, adminsRes] = await Promise.all([
          supabase
            .from("checklist_templates")
            .select("*")
            .eq("organization_id", organizationId)
            .order("created_at", { ascending: false }),
          supabase
            .from("checklist_templates")
            .select("*")
            .eq("organization_id", organizationId)
            .eq("is_active", true)
            .order("created_at", { ascending: false }),
          supabase
            .from("profiles")
            .select("id, first_name, last_name, full_name, role")
            .eq("organization_id", organizationId)
            .neq("id", user.id)
            .order("first_name"),
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
        setTodayChecklists(assignmentsRes.data?.filter((a) => a.status !== "completed") || [])
        setAdmins(adminsRes.data || [])
        setTemplateAssignments(assignmentsRes.data || [])

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

  const paginatedActivities = activityLog.slice(
    (activityPage - 1) * ACTIVITIES_PER_PAGE,
    activityPage * ACTIVITIES_PER_PAGE,
  )
  const totalPages = Math.ceil(activityLog.length / ACTIVITIES_PER_PAGE)

  return (
    <div className="space-y-8">
      <FeedbackBanner />

      {showVerificationSuccess && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Email Verified Successfully</AlertTitle>
          <AlertDescription className="text-green-700">
            Your email has been verified. You now have full access to all features.
          </AlertDescription>
        </Alert>
      )}

      {subscriptionEndWarning && (
        <SubscriptionCancellationWarning
          daysRemaining={subscriptionEndWarning.daysRemaining}
          periodEndDate={subscriptionEndWarning.periodEndDate}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {profile?.first_name || profile?.full_name || "Admin"}</p>
        </div>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Report Overview</CardTitle>
            <CardDescription className="text-sm sm:text-base">Report templates awaiting completion</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2 sm:gap-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-center px-1">
                <div className="text-xl sm:text-2xl font-bold text-blue-600">{reportStats.total}</div>
                <div className="text-xs text-muted-foreground">Total Reports</div>
              </div>
              <div className="text-center px-1">
                <div className="text-xl sm:text-2xl font-bold text-green-600">{reportStats.completed}</div>
                <div className="text-xs text-muted-foreground">Completed</div>
              </div>
              <div className="text-center px-1">
                <div className="text-xl sm:text-2xl font-bold text-orange-600">{reportStats.pending}</div>
                <div className="text-xs text-muted-foreground">Pending</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Plan Quota</CardTitle>
            <CardDescription className="text-xs">
              {subscriptionLimits?.planName || "Loading..."} Plan Usage
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!subscriptionLimits || !currentUsage ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Templates Quota */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Templates</span>
                    <span className="font-medium">
                      {currentUsage.templateCount} / {subscriptionLimits.maxTemplates}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        currentUsage.templateCount >= subscriptionLimits.maxTemplates
                          ? "bg-red-500"
                          : currentUsage.templateCount >= subscriptionLimits.maxTemplates * 0.8
                            ? "bg-amber-500"
                            : "bg-green-500"
                      }`}
                      style={{
                        width: `${Math.min((currentUsage.templateCount / subscriptionLimits.maxTemplates) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Team Members Quota */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Team Members</span>
                    <span className="font-medium">
                      {currentUsage.teamMemberCount} / {subscriptionLimits.maxTeamMembers}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        currentUsage.teamMemberCount >= subscriptionLimits.maxTeamMembers
                          ? "bg-red-500"
                          : currentUsage.teamMemberCount >= subscriptionLimits.maxTeamMembers * 0.8
                            ? "bg-amber-500"
                            : "bg-blue-500"
                      }`}
                      style={{
                        width: `${Math.min((currentUsage.teamMemberCount / subscriptionLimits.maxTeamMembers) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Managers Quota - Only show for paid plans */}
                {subscriptionLimits.planName !== "Starter" && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Managers</span>
                      <span className="font-medium">
                        {currentUsage.adminManagerCount} / {subscriptionLimits.maxAdminAccounts}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          currentUsage.adminManagerCount >= subscriptionLimits.maxAdminAccounts
                            ? "bg-red-500"
                            : currentUsage.adminManagerCount >= subscriptionLimits.maxAdminAccounts * 0.8
                              ? "bg-amber-500"
                              : "bg-purple-500"
                        }`}
                        style={{
                          width: `${Math.min((currentUsage.adminManagerCount / subscriptionLimits.maxAdminAccounts) * 100, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Monthly Submissions - Only for free users */}
                {subscriptionLimits.planName === "Starter" && monthlySubmissions && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Monthly Submissions</span>
                      <span className="font-medium">
                        {monthlySubmissions.count} / {subscriptionLimits.maxReportSubmissions}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          monthlySubmissions.count >= subscriptionLimits.maxReportSubmissions
                            ? "bg-red-500"
                            : monthlySubmissions.count >= subscriptionLimits.maxReportSubmissions * 0.8
                              ? "bg-amber-500"
                              : "bg-indigo-500"
                        }`}
                        style={{
                          width: `${Math.min((monthlySubmissions.count / subscriptionLimits.maxReportSubmissions) * 100, 100)}%`,
                        }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Resets: {new Date(monthlySubmissions.nextReset).toLocaleDateString()}
                    </p>
                  </div>
                )}

                {/* Upgrade CTA for free users near limit */}
                {subscriptionLimits.planName === "Starter" &&
                  (currentUsage.templateCount >= subscriptionLimits.maxTemplates * 0.8 ||
                    currentUsage.teamMemberCount >= subscriptionLimits.maxTeamMembers * 0.8 ||
                    (monthlySubmissions &&
                      monthlySubmissions.count >= subscriptionLimits.maxReportSubmissions * 0.8)) && (
                    <div className="pt-2 border-t">
                      <Link href="/admin/billing">
                        <Button size="sm" className="w-full text-xs h-8">
                          Upgrade Plan
                        </Button>
                      </Link>
                    </div>
                  )}
              </div>
            )}
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

            <Link href="/admin/team">
              <Button variant="outline" className="w-full justify-start bg-transparent h-12 text-sm sm:text-base">
                <UserPlus className="h-4 w-4 mr-2" />
                View Team Members
              </Button>
            </Link>
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
            <CardDescription>Real-time monitoring of all team activities and deadlines (last 30 days)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              {activityLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : activityLog.length === 0 ? (
                <div className="text-sm text-muted-foreground py-8 text-center">No activity in the last 30 days</div>
              ) : (
                <>
                  {paginatedActivities.map((activity, index) => (
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
                                    : activity.type === "task_deleted" // Handle new task_deleted type
                                      ? "bg-red-500 text-white"
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
                                  : activity.status === "deleted" // Handle new status
                                    ? "bg-red-100 text-red-700"
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
                            <p className="text-xs text-muted-foreground">
                              • Due: {new Date(activity.dueDate).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-4 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setActivityPage((p) => Math.max(1, p - 1))}
                        disabled={activityPage === 1}
                      >
                        Previous
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        Page {activityPage} of {totalPages} ({activityTotal} total activities)
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setActivityPage((p) => Math.min(totalPages, p + 1))}
                        disabled={activityPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
