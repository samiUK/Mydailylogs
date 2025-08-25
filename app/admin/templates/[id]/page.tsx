"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  CheckSquare,
  Hash,
  Type,
  Camera,
  Users,
} from "lucide-react"
import Link from "next/link"

interface Task {
  id?: string
  name: string
  type: "boolean" | "numeric" | "text" | "photo"
  category: string
  assigned_role: string
  validation: {
    required: boolean
    min?: number
    max?: number
    maxLength?: number
  }
  order_index: number
}

interface Template {
  id: string
  name: string
  description: string
  frequency: string
  is_active: boolean
  organization_id: string
  created_by: string
  created_at: string
  updated_at: string
}

export default function EditTemplatePage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const supabase = createClient()
  const [template, setTemplate] = useState<Template | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    frequency: "daily",
    is_active: true,
  })

  const [tasks, setTasks] = useState<Task[]>([])
  const [teamMembers, setTeamMembers] = useState<Array<{ id: string; full_name: string; role: string }>>([])

  useEffect(() => {
    if (params.id === "new") {
      router.replace("/admin/templates/new")
      return
    }
    loadTemplate()
    loadTeamMembers()
  }, [params.id])

  const loadTemplate = async () => {
    try {
      const { data: templateData, error: templateError } = await supabase
        .from("checklist_templates")
        .select("*")
        .eq("id", params.id)
        .single()

      if (templateError) throw templateError

      const { data: tasksData, error: tasksError } = await supabase
        .from("checklist_items")
        .select("*")
        .eq("template_id", params.id)
        .order("order_index")

      if (tasksError) throw tasksError

      setTemplate(templateData)
      setFormData({
        name: templateData.name || "",
        description: templateData.description || "",
        frequency: templateData.frequency || "daily",
        is_active: templateData.is_active ?? true,
      })

      const formattedTasks: Task[] = tasksData.map((task) => ({
        id: task.id,
        name: task.name || "",
        type: task.task_type || "boolean",
        category: task.category || "General",
        assigned_role: task.assigned_role || "all",
        validation: {
          required: task.validation_rules?.required ?? task.is_required ?? false,
          min: task.validation_rules?.min,
          max: task.validation_rules?.max,
          maxLength: task.validation_rules?.maxLength,
        },
        order_index: task.order_index || 0,
      }))

      setTasks(formattedTasks)
    } catch (error) {
      console.error("Error loading template:", error)
      setError("Failed to load template")
    } finally {
      setLoading(false)
    }
  }

  const loadTeamMembers = async () => {
    try {
      const { data, error } = await supabase.from("profiles").select("id, full_name, role").order("full_name")

      if (error) throw error
      setTeamMembers(data || [])
    } catch (error) {
      console.error("Error loading team members:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")

    try {
      // First update template
      const { error: templateError } = await supabase
        .from("checklist_templates")
        .update({
          name: formData.name,
          description: formData.description,
          frequency: formData.frequency,
          is_active: formData.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq("id", params.id)

      if (templateError) throw templateError

      // This prevents accidentally deleting all tasks if the tasks array is empty
      if (tasks.length > 0) {
        // Delete existing tasks only after we confirm we have new tasks to insert
        const { error: deleteError } = await supabase.from("checklist_items").delete().eq("template_id", params.id)

        if (deleteError) throw deleteError

        // Insert updated tasks
        const tasksToInsert = tasks.map((task) => ({
          template_id: params.id,
          name: task.name,
          task_type: task.type,
          category: task.category,
          assigned_role: task.assigned_role,
          validation_rules: task.validation,
          is_required: task.validation.required,
          order_index: task.order_index,
        }))

        const { error: insertError } = await supabase.from("checklist_items").insert(tasksToInsert)

        if (insertError) throw insertError
      } else {
        // For now, we'll keep existing tasks if the form has no tasks to prevent accidental deletion
        console.log("[v0] No tasks to update, keeping existing tasks")
      }

      router.push("/admin/templates")
    } catch (error) {
      console.error("Error updating template:", error)
      setError("Failed to update template")
    } finally {
      setSaving(false)
    }
  }

  const addTask = () => {
    const newTask: Task = {
      id: undefined, // Will be generated by database
      name: "",
      type: "boolean",
      category: "General",
      assigned_role: "all",
      validation: { required: false },
      order_index: tasks.length,
    }
    setTasks([...tasks, newTask])
  }

  const updateTask = (index: number, updates: Partial<Task>) => {
    const updatedTasks = tasks.map((task, i) => (i === index ? { ...task, ...updates } : task))
    setTasks(updatedTasks)
  }

  const removeTask = (index: number) => {
    const updatedTasks = tasks.filter((_, i) => i !== index).map((task, i) => ({ ...task, order_index: i }))
    setTasks(updatedTasks)
  }

  const moveTask = (index: number, direction: "up" | "down") => {
    const newTasks = [...tasks]
    const targetIndex = direction === "up" ? index - 1 : index + 1

    if ((direction === "up" && index === 0) || (direction === "down" && index === tasks.length - 1)) return
    ;[newTasks[index], newTasks[targetIndex]] = [newTasks[targetIndex], newTasks[index]]

    newTasks.forEach((task, i) => {
      task.order_index = i
    })

    setTasks(newTasks)
  }

  const getTaskIcon = (type: string) => {
    switch (type) {
      case "boolean":
        return <CheckSquare className="w-4 h-4" />
      case "numeric":
        return <Hash className="w-4 h-4" />
      case "text":
        return <Type className="w-4 h-4" />
      case "photo":
        return <Camera className="w-4 h-4" />
      default:
        return <CheckSquare className="w-4 h-4" />
    }
  }

  const getUniqueCategories = () => {
    const categories = tasks.map((task) => task.category).filter(Boolean)
    return Array.from(new Set(categories))
  }

  const getTasksByCategory = (category: string) => {
    return tasks.filter((task) => task.category === category)
  }

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

  if (!template) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-foreground mb-2">Template not found</h2>
        <p className="text-muted-foreground mb-4">The template you're looking for doesn't exist.</p>
        <Link href="/admin/templates">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Templates
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Form */}
      <div className="lg:col-span-2 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/admin/templates">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Edit Template</h1>
            <p className="text-muted-foreground">Update your checklist template and tasks</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>}

          {/* Template Details */}
          <Card>
            <CardHeader>
              <CardTitle>Template Details</CardTitle>
              <CardDescription>Basic information about your checklist template</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Template Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Daily Safety Checklist"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of what this checklist covers..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="frequency">Frequency *</Label>
                  <Select
                    value={formData.frequency}
                    onValueChange={(value) => setFormData({ ...formData, frequency: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2 pt-8">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active">Active Template</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tasks Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Tasks</CardTitle>
                  <CardDescription>Define the tasks that staff will complete</CardDescription>
                </div>
                <Button
                  type="button"
                  onClick={addTask}
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2 h-10 min-h-[44px]"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add New Task
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {tasks.map((task, index) => (
                <div key={task.id || index} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getTaskIcon(task.type)}
                      <span className="font-medium">Task {index + 1}</span>
                      <Badge variant="outline">{task.type}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => moveTask(index, "up")}
                        disabled={index === 0}
                      >
                        <ChevronUp className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => moveTask(index, "down")}
                        disabled={index === tasks.length - 1}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeTask(index)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Task Name *</Label>
                      <Input
                        value={task.name}
                        onChange={(e) => updateTask(index, { name: e.target.value })}
                        placeholder="e.g., Check fire extinguisher"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Type *</Label>
                      <Select value={task.type} onValueChange={(value: any) => updateTask(index, { type: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="boolean">Yes/No</SelectItem>
                          <SelectItem value="numeric">Number</SelectItem>
                          <SelectItem value="text">Text/Notes</SelectItem>
                          <SelectItem value="photo">Photo Upload</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Input
                        value={task.category}
                        onChange={(e) => updateTask(index, { category: e.target.value })}
                        placeholder="e.g., Safety, Maintenance"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Assigned To</Label>
                      <Select
                        value={task.assigned_role}
                        onValueChange={(value) => updateTask(index, { assigned_role: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Staff</SelectItem>
                          <SelectItem value="admin">Admins Only</SelectItem>
                          <SelectItem value="staff">Staff Only</SelectItem>
                          {teamMembers.map((member) => (
                            <SelectItem key={member.id} value={member.id}>
                              {member.full_name} ({member.role})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Validation Options */}
                  <div className="space-y-3 pt-2 border-t">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={task.validation.required}
                        onCheckedChange={(checked) =>
                          updateTask(index, {
                            validation: { ...task.validation, required: checked },
                          })
                        }
                      />
                      <Label>Required Task</Label>
                    </div>

                    {task.type === "numeric" && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Minimum Value</Label>
                          <Input
                            type="number"
                            value={task.validation.min?.toString() || ""}
                            onChange={(e) =>
                              updateTask(index, {
                                validation: {
                                  ...task.validation,
                                  min: e.target.value ? Number(e.target.value) : undefined,
                                },
                              })
                            }
                            placeholder="0"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Maximum Value</Label>
                          <Input
                            type="number"
                            value={task.validation.max?.toString() || ""}
                            onChange={(e) =>
                              updateTask(index, {
                                validation: {
                                  ...task.validation,
                                  max: e.target.value ? Number(e.target.value) : undefined,
                                },
                              })
                            }
                            placeholder="100"
                          />
                        </div>
                      </div>
                    )}

                    {task.type === "text" && (
                      <div className="space-y-2">
                        <Label>Maximum Characters</Label>
                        <Input
                          type="number"
                          value={task.validation.maxLength?.toString() || ""}
                          onChange={(e) =>
                            updateTask(index, {
                              validation: {
                                ...task.validation,
                                maxLength: e.target.value ? Number(e.target.value) : undefined,
                              },
                            })
                          }
                          placeholder="500"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {tasks.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No tasks added yet. Click "Add New Task" to get started.</p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
            <Link href="/admin/templates">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
          </div>
        </form>
      </div>

      {/* Preview Panel */}
      <div className="lg:col-span-1">
        <div className="sticky top-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Preview</CardTitle>
              <CardDescription>How staff will see this checklist</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-foreground">{formData.name || "Template Name"}</h3>
                <p className="text-sm text-muted-foreground">{formData.description || "Template description"}</p>
                <Badge variant="outline" className="mt-2">
                  {formData.frequency}
                </Badge>
              </div>

              {getUniqueCategories().map((category) => (
                <div key={category} className="space-y-2">
                  <h4 className="font-medium text-sm text-foreground border-b pb-1">{category}</h4>
                  {getTasksByCategory(category).map((task, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      {getTaskIcon(task.type)}
                      <span className="flex-1">{task.name || `Task ${index + 1}`}</span>
                      {task.validation.required && (
                        <Badge variant="secondary" className="text-xs">
                          Required
                        </Badge>
                      )}
                      {task.assigned_role !== "all" && <Users className="w-3 h-3 text-muted-foreground" />}
                    </div>
                  ))}
                </div>
              ))}

              {tasks.length === 0 && <p className="text-sm text-muted-foreground italic">No tasks to preview</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
