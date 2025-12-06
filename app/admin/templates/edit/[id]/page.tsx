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
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Plus, Trash2, GripVertical, Eye, EyeOff, Users, CheckCircle, ArrowLeft } from "lucide-react"
import { getSubscriptionLimits } from "@/lib/subscription-limits"
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

export default function EditTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const [templateId, setTemplateId] = useState<string>("")

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [frequency, setFrequency] = useState("")
  const [scheduleType, setScheduleType] = useState("one-off")
  const [specificDate, setSpecificDate] = useState("")
  const [deadlineDate, setDeadlineDate] = useState("")
  const [scheduleTime, setScheduleTime] = useState("")
  const [tasks, setTasks] = useState<Task[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [newCategory, setNewCategory] = useState("")
  const [showPreview, setShowPreview] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [organizationName, setOrganizationName] = useState<string | null>(null)
  const [subscriptionLimits, setSubscriptionLimits] = useState<any>(null)
  const [isActive, setIsActive] = useState(true)
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

  useEffect(() => {
    const resolveParams = async () => {
      const resolvedParams = await params
      setTemplateId(resolvedParams.id)
    }
    resolveParams()
  }, [params])

  useEffect(() => {
    if (templateId) {
      loadTemplate()
    }
  }, [templateId])

  const loadTemplate = async () => {
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/auth/login")
        return
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id, organization_name")
        .eq("id", user.id)
        .single()

      if (!profile) {
        router.push("/auth/login")
        return
      }

      setOrganizationId(profile.organization_id)
      setOrganizationName(profile.organization_name)

      const limits = await getSubscriptionLimits(profile.organization_id)
      setSubscriptionLimits(limits)
      setHasTaskAutomation(limits.hasTaskAutomation)

      const { data: templateData, error: templateError } = await supabase
        .from("checklist_templates")
        .select("*")
        .eq("id", templateId)
        .eq("organization_id", profile.organization_id)
        .single()

      if (templateError) throw templateError

      // Populate template fields
      setName(templateData.name)
      setDescription(templateData.description || "")
      setScheduleType(templateData.schedule_type || "one-off")
      setFrequency(templateData.frequency || "daily")
      setSpecificDate(templateData.specific_date || "")
      setDeadlineDate(templateData.deadline_date || "")
      setScheduleTime(templateData.schedule_time || "")
      setIsActive(templateData.is_active)

      // Load tasks from checklist_items
      const { data: taskData, error: taskError } = await supabase
        .from("checklist_items")
        .select("*")
        .eq("template_id", templateId)
        .order("order_index", { ascending: true })

      if (taskError) throw taskError

      if (taskData && taskData.length > 0) {
        // Extract unique categories
        const uniqueCategories = Array.from(new Set(taskData.map((t: any) => t.category).filter(Boolean))) as string[]
        setCategories(uniqueCategories)

        // Convert database tasks to UI tasks
        const loadedTasks: Task[] = taskData.map((t: any, index: number) => ({
          id: t.id,
          name: t.name,
          type: t.task_type,
          category: t.category,
          assigned_role: t.assigned_role,
          validation: t.validation_rules || { required: t.is_required },
          order: index,
        }))
        setTasks(loadedTasks)
      }
    } catch (error) {
      console.error("Error loading template:", error)
      toast.error("Failed to load template")
    } finally {
      setLoading(false)
    }
  }

  const addCategory = () => {
    if (newCategory.trim() && !categories.includes(newCategory.trim())) {
      setCategories([...categories, newCategory.trim()])
      setNewCategory("")
    }
  }

  const removeCategory = (categoryToRemove: string) => {
    setCategories(categories.filter((cat) => cat !== categoryToRemove))
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

    if (!organizationId) {
      return
    }

    if (!validateDates()) {
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
        is_active: isActive,
        updated_at: new Date().toISOString(),
      }

      // Update template
      const { error: templateError } = await supabase
        .from("checklist_templates")
        .update(templateData)
        .eq("id", templateId)

      if (templateError) throw templateError

      // Delete existing tasks
      const { error: deleteError } = await supabase.from("checklist_items").delete().eq("template_id", templateId)

      if (deleteError) throw deleteError

      // Insert updated tasks
      if (tasks.length > 0) {
        const tasksToInsert = tasks.map((task) => ({
          template_id: templateId,
          name: task.name,
          task_type: task.type,
          category: task.category,
          assigned_role: task.assigned_role,
          validation_rules: task.validation,
          order_index: task.order,
          is_required: task.validation?.required || false,
        }))

        const { error: tasksError } = await supabase.from("checklist_items").insert(tasksToInsert)

        if (tasksError) throw tasksError
      }

      setSuccess("Report template updated successfully!")
      setTimeout(() => {
        router.push(`/admin/templates`)
      }, 1500)
    } catch (error: unknown) {
      console.error("Error updating template:", error)
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const { categorizedTasks, uncategorizedTasks } = getTasksByCategory()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="text-muted-foreground mt-2">Loading template...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/admin/templates">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Edit Report Template</h1>
          <p className="text-muted-foreground mt-2">Update your report template settings and tasks</p>

          {subscriptionLimits && (
            <div className="mt-4 flex items-center gap-4">
              <div className="text-sm text-muted-foreground">Plan: {subscriptionLimits.planName}</div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-8">
            <Card>
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
                  <Select value={scheduleType} onValueChange={setScheduleType} required>
                    <SelectTrigger className="bg-white border-2 border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200">
                      <SelectValue placeholder="How should this be scheduled?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="one-off">One-off</SelectItem>
                      <SelectItem value="deadline">Deadline</SelectItem>
                      <SelectItem value="specific_date">Specific Date</SelectItem>
                      <SelectItem value="recurring" disabled={!hasTaskAutomation}>
                        Recurring (Daily/Weekly/Monthly)
                        {!hasTaskAutomation && " 👑 Premium"}
                      </SelectItem>
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
                        <SelectItem value="daily">Daily (Every day including weekends)</SelectItem>
                        <SelectItem value="weekdays">Daily (Weekdays only)</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                    {frequency === "weekdays" && (
                      <p className="text-xs text-gray-600">
                        Tasks will be created Monday through Friday only. Weekends are automatically skipped.
                      </p>
                    )}
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

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="isActive" className="cursor-pointer">
                    Template is active
                  </Label>
                </div>

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
                    disabled={isLoading}
                    style={
                      {
                        backgroundColor: "var(--brand-primary)",
                        color: "white",
                      } as React.CSSProperties
                    }
                    onMouseEnter={(e) => {
                      if (!isLoading) e.currentTarget.style.opacity = "0.9"
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = "1"
                    }}
                    className="font-semibold px-6 py-3 text-base shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? "Saving Changes..." : "Save Changes"}
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

                    {uncategorizedTasks.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-muted-foreground border-b pb-1">General</h4>
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
                      <div className="text-center py-8 text-muted-foreground text-xs">
                        No tasks yet. Click "Add Task" to get started.
                      </div>
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
