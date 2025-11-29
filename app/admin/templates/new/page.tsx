"use client"

import type React from "react"
import { toast } from "react-toastify"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Plus, Trash2, GripVertical, Eye, EyeOff, Users, AlertTriangle, Crown, CheckCircle } from "lucide-react"
import { checkCanCreateTemplate, getSubscriptionLimits } from "@/lib/subscription-limits"
import Link from "next/link"

interface Task {
  id: string
  name: string
  type: "boolean" | "numeric" | "text" | "photo"
  category?: string
  assigned_role?: string
  validation?: {
    required?: boolean
    min_value?: number
    max_value?: number
    min_length?: number
    max_length?: number
  }
  order: number
}

export default function NewTemplatePage() {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [frequency, setFrequency] = useState("")
  const [scheduleType, setScheduleType] = useState("recurring")
  const [specificDate, setSpecificDate] = useState("")
  const [deadlineDate, setDeadlineDate] = useState("")
  const [scheduleTime, setScheduleTime] = useState("")
  const [tasks, setTasks] = useState<Task[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [newCategory, setNewCategory] = useState("")
  const [showPreview, setShowPreview] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [organizationName, setOrganizationName] = useState<string | null>(null)
  const [canCreateTemplate, setCanCreateTemplate] = useState(true)
  const [limitCheckResult, setLimitCheckResult] = useState<any>(null)
  const [subscriptionLimits, setSubscriptionLimits] = useState<any>(null)
  const router = useRouter()

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

  const [hasTaskAutomation, setHasTaskAutomation] = useState(false)
  const [loadingLimits, setLoadingLimits] = useState(true)

  useEffect(() => {
    async function loadUserAndLimits() {
      try {
        console.log("[v0] Starting authentication check...")
        const supabase = createClient()

        const authPromise = supabase.auth.getUser()
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Authentication timeout")), 10000),
        )

        const result = (await Promise.race([authPromise, timeoutPromise])) as any
        const {
          data: { user },
          error: userError,
        } = result

        console.log("[v0] User authentication result:", { user: user?.id, userError })

        if (userError) {
          console.log("[v0] Authentication error:", userError)
          setError("Authentication failed. Please try refreshing the page.")
          return
        }

        if (!user) {
          console.log("[v0] No authenticated user found, redirecting to login")
          setError("Please log in to create templates")
          return
        }

        console.log("[v0] User authenticated, fetching profile...")
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("organization_id, organization_name")
          .eq("id", user.id)
          .single()

        console.log("[v0] Profile query result:", { profile, profileError })

        if (profileError) {
          console.log("[v0] Profile error:", profileError)
          setError("Failed to load user profile")
          return
        }

        if (profile?.organization_id) {
          console.log("[v0] Setting organization ID:", profile.organization_id)
          setOrganizationId(profile.organization_id)
          setOrganizationName(profile.organization_name)

          const [limitCheck, limits] = await Promise.all([
            checkCanCreateTemplate(profile.organization_id),
            getSubscriptionLimits(profile.organization_id),
          ])

          console.log("[v0] Limit check results:", { limitCheck, limits })
          setLimitCheckResult(limitCheck)
          setSubscriptionLimits(limits)
          setCanCreateTemplate(limitCheck.canCreate)

          if (!limitCheck.canCreate) {
            console.log("[v0] Cannot create template:", limitCheck.reason)
          } else {
            console.log("[v0] Can create template - ready to go!")
          }

          setHasTaskAutomation(limits.hasTaskAutomation)
        } else {
          console.log("[v0] No organization_id found in profile")
          setError("No organization found for user")
        }
      } catch (error) {
        console.log("[v0] Error in authentication check:", error)
        setError("Failed to load page. Please try refreshing.")
      } finally {
        setLoadingLimits(false)
      }
    }
    loadUserAndLimits()
  }, [router])

  const addCategory = () => {
    if (newCategory.trim() && !categories.includes(newCategory.trim())) {
      setCategories([...categories, newCategory.trim()])
      setNewCategory("")
    }
  }

  const removeCategory = (categoryToRemove: string) => {
    setCategories(categories.filter((cat) => cat !== categoryToRemove))
    // Remove category from tasks
    setTasks(tasks.map((task) => (task.category === categoryToRemove ? { ...task, category: undefined } : task)))
  }

  const addTask = () => {
    const newTask: Task = {
      id: crypto.randomUUID(),
      name: "",
      type: "boolean",
      validation: { required: true },
      order: tasks.length,
    }
    setTasks([...tasks, newTask])
  }

  const removeTask = (taskId: string) => {
    setTasks(tasks.filter((task) => task.id !== taskId))
  }

  const updateTask = (taskId: string, updates: Partial<Task>) => {
    setTasks(tasks.map((task) => (task.id === taskId ? { ...task, ...updates } : task)))
  }

  const moveTask = (taskId: string, direction: "up" | "down") => {
    const taskIndex = tasks.findIndex((task) => task.id === taskId)
    if (taskIndex === -1) return

    const newTasks = [...tasks]
    const targetIndex = direction === "up" ? taskIndex - 1 : taskIndex + 1

    if (targetIndex >= 0 && targetIndex < tasks.length) {
      ;[newTasks[taskIndex], newTasks[targetIndex]] = [newTasks[targetIndex], newTasks[taskIndex]]
      newTasks.forEach((task, index) => {
        task.order = index
      })
      setTasks(newTasks)
    }
  }

  const getTasksByCategory = () => {
    const categorizedTasks: { [key: string]: Task[] } = {}
    const uncategorizedTasks: Task[] = []

    tasks.forEach((task) => {
      if (task.category) {
        if (!categorizedTasks[task.category]) {
          categorizedTasks[task.category] = []
        }
        categorizedTasks[task.category].push(task)
      } else {
        uncategorizedTasks.push(task)
      }
    })

    return { categorizedTasks, uncategorizedTasks }
  }

  const validateDates = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (scheduleType === "specific_date" && specificDate) {
      const selectedDate = new Date(specificDate)
      selectedDate.setHours(0, 0, 0, 0)

      if (selectedDate < today) {
        setError("Specific date cannot be in the past")
        return false
      }
    }

    if (scheduleType === "deadline" && deadlineDate) {
      const selectedDeadline = new Date(deadlineDate)
      selectedDeadline.setHours(0, 0, 0, 0)

      if (selectedDeadline < today) {
        setError("Deadline date cannot be in the past")
        return false
      }
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log("[v0] Form submitted - starting template creation process")
    console.log("[v0] Current state:", { organizationId, canCreateTemplate, name, tasks: tasks.length })

    if (!organizationId || !canCreateTemplate) {
      console.log("[v0] Cannot proceed - missing org ID or cannot create template")
      return
    }

    if (!validateDates()) {
      console.log("[v0] Date validation failed")
      return
    }

    const limitCheck = await checkCanCreateTemplate(organizationId)
    console.log("[v0] Final limit check before creation:", limitCheck)

    if (!limitCheck.canCreate) {
      console.log("[v0] Final limit check failed:", limitCheck.reason)
      setError(limitCheck.reason || "Cannot create template due to plan limits")
      return
    }

    if (scheduleType === "recurring" && !hasTaskAutomation) {
      toast.error("Task Automation is a premium feature. Upgrade to Growth or Scale plan to create recurring tasks.")
      return
    }

    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const supabase = createClient()

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError) {
        console.log("[v0] Auth error during submission:", authError)
        throw new Error("Authentication failed. Please refresh and try again.")
      }

      if (!user) throw new Error("Not authenticated")

      let processedSpecificDate = null
      let processedDeadlineDate = null

      if (scheduleType === "specific_date" && specificDate) {
        processedSpecificDate = specificDate
      }

      if (scheduleType === "deadline" && deadlineDate) {
        processedDeadlineDate = deadlineDate
      }

      let mappedFrequency: string
      if (scheduleType === "recurring") {
        mappedFrequency = frequency
      } else {
        // For specific_date, deadline, and one-off, use 'custom' as the frequency
        mappedFrequency = "custom"
      }

      const templateData = {
        name,
        description,
        frequency: mappedFrequency,
        schedule_type: scheduleType,
        specific_date: processedSpecificDate,
        deadline_date: processedDeadlineDate,
        schedule_time: scheduleTime || null,
        organization_id: organizationId,
        created_by: user.id,
        is_active: true,
      }

      console.log("[v0] Creating template with data:", templateData)

      const { data: templateResult, error: templateError } = await supabase
        .from("checklist_templates")
        .insert(templateData)
        .select()
        .single()

      if (templateError) {
        console.log("[v0] Template creation error:", templateError)
        throw templateError
      }

      console.log("[v0] Template created successfully:", templateResult)

      if (tasks.length > 0) {
        const tasksToInsert = tasks.map((task) => ({
          template_id: templateResult.id,
          name: task.name,
          task_type: task.type,
          category: task.category,
          assigned_role: task.assigned_role,
          validation_rules: task.validation,
          order_index: task.order,
          is_required: task.validation?.required || false,
        }))

        console.log("[v0] Inserting tasks:", tasksToInsert)

        const { error: tasksError } = await supabase.from("checklist_items").insert(tasksToInsert)

        if (tasksError) {
          console.log("[v0] Tasks insertion error:", tasksError)
          throw tasksError
        }

        console.log("[v0] Tasks inserted successfully")
      }

      setSuccess("Report template created successfully!")
      setTimeout(() => {
        router.push(`/admin/templates`)
      }, 1500)
    } catch (error: unknown) {
      console.log("[v0] Error in template creation:", error)
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const { categorizedTasks, uncategorizedTasks } = getTasksByCategory()

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Create New Report Template</h1>
        <p className="text-muted-foreground mt-2">Set up a new report template for your team</p>

        {limitCheckResult && subscriptionLimits && (
          <div className="mt-4 flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              Report Templates: {limitCheckResult.currentCount} / {limitCheckResult.maxAllowed} used
            </div>
            <div className="text-sm text-muted-foreground">Plan: {subscriptionLimits.planName}</div>
            {!canCreateTemplate && (
              <Link href="/admin/billing">
                <Button size="sm" className="bg-accent hover:bg-accent/90">
                  <Crown className="w-4 h-4 mr-1" />
                  Upgrade Plan
                </Button>
              </Link>
            )}
          </div>
        )}
      </div>

      {!canCreateTemplate && limitCheckResult && (
        <Alert className="border-destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{limitCheckResult.reason}</span>
            <Link href="/admin/billing">
              <Button size="sm" variant="destructive">
                Upgrade Now
              </Button>
            </Link>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-8">
            <Card className={!canCreateTemplate ? "opacity-50" : ""}>
              <CardHeader>
                <CardTitle>Report Template Details</CardTitle>
                <CardDescription>Basic information about your report template</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-2">
                  <Label htmlFor="name" required>
                    Report Template Name
                  </Label>
                  <Input
                    id="name"
                    placeholder="Daily Safety Report"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="bg-white border-2 border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-200"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe what this report covers..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="bg-white border-2 border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-200"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="scheduleType" required>
                    Schedule Type
                  </Label>
                  <Select value={scheduleType} onValueChange={setScheduleType} required disabled={loadingLimits}>
                    <SelectTrigger className="bg-white border-2 border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200">
                      <SelectValue placeholder="How should this be scheduled?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recurring" disabled={!hasTaskAutomation}>
                        Recurring (Daily/Weekly/Monthly)
                        {!hasTaskAutomation && " 👑 Premium"}
                      </SelectItem>
                      <SelectItem value="specific_date">Specific Date</SelectItem>
                      <SelectItem value="deadline">Deadline</SelectItem>
                      <SelectItem value="one-off">One-off</SelectItem>
                    </SelectContent>
                  </Select>
                  {scheduleType === "recurring" && !hasTaskAutomation && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-sm text-amber-800 font-medium">🔒 Task Automation is a Premium Feature</p>
                      <p className="text-xs text-amber-700 mt-1">
                        Upgrade to Growth or Scale plan to automate recurring tasks and reduce admin workload.
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        className="mt-2 bg-amber-600 hover:bg-amber-700"
                        onClick={() => router.push("/admin/billing")}
                      >
                        Upgrade Now
                      </Button>
                    </div>
                  )}
                </div>

                {scheduleType === "recurring" && (
                  <div className="grid gap-2">
                    <Label htmlFor="frequency" required>
                      Frequency
                    </Label>
                    <Select value={frequency} onValueChange={setFrequency} required>
                      <SelectTrigger className="bg-white border-2 border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200">
                        <SelectValue placeholder="How often should this be completed?" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {scheduleType === "specific_date" && (
                  <div className="grid gap-2">
                    <Label htmlFor="specificDate" required>
                      Specific Date
                    </Label>
                    <Input
                      id="specificDate"
                      type="date"
                      value={specificDate}
                      onChange={(e) => {
                        setSpecificDate(e.target.value)
                        if (error && error.includes("Specific date")) {
                          setError(null)
                        }
                      }}
                      required
                      min={new Date().toISOString().split("T")[0]}
                      className="bg-white border-2 border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                    />
                    <p className="text-xs text-muted-foreground">Select the date when this task should be completed</p>
                  </div>
                )}

                {scheduleType === "deadline" && (
                  <div className="grid gap-2">
                    <Label htmlFor="deadlineDate" required>
                      Deadline Date
                    </Label>
                    <Input
                      id="deadlineDate"
                      type="date"
                      value={deadlineDate}
                      onChange={(e) => {
                        setDeadlineDate(e.target.value)
                        if (error && error.includes("Deadline date")) {
                          setError(null)
                        }
                      }}
                      required
                      min={new Date().toISOString().split("T")[0]}
                      className="bg-white border-2 border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                    />
                    <p className="text-xs text-muted-foreground">
                      Select the deadline by which this task must be completed
                    </p>
                  </div>
                )}

                {(scheduleType === "specific_date" || scheduleType === "deadline") && (
                  <div className="grid gap-2">
                    <Label htmlFor="scheduleTime">Time (Optional)</Label>
                    <Input
                      id="scheduleTime"
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className="bg-white border-2 border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                    />
                  </div>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle>Categories</CardTitle>
                    <CardDescription>Organize tasks into sections (optional)</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        placeholder="e.g., Fire Safety, Food Hygiene"
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addCategory())}
                        className="bg-white border-2 border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                      />
                      <Button
                        type="button"
                        onClick={addCategory}
                        variant="outline"
                        className="bg-emerald-50 border-2 border-emerald-300 hover:bg-emerald-100 hover:border-emerald-400 text-emerald-700 font-semibold"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {categories.map((category) => (
                        <div
                          key={category}
                          className="flex items-center gap-1 bg-emerald-100 border border-emerald-300 px-3 py-1 rounded-full text-sm font-medium text-emerald-800"
                        >
                          {category}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0 hover:bg-red-500 hover:text-white rounded-full"
                            onClick={() => removeCategory(category)}
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Tasks</CardTitle>
                    <CardDescription>Define the tasks that will be included in this report</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {tasks.map((task, index) => (
                      <div
                        key={task.id}
                        className="border-2 border-gray-300 rounded-lg p-4 space-y-4 bg-white shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center gap-2">
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded">
                            Task {index + 1}
                          </span>
                          <div className="ml-auto flex gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => moveTask(task.id, "up")}
                              disabled={index === 0}
                              className="hover:bg-blue-100 hover:text-blue-700 border border-gray-300"
                            >
                              ↑
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => moveTask(task.id, "down")}
                              disabled={index === tasks.length - 1}
                              className="hover:bg-blue-100 hover:text-blue-700 border border-gray-300"
                            >
                              ↓
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeTask(task.id)}
                              className="hover:bg-red-100 hover:text-red-700 border border-gray-300"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label required>Task Name</Label>
                            <Input
                              placeholder="e.g., Check fire extinguisher"
                              value={task.name}
                              onChange={(e) => updateTask(task.id, { name: e.target.value })}
                              required
                              className="bg-white border-2 border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label required>Type</Label>
                            <Select
                              value={task.type}
                              onValueChange={(value: Task["type"]) => updateTask(task.id, { type: value })}
                            >
                              <SelectTrigger className="bg-white border-2 border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="boolean">✅ Yes/No</SelectItem>
                                <SelectItem value="numeric">🔢 Number</SelectItem>
                                <SelectItem value="text">📝 Text/Notes</SelectItem>
                                <SelectItem value="photo">📷 Photo Upload</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Category (Optional)</Label>
                            <Select
                              value={task.category || "No Category"}
                              onValueChange={(value) => updateTask(task.id, { category: value || undefined })}
                            >
                              <SelectTrigger className="bg-white border-2 border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200">
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="No Category">No Category</SelectItem>
                                {categories.map((category) => (
                                  <SelectItem key={category} value={category}>
                                    {category}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Assigned Role (Optional)</Label>
                            <Select
                              value={task.assigned_role || "Any Role"}
                              onValueChange={(value) => updateTask(task.id, { assigned_role: value || undefined })}
                            >
                              <SelectTrigger className="bg-white border-2 border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200">
                                <SelectValue placeholder="Any role" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Any Role">Any Role</SelectItem>
                                {commonRoles.map((role) => (
                                  <SelectItem key={role} value={role}>
                                    {role}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {task.type === "numeric" && (
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Min Value</Label>
                              <Input
                                type="number"
                                placeholder="0"
                                value={task.validation?.min_value || ""}
                                onChange={(e) =>
                                  updateTask(task.id, {
                                    validation: {
                                      ...task.validation,
                                      min_value: e.target.value ? Number(e.target.value) : undefined,
                                    },
                                  })
                                }
                                className="bg-white border-2 border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Max Value</Label>
                              <Input
                                type="number"
                                placeholder="100"
                                value={task.validation?.max_value || ""}
                                onChange={(e) =>
                                  updateTask(task.id, {
                                    validation: {
                                      ...task.validation,
                                      max_value: e.target.value ? Number(e.target.value) : undefined,
                                    },
                                  })
                                }
                                className="bg-white border-2 border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                              />
                            </div>
                          </div>
                        )}

                        {task.type === "text" && (
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Min Length</Label>
                              <Input
                                type="number"
                                placeholder="0"
                                value={task.validation?.min_length || ""}
                                onChange={(e) =>
                                  updateTask(task.id, {
                                    validation: {
                                      ...task.validation,
                                      min_length: e.target.value ? Number(e.target.value) : undefined,
                                    },
                                  })
                                }
                                className="bg-white border-2 border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Max Length</Label>
                              <Input
                                type="number"
                                placeholder="500"
                                value={task.validation?.max_length || ""}
                                onChange={(e) =>
                                  updateTask(task.id, {
                                    validation: {
                                      ...task.validation,
                                      max_length: e.target.value ? Number(e.target.value) : undefined,
                                    },
                                  })
                                }
                                className="bg-white border-2 border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    <Button
                      type="button"
                      variant="outline"
                      onClick={addTask}
                      className="w-full bg-white border-2 border-emerald-300 text-emerald-700 font-semibold py-2 text-sm shadow-sm transition-all duration-200 hover:bg-emerald-50 hover:border-emerald-400 hover:text-emerald-800"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Task
                    </Button>
                  </CardContent>
                </Card>

                {error && <p className="text-sm text-red-500">{error}</p>}
                {success && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <p className="text-sm text-green-700 font-medium">{success}</p>
                  </div>
                )}

                <div className="flex gap-4">
                  <Button
                    type="submit"
                    disabled={isLoading || !canCreateTemplate}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-3 text-base shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? "Creating..." : "Create Report Template"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                    className="border-2 border-gray-300 hover:bg-gray-100 font-semibold px-6 py-3 text-base"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Preview</CardTitle>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setShowPreview(!showPreview)}>
                    {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <CardDescription>How staff will see this report</CardDescription>
              </CardHeader>
              {showPreview && (
                <CardContent className="space-y-4">
                  <div className="border rounded-lg p-3 bg-muted/50">
                    <h3 className="font-semibold text-sm">{name || "Report Template Name"}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{description || "Report template description"}</p>
                    <div className="flex items-center gap-1 mt-2">
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                        {scheduleType === "recurring" && (frequency || "Frequency")}
                        {scheduleType === "specific_date" && `Due: ${specificDate || "Select date"}`}
                        {scheduleType === "deadline" && `Deadline: ${deadlineDate || "Select deadline"}`}
                        {scheduleType === "one-off" && "One-off Task"}
                      </span>
                      {scheduleTime && (
                        <span className="text-xs bg-secondary/10 text-secondary-foreground px-2 py-1 rounded">
                          {scheduleTime}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {/* Categorized tasks */}
                    {Object.entries(categorizedTasks).map(([category, categoryTasks]) => (
                      <div key={category} className="space-y-2">
                        <h4 className="text-sm font-medium text-primary border-b pb-1">{category}</h4>
                        {categoryTasks.map((task) => (
                          <div key={task.id} className="border rounded p-2 text-xs space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{task.name || "Task name"}</span>
                              {task.assigned_role && (
                                <span className="text-xs bg-muted px-1 rounded flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {task.assigned_role}
                                </span>
                              )}
                            </div>
                            <div className="text-muted-foreground">
                              {task.type === "boolean" && "✅ Yes/No"}
                              {task.type === "numeric" && "🔢 Number input"}
                              {task.type === "text" && "📝 Text input"}
                              {task.type === "photo" && "📷 Photo upload"}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}

                    {/* Uncategorized tasks */}
                    {uncategorizedTasks.length > 0 && (
                      <div className="space-y-2">
                        {categories.length > 0 && (
                          <h4 className="text-sm font-medium text-muted-foreground border-b pb-1">General Tasks</h4>
                        )}
                        {uncategorizedTasks.map((task) => (
                          <div key={task.id} className="border rounded p-2 text-xs space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{task.name || "Task name"}</span>
                              {task.assigned_role && (
                                <span className="text-xs bg-muted px-1 rounded flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {task.assigned_role}
                                </span>
                              )}
                            </div>
                            <div className="text-muted-foreground">
                              {task.type === "boolean" && "✅ Yes/No"}
                              {task.type === "numeric" && "🔢 Number input"}
                              {task.type === "text" && "📝 Text input"}
                              {task.type === "photo" && "📷 Photo upload"}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {tasks.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-4">Add tasks to see preview</p>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
