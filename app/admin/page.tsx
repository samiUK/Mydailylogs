"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
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
import { ChevronDown, Users, UserCheck, Bell, CheckCircle, Plus, UserPlus, AlertTriangle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import Link from "next/link"
import { FeedbackBanner } from "@/components/feedback-banner"

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

  const [isImpersonating, setIsImpersonating] = useState(false)
  const [impersonationData, setImpersonationData] = useState<any>(null)

  const checkMissedTasks = async () => {
    if (!profile?.organization_id) return

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
      .eq("organization_id", profile.organization_id)
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

  const loadAdmins = async () => {
    const supabase = createClient()
    const { data: admins } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, full_name, email")
      .eq("organization_id", profile?.organization_id)
      .eq("role", "admin")
    setAdmins(admins || [])
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
          organizationId: profile?.organization_id,
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
          organizationId: profile?.organization_id,
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

  const markNotificationAsRead = async (notificationId: string) => {
    setAllNotifications((prev) => prev.filter((n) => n.id !== notificationId))
  }

  const markAllNotificationsAsRead = () => {
    setAllNotifications([])
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
          organizationId: profile?.organization_id,
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
        .eq("organization_id", profile.organization_id)
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

  useEffect(() => {
    const loadUser = async () => {
      const supabase = createClient()

      try {
        const impersonationContext = sessionStorage.getItem("masterAdminImpersonation")

        // Check if this is a valid impersonation session
        if (impersonationContext) {
          const impersonationData = JSON.parse(impersonationContext)

          // Always honor valid impersonation context for master admin
          setIsImpersonating(true)
          setImpersonationData(impersonationData)

          // Fetch the target user's profile data
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

        // Normal user authentication flow
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

        const [templatesRes, activeTemplatesRes, teamMembersRes, assignmentsRes] = await Promise.all([
          supabase.from("checklist_templates").select("*").eq("organization_id", profile.organization_id),
          supabase
            .from("checklist_templates")
            .select("id, name, description")
            .eq("organization_id", profile.organization_id)
            .eq("is_active", true)
            .order("name"),
          supabase
            .from("profiles")
            .select("id, first_name, last_name, full_name, role")
            .eq("organization_id", profile.organization_id)
            .neq("id", user.id)
            .order("first_name"),
          supabase
            .from("template_assignments")
            .select(`
              *,
              checklist_templates:template_id(name, schedule_type),
              profiles:assigned_to(first_name, last_name, full_name)
            `)
            .eq("organization_id", profile.organization_id)
            .or(
              `status.neq.completed,and(status.eq.completed,checklist_templates.schedule_type.in.(daily,weekly,monthly,recurring))`,
            )
            .order("completed_at", { ascending: false, nullsLast: true })
            .order("assigned_at", { ascending: false })
            .limit(20),
        ])

        setTemplates(templatesRes.data || [])
        setActiveTemplates(activeTemplatesRes.data || [])
        setTeamMembers(teamMembersRes.data || [])
        setTodayChecklists(assignmentsRes.data || [])

        await checkMissedTasks()
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [user, profile])

  useEffect(() => {
    if (profile?.organization_id) {
      loadAdmins()
    }
  }, [profile])

  useEffect(() => {
    const loadNotifications = async () => {
      if (!user || !profile) return

      try {
        const supabase = createClient()

        const { data: notifications, error: notificationsError } = await supabase
          .from("template_assignments")
          .select(`
            *,
            checklist_templates!inner(name),
            assigned_to_profile:profiles!template_assignments_assigned_to_fkey(first_name, last_name, full_name),
            assigned_by_profile:profiles!template_assignments_assigned_by_fkey(first_name, last_name, full_name)
          `)
          .eq("organization_id", profile.organization_id)
          .or("status.eq.completed,status.eq.active")
          .order("updated_at", { ascending: false })
          .limit(15)

        if (notificationsError) {
          console.error("Error fetching notifications:", notificationsError)
        } else {
          const transformedNotifications =
            notifications?.map((assignment) => ({
              id: assignment.id,
              type: assignment.status === "completed" ? "submission" : "assignment",
              title:
                assignment.status === "completed"
                  ? `${assignment.assigned_to_profile?.full_name || `${assignment.assigned_to_profile?.first_name} ${assignment.assigned_to_profile?.last_name}`} submitted a report`
                  : `New task assigned to ${assignment.assigned_to_profile?.full_name || `${assignment.assigned_to_profile?.first_name} ${assignment.assigned_to_profile?.last_name}`}`,
              message: assignment.checklist_templates?.name || "Checklist",
              timestamp: assignment.status === "completed" ? assignment.completed_at : assignment.assigned_at,
              isRead: false,
              data: assignment,
            })) || []

          setAllNotifications(transformedNotifications)
        }
      } catch (error) {
        console.error("Error loading notifications:", error)
      }
    }

    loadNotifications()
  }, [user, profile])

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-2">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  const completedToday =
    todayChecklists?.filter((c) => {
      if (c.status !== "completed" || !c.completed_at) return false
      const completedDate = new Date(c.completed_at).toDateString()
      const today = new Date().toDateString()
      return completedDate === today
    }).length || 0

  const totalCompleted = todayChecklists?.filter((c) => c.status === "completed").length || 0
  const inProgressToday = todayChecklists?.filter((c) => c.status === "active" || !c.status).length || 0

  return (
    <div className="space-y-8">
      <FeedbackBanner />

      {isImpersonating && impersonationData && (
        <div className="bg-orange-100 border-l-4 border-orange-500 px-3 py-2 rounded-md text-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
              <span className="text-orange-700">Viewing as {impersonationData.targetUserEmail}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                sessionStorage.removeItem("masterAdminImpersonation")
                window.location.href = "/masterdashboard"
              }}
              className="text-orange-700 hover:text-orange-900 h-6 px-2 text-xs"
            >
              Exit
            </Button>
          </div>
        </div>
      )}

      <div>
        <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Manage your organization&apos;s compliance checklists and team members
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
                    Missed: {task.template.name} (Due: {task.dueDate.toLocaleDateString()})
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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Report Overview</CardTitle>
            <CardDescription className="text-base">Report templates awaiting completion</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-48 overflow-y-auto text-left">
              {todayChecklists?.filter((assignment) => assignment.status !== "completed").length === 0 ? (
                <div className="text-base text-muted-foreground text-left py-4">No pending reports</div>
              ) : (
                todayChecklists
                  ?.filter((assignment) => assignment.status !== "completed")
                  .slice(0, 5)
                  .map((assignment) => (
                    <div key={assignment.id} className="flex items-center justify-between p-2 border rounded-lg">
                      <div className="flex-1 text-left">
                        <h5 className="text-base font-medium text-foreground">
                          {assignment.checklist_templates?.name || "Template"}
                        </h5>
                        <p className="text-sm text-muted-foreground">
                          Assigned to:{" "}
                          {assignment.profiles?.full_name ||
                            `${assignment.profiles?.first_name} ${assignment.profiles?.last_name}` ||
                            "Team Member"}
                        </p>
                        <p className="text-sm text-blue-600">
                          Assigned: {new Date(assignment.assigned_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                          Pending
                        </Badge>
                      </div>
                    </div>
                  ))
              )}
            </div>
            <div className="mt-3 pt-3 border-t text-left">
              <p className="text-sm text-muted-foreground">
                Pending: {todayChecklists?.filter((assignment) => assignment.status !== "completed").length || 0} •
                Total Reports: {todayChecklists?.length || 0} • Completed: {totalCompleted}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Report Templates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{templates?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Report templates</p>
            <p className="text-xs text-blue-600 font-medium mt-1">
              Remaining quota: {Math.max(0, 3 - (templates?.length || 0))}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>Team overview</CardDescription>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/admin/templates/new">
              <Button variant="outline" className="w-full justify-start bg-transparent">
                <Plus className="h-4 w-4 mr-2" />+ New Report Template
              </Button>
            </Link>

            <Dialog open={showTeamModal} onOpenChange={setShowTeamModal}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full justify-start bg-transparent">
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
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Notifications
              {allNotifications.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {allNotifications.length}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>Latest updates, submissions, and task assignments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {allNotifications.length > 0 && (
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-xs text-muted-foreground">
                    {allNotifications.length} notification{allNotifications.length > 1 ? "s" : ""}
                  </span>
                  <Button variant="ghost" size="sm" onClick={markAllNotificationsAsRead} className="text-xs h-6 px-2">
                    Clear All
                  </Button>
                </div>
              )}

              {allNotifications.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-4">No new notifications</div>
              ) : (
                allNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`flex items-start justify-between p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                      notification.type === "submission" ? "bg-green-50 border-green-200" : "bg-blue-50 border-blue-200"
                    }`}
                    onClick={() => markNotificationAsRead(notification.id)}
                  >
                    <div className="flex items-start gap-3 flex-1">
                      {notification.type === "submission" ? (
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      ) : (
                        <Bell className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{notification.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">{notification.message}</p>
                        <p className="text-xs text-blue-600 font-medium">
                          {new Date(notification.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={
                          notification.type === "submission"
                            ? "bg-green-100 text-green-800 border-green-300"
                            : "bg-blue-100 text-blue-800 border-blue-300"
                        }
                      >
                        {notification.type === "submission" ? "Completed" : "Assigned"}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          markNotificationAsRead(notification.id)
                        }}
                        className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                      >
                        ×
                      </Button>
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
