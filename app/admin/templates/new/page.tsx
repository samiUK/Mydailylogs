"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Plus, Trash2, GripVertical, Eye, EyeOff, Users } from "lucide-react"

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
  const [organizationId, setOrganizationId] = useState<string | null>(null)
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

  useEffect(() => {
    async function getProfile() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single()
        setOrganizationId(profile?.organization_id)
      }
    }
    getProfile()
  }, [])

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!organizationId) return

    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) throw new Error("Not authenticated")

      const templateData = {
        name,
        description,
        frequency: scheduleType === "recurring" ? frequency : scheduleType,
        schedule_type: scheduleType,
        specific_date: scheduleType === "specific_date" ? specificDate : null,
        deadline_date: scheduleType === "deadline" ? deadlineDate : null,
        schedule_time: scheduleTime || null,
        organization_id: organizationId,
        created_by: user.id,
        is_active: true,
      }

      const { data: templateResult, error: templateError } = await supabase
        .from("checklist_templates")
        .insert(templateData)
        .select()
        .single()

      if (templateError) throw templateError

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

        const { error: tasksError } = await supabase.from("checklist_items").insert(tasksToInsert)

        if (tasksError) throw tasksError
      }

      router.push(`/admin/templates`)
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const { categorizedTasks, uncategorizedTasks } = getTasksByCategory()

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Create New Template</h1>
        <p className="text-muted-foreground mt-2">Set up a new checklist template for your team</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Template Details</CardTitle>
                <CardDescription>Basic information about your checklist template</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-2">
                  <Label htmlFor="name">Template Name</Label>
                  <Input
                    id="name"
                    placeholder="Daily Safety Checklist"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe what this checklist covers..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="scheduleType">Schedule Type</Label>
                  <Select value={scheduleType} onValueChange={setScheduleType} required>
                    <SelectTrigger>
                      <SelectValue placeholder="How should this be scheduled?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recurring">Recurring (Daily/Weekly/Monthly)</SelectItem>
                      <SelectItem value="specific_date">Specific Date</SelectItem>
                      <SelectItem value="deadline">Deadline</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {scheduleType === "recurring" && (
                  <div className="grid gap-2">
                    <Label htmlFor="frequency">Frequency</Label>
                    <Select value={frequency} onValueChange={setFrequency} required>
                      <SelectTrigger>
                        <SelectValue placeholder="How often should this be completed?" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {scheduleType === "specific_date" && (
                  <div className="grid gap-2">
                    <Label htmlFor="specificDate">Specific Date</Label>
                    <Input
                      id="specificDate"
                      type="date"
                      value={specificDate}
                      onChange={(e) => setSpecificDate(e.target.value)}
                      required
                      min={new Date().toISOString().split("T")[0]}
                    />
                  </div>
                )}

                {scheduleType === "deadline" && (
                  <div className="grid gap-2">
                    <Label htmlFor="deadlineDate">Deadline Date</Label>
                    <Input
                      id="deadlineDate"
                      type="date"
                      value={deadlineDate}
                      onChange={(e) => setDeadlineDate(e.target.value)}
                      required
                      min={new Date().toISOString().split("T")[0]}
                    />
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
                      />
                      <Button type="button" onClick={addCategory} variant="outline">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {categories.map((category) => (
                        <div key={category} className="flex items-center gap-1 bg-muted px-3 py-1 rounded-full text-sm">
                          {category}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
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
                    <CardDescription>Define the tasks that will be included in this checklist</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {tasks.map((task, index) => (
                      <div key={task.id} className="border rounded-lg p-4 space-y-4">
                        <div className="flex items-center gap-2">
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium text-muted-foreground">Task {index + 1}</span>
                          <div className="ml-auto flex gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => moveTask(task.id, "up")}
                              disabled={index === 0}
                            >
                              ↑
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => moveTask(task.id, "down")}
                              disabled={index === tasks.length - 1}
                            >
                              ↓
                            </Button>
                            <Button type="button" variant="ghost" size="sm" onClick={() => removeTask(task.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Task Name</Label>
                            <Input
                              placeholder="e.g., Check fire extinguisher"
                              value={task.name}
                              onChange={(e) => updateTask(task.id, { name: e.target.value })}
                              required
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Type</Label>
                            <Select
                              value={task.type}
                              onValueChange={(value: Task["type"]) => updateTask(task.id, { type: value })}
                            >
                              <SelectTrigger>
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
                              <SelectTrigger>
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
                              <SelectTrigger>
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
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    <Button type="button" variant="outline" onClick={addTask} className="w-full bg-transparent">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Task
                    </Button>
                  </CardContent>
                </Card>

                {error && <p className="text-sm text-red-500">{error}</p>}

                <div className="flex gap-4">
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Creating..." : "Create Template"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => router.back()}>
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
                <CardDescription>How staff will see this checklist</CardDescription>
              </CardHeader>
              {showPreview && (
                <CardContent className="space-y-4">
                  <div className="border rounded-lg p-3 bg-muted/50">
                    <h3 className="font-semibold text-sm">{name || "Template Name"}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{description || "Template description"}</p>
                    <div className="flex items-center gap-1 mt-2">
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                        {scheduleType === "recurring" && (frequency || "Frequency")}
                        {scheduleType === "specific_date" && `Due: ${specificDate || "Select date"}`}
                        {scheduleType === "deadline" && `Deadline: ${deadlineDate || "Select deadline"}`}
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
