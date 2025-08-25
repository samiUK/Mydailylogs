"use client"

import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Camera, FileText, Hash, CheckSquare, Check, X } from "lucide-react"

interface ChecklistTask {
  id: string
  name: string
  description: string
  task_type: "boolean" | "numeric" | "text" | "photo"
  category: string
  validation_rules: any
  is_required: boolean
  order_index: number
}

interface TaskResponse {
  id: string
  item_id: string
  is_completed: boolean
  notes: string
  completed_at: string
  updated_at: string
  response_value: string
}

interface Template {
  id: string
  name: string
  description: string
  frequency: string
}

interface DailyChecklist {
  id: string
  template_id: string
  assigned_to: string
  date: string
  status: string
  completed_at: string | null
}

export default function ChecklistPage({ params }: { params: { id: string } }) {
  const [template, setTemplate] = useState<Template | null>(null)
  const [dailyChecklist, setDailyChecklist] = useState<DailyChecklist | null>(null)
  const [tasks, setTasks] = useState<ChecklistTask[]>([])
  const [responses, setResponses] = useState<TaskResponse[]>([])
  const [localInputValues, setLocalInputValues] = useState<Record<string, string>>({})
  const [localNotes, setLocalNotes] = useState<Record<string, string>>({})
  const [globalNotes, setGlobalNotes] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, File[]>>({})
  const [uploading, setUploading] = useState<Record<string, boolean>>({})
  const router = useRouter()

  const compressImage = (file: File, targetSizeKB = 15): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      const img = new Image()

      img.onload = () => {
        let { width, height } = img
        const maxDimension = 400

        if (width > height) {
          if (width > maxDimension) {
            height = (height * maxDimension) / width
            width = maxDimension
          }
        } else {
          if (height > maxDimension) {
            width = (width * maxDimension) / height
            height = maxDimension
          }
        }

        canvas.width = width
        canvas.height = height
        ctx?.drawImage(img, 0, 0, width, height)

        let quality = 0.8
        const tryCompress = () => {
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const sizeKB = blob.size / 1024
                if (sizeKB <= targetSizeKB || quality <= 0.1) {
                  const compressedFile = new File([blob], file.name, {
                    type: "image/jpeg",
                    lastModified: Date.now(),
                  })
                  console.log(
                    `[v0] Compressed ${file.name}: ${(file.size / 1024).toFixed(1)}KB → ${(compressedFile.size / 1024).toFixed(1)}KB`,
                  )
                  resolve(compressedFile)
                } else {
                  quality -= 0.1
                  tryCompress()
                }
              }
            },
            "image/jpeg",
            quality,
          )
        }
        tryCompress()
      }
      img.src = URL.createObjectURL(file)
    })
  }

  const handleFileUpload = async (taskId: string, files: FileList | null) => {
    if (!files || files.length === 0) return

    setUploading((prev) => ({ ...prev, [taskId]: true }))

    try {
      const fileArray = Array.from(files)
      const compressedFiles = await Promise.all(
        fileArray.map(async (file) => {
          if (file.type.startsWith("image/")) {
            return await compressImage(file)
          }
          return file
        }),
      )

      setUploadedFiles((prev) => ({
        ...prev,
        [taskId]: [...(prev[taskId] || []), ...compressedFiles],
      }))

      const fileNames = compressedFiles.map((file) => file.name)
      const allFileNames = [...(localInputValues[taskId]?.split(",") || []), ...fileNames].filter(Boolean)
      const value = allFileNames.join(",")

      setLocalInputValues((prev) => ({ ...prev, [taskId]: value }))
      handleTaskResponse(taskId, value, true)
    } catch (error) {
      console.error("[v0] Error handling file upload:", error)
    } finally {
      setUploading((prev) => ({ ...prev, [taskId]: false }))
    }
  }

  const removeFile = (taskId: string, fileIndex: number) => {
    setUploadedFiles((prev) => {
      const newFiles = [...(prev[taskId] || [])]
      newFiles.splice(fileIndex, 1)
      return { ...prev, [taskId]: newFiles }
    })

    const currentFiles = localInputValues[taskId]?.split(",") || []
    currentFiles.splice(fileIndex, 1)
    const value = currentFiles.filter(Boolean).join(",")

    setLocalInputValues((prev) => ({ ...prev, [taskId]: value }))
    handleTaskResponse(taskId, value, !!value)
  }

  useEffect(() => {
    async function loadChecklist() {
      console.log("[v0] Loading checklist for template ID:", params.id)
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        console.log("[v0] No user found")
        return
      }

      console.log("[v0] User found:", user.id)

      // Check if user has access to this template
      const { data: assignmentData } = await supabase
        .from("template_assignments")
        .select(`
          *,
          checklist_templates:template_id(
            id,
            name,
            description,
            frequency
          )
        `)
        .eq("template_id", params.id)
        .eq("assigned_to", user.id)
        .eq("is_active", true)
        .single()

      console.log("[v0] Assignment data:", assignmentData)

      if (assignmentData?.checklist_templates) {
        const templateData = assignmentData.checklist_templates
        setTemplate(templateData)
        console.log("[v0] Template loaded:", templateData)

        let dailyChecklistData = null
        if (templateData.frequency === "daily") {
          const today = new Date().toISOString().split("T")[0] // YYYY-MM-DD format
          console.log("[v0] Daily template detected, checking for today's instance:", today)

          // Check if today's daily checklist already exists
          const { data: existingDaily } = await supabase
            .from("daily_checklists")
            .select("*")
            .eq("template_id", params.id)
            .eq("assigned_to", user.id)
            .eq("date", today)
            .single()

          console.log("[v0] Existing daily checklist:", existingDaily)

          if (existingDaily) {
            dailyChecklistData = existingDaily
            console.log("[v0] Using existing daily checklist")
          } else {
            // Create new daily checklist for today
            console.log("[v0] Creating new daily checklist for today")
            const { data: newDaily, error: dailyError } = await supabase
              .from("daily_checklists")
              .insert({
                template_id: params.id,
                assigned_to: user.id,
                date: today,
                status: "in_progress",
                organization_id: assignmentData.organization_id,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .select()
              .single()

            if (dailyError) {
              console.error("[v0] Error creating daily checklist:", dailyError)
            } else {
              dailyChecklistData = newDaily
              console.log("[v0] Created new daily checklist:", newDaily)
            }
          }

          setDailyChecklist(dailyChecklistData)
        }

        // Load tasks
        const { data: tasksData } = await supabase
          .from("checklist_items")
          .select("*")
          .eq("template_id", params.id)
          .order("order_index")

        console.log("[v0] Tasks loaded:", tasksData?.length)
        if (tasksData) {
          setTasks(tasksData)
        }

        const checklistId = dailyChecklistData?.id || params.id
        console.log("[v0] Loading responses for checklist ID:", checklistId)

        const { data: responsesData } = await supabase
          .from("checklist_responses")
          .select("*")
          .eq("checklist_id", checklistId)

        console.log("[v0] Responses loaded:", responsesData?.length)
        if (responsesData) {
          setResponses(responsesData)
          const initialInputValues: Record<string, string> = {}
          const initialNotes: Record<string, string> = {}

          responsesData.forEach((response) => {
            if (response.notes) {
              initialNotes[response.item_id] = response.notes
            }
            if (response.response_value) {
              initialInputValues[response.item_id] = response.response_value
            }
          })

          setLocalInputValues(initialInputValues)
          setLocalNotes(initialNotes)
        }
      }

      setIsLoading(false)
    }

    loadChecklist()
  }, [params.id])

  const handleTaskResponse = async (taskId: string, value: string, isCompleted = true) => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    const existingResponse = responses.find((r) => r.item_id === taskId)
    const checklistId = dailyChecklist?.id || params.id

    if (existingResponse) {
      const { data } = await supabase
        .from("checklist_responses")
        .update({
          response_value: value,
          is_completed: isCompleted,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingResponse.id)
        .select()
        .single()

      if (data) {
        setResponses((prev) => prev.map((r) => (r.id === data.id ? data : r)))
      }
    } else {
      // Create new response
      const { data } = await supabase
        .from("checklist_responses")
        .insert({
          checklist_id: checklistId,
          item_id: taskId,
          response_value: value,
          is_completed: isCompleted,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (data) {
        setResponses((prev) => [...prev, data])
      }
    }
  }

  const handleTaskNotes = async (taskId: string, notes: string) => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    setLocalNotes((prev) => ({ ...prev, [taskId]: notes }))

    const existingResponse = responses.find((r) => r.item_id === taskId)
    const checklistId = dailyChecklist?.id || params.id

    if (existingResponse) {
      const { data } = await supabase
        .from("checklist_responses")
        .update({ notes, updated_at: new Date().toISOString() })
        .eq("id", existingResponse.id)
        .select()
        .single()

      if (data) {
        setResponses((prev) => prev.map((r) => (r.id === data.id ? data : r)))
      }
    } else {
      // Create new response with notes
      const { data } = await supabase
        .from("checklist_responses")
        .insert({
          checklist_id: checklistId,
          item_id: taskId,
          notes,
          is_completed: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (data) {
        setResponses((prev) => [...prev, data])
      }
    }
  }

  const handleMarkCompleted = async (taskId: string) => {
    console.log("[v0] Mark completed button clicked for task:", taskId)

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      console.log("[v0] No user found")
      return
    }

    console.log("[v0] User found:", user.id)

    const existingResponse = responses.find((r) => r.item_id === taskId)
    const currentValue = localInputValues[taskId] ?? ""
    const task = tasks.find((t) => t.id === taskId)
    const checklistId = dailyChecklist?.id || params.id

    console.log("[v0] Existing response:", existingResponse)
    console.log("[v0] Current value:", currentValue)
    console.log("[v0] Task:", task)
    console.log("[v0] Checklist ID:", checklistId)

    try {
      if (existingResponse) {
        console.log("[v0] Updating existing response")
        const { data, error } = await supabase
          .from("checklist_responses")
          .update({
            is_completed: !existingResponse.is_completed,
            completed_at: existingResponse.is_completed ? null : new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingResponse.id)
          .select()
          .single()

        if (error) {
          console.log("[v0] Error updating response:", error)
          return
        }

        console.log("[v0] Updated response:", data)
        if (data) {
          setResponses((prev) => prev.map((r) => (r.id === data.id ? data : r)))
        }
      } else {
        console.log("[v0] Creating new response for daily checklist")
        const { data, error } = await supabase
          .from("checklist_responses")
          .insert({
            checklist_id: checklistId,
            item_id: taskId,
            is_completed: true,
            completed_at: new Date().toISOString(),
            notes: localNotes[taskId] || "",
            response_value: currentValue,
          })
          .select()
          .single()

        if (error) {
          console.log("[v0] Error creating response:", error)
          return
        }

        console.log("[v0] Created response:", data)
        if (data) {
          setResponses((prev) => [...prev, data])
        }
      }

      console.log("[v0] Mark completed successful")
    } catch (error) {
      console.log("[v0] Exception in mark completed:", error)
    }
  }

  const renderTaskInput = (task: ChecklistTask) => {
    const response = responses.find((r) => r.item_id === task.id)
    const currentValue = localInputValues[task.id] ?? ""

    switch (task.task_type) {
      case "boolean":
        return (
          <div className="space-y-3">
            <Select
              value={currentValue}
              onValueChange={(value) => {
                setLocalInputValues((prev) => ({ ...prev, [task.id]: value }))
                handleTaskResponse(task.id, value)
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Yes or No" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Yes</SelectItem>
                <SelectItem value="false">No</SelectItem>
              </SelectContent>
            </Select>
            {currentValue && (
              <Badge variant={currentValue === "true" ? "default" : "secondary"} className="text-xs">
                {currentValue === "true" ? "Yes" : "No"}
              </Badge>
            )}
          </div>
        )

      case "numeric":
        const validation = task.validation_rules || {}
        return (
          <div className="space-y-2">
            <Input
              type="number"
              placeholder={`Enter number${validation.min ? ` (min: ${validation.min})` : ""}${validation.max ? ` (max: ${validation.max})` : ""}`}
              value={currentValue}
              onChange={(e) => {
                const value = e.target.value
                console.log("[v0] Numeric input changed:", value)
                setLocalInputValues((prev) => ({ ...prev, [task.id]: value }))
                handleTaskResponse(task.id, value, !!value)
              }}
              onBlur={() => {
                if (currentValue) {
                  handleTaskResponse(task.id, currentValue, true)
                }
              }}
            />
            {validation.min && validation.max && (
              <p className="text-xs text-muted-foreground">
                Range: {validation.min} - {validation.max}
              </p>
            )}
          </div>
        )

      case "text":
        const textValidation = task.validation_rules || {}
        return (
          <div className="space-y-2">
            <Textarea
              placeholder={`Enter text${textValidation.maxLength ? ` (max ${textValidation.maxLength} characters)` : ""}`}
              value={currentValue}
              maxLength={textValidation.maxLength}
              onChange={(e) => {
                const value = e.target.value
                setLocalInputValues((prev) => ({ ...prev, [task.id]: value }))
                handleTaskResponse(task.id, value, !!value)
              }}
              rows={3}
            />
            {textValidation.maxLength && (
              <p className="text-xs text-muted-foreground">
                {currentValue.length}/{textValidation.maxLength} characters
              </p>
            )}
          </div>
        )

      case "photo":
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-center w-full">
              <label
                htmlFor={`photo-${task.id}`}
                className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Camera className="w-8 h-8 mb-2 text-gray-400" />
                  <p className="mb-2 text-sm text-gray-500">
                    <span className="font-semibold">Click to upload photos</span>
                  </p>
                  <p className="text-xs text-gray-500">PNG, JPG, JPEG (Auto-compressed to ~15KB)</p>
                </div>
                <input
                  id={`photo-${task.id}`}
                  type="file"
                  className="hidden"
                  accept="image/*"
                  multiple
                  capture="environment"
                  onChange={(e) => handleFileUpload(task.id, e.target.files)}
                />
              </label>
            </div>

            {uploadedFiles[task.id] && uploadedFiles[task.id].length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {uploadedFiles[task.id].map((file, index) => (
                  <div key={index} className="relative">
                    <img
                      src={URL.createObjectURL(file) || "/placeholder.svg"}
                      alt={`Upload ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg border"
                    />
                    <button
                      type="button"
                      onClick={() => removeFile(task.id, index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <p className="text-xs text-gray-500 mt-1 truncate">{file.name}</p>
                  </div>
                ))}
              </div>
            )}

            {uploading[task.id] && <div className="text-sm text-blue-600">Compressing photos...</div>}
            {currentValue && (
              <p className="text-xs text-green-600">Photos uploaded: {currentValue.split(",").length} file(s)</p>
            )}
          </div>
        )

      default:
        return null
    }
  }

  const getTaskIcon = (taskType: string) => {
    switch (taskType) {
      case "boolean":
        return <CheckSquare className="w-4 h-4" />
      case "numeric":
        return <Hash className="w-4 h-4" />
      case "text":
        return <FileText className="w-4 h-4" />
      case "photo":
        return <Camera className="w-4 h-4" />
      default:
        return <CheckSquare className="w-4 h-4" />
    }
  }

  const handleCompleteChecklist = async () => {
    console.log("[v0] Complete Checklist button clicked")
    setIsSaving(true)

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      console.log("[v0] No user found for checklist completion")
      setIsSaving(false)
      return
    }

    console.log("[v0] User found for completion:", user.id)
    console.log("[v0] Template ID:", params.id)

    // Check if all required tasks are completed
    const requiredTasks = tasks.filter((task) => task.is_required)
    const completedRequiredTasks = requiredTasks.filter((task) => {
      const response = responses.find((r) => r.item_id === task.id)
      return response?.is_completed
    })

    console.log("[v0] Required tasks:", requiredTasks.length)
    console.log("[v0] Completed required tasks:", completedRequiredTasks.length)

    if (completedRequiredTasks.length < requiredTasks.length) {
      console.log("[v0] Not all required tasks completed")
      alert("Please complete all required tasks before submitting.")
      setIsSaving(false)
      return
    }

    try {
      if (template?.frequency === "daily" && dailyChecklist) {
        console.log("[v0] Completing daily checklist instance")
        const { data: dailyUpdateData, error: dailyError } = await supabase
          .from("daily_checklists")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", dailyChecklist.id)
          .select()

        if (dailyError) {
          console.error("[v0] Database error updating daily checklist:", dailyError)
          alert(`Database error completing checklist: ${dailyError.message}. Please try again.`)
          setIsSaving(false)
          return
        }

        console.log("[v0] Daily checklist completed successfully:", dailyUpdateData)
      } else {
        console.log("[v0] Updating template assignment to completed")
        const { data: updateData, error: assignmentError } = await supabase
          .from("template_assignments")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("template_id", params.id)
          .eq("assigned_to", user.id)
          .eq("is_active", true)
          .select()

        if (assignmentError) {
          console.error("[v0] Database error updating assignment:", assignmentError)
          alert(`Database error completing checklist: ${assignmentError.message}. Please try again.`)
          setIsSaving(false)
          return
        }

        if (!updateData || updateData.length === 0) {
          console.error("[v0] No template assignment found to update")
          alert("Error: Could not update assignment. Please contact support.")
          setIsSaving(false)
          return
        }

        console.log("[v0] Template assignment updated successfully")
      }

      // Create a completion notification for admin
      const { error: notificationError } = await supabase.from("notifications").insert({
        user_id: user.id,
        template_id: params.id,
        type: "checklist_completed",
        message: `${user.email} submitted a report: ${template?.name}`,
        created_at: new Date().toISOString(),
      })

      if (notificationError) {
        console.log("[v0] Note: Could not create notification:", notificationError)
      } else {
        console.log("[v0] Notification created successfully")
      }

      console.log("[v0] Checklist completion process finished successfully")
      alert("Report submitted successfully!")
      router.push("/staff")
    } catch (error) {
      console.error("[v0] Exception in checklist completion:", error)
      alert("Error submitting report. Please try again.")
    }

    setIsSaving(false)
  }

  if (isLoading) {
    return <div className="flex justify-center py-8">Loading...</div>
  }

  if (!template) {
    return <div className="text-center py-8">Template not found or not assigned to you</div>
  }

  const completedTasks = responses.filter((r) => r.is_completed).length
  const totalTasks = tasks.length
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

  const tasksByCategory = tasks.reduce(
    (acc, task) => {
      const category = task.category || "General"
      if (!acc[category]) acc[category] = []
      acc[category].push(task)
      return acc
    },
    {} as Record<string, ChecklistTask[]>,
  )

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">{template.name}</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-2">{template.description}</p>
          <Badge variant="outline" className="mt-2 text-xs">
            {template.frequency}
          </Badge>
        </div>

        <div className="space-y-2">
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground">
            {completedTasks} of {totalTasks} tasks completed ({Math.round(progress)}%)
          </p>
        </div>
      </div>

      <div className="space-y-4 md:space-y-6">
        {Object.entries(tasksByCategory).map(([category, categoryTasks]) => (
          <div key={category} className="space-y-3">
            <h2 className="text-lg md:text-xl font-semibold text-foreground">{category}</h2>
            <div className="space-y-3 md:space-y-4">
              {categoryTasks.map((task) => {
                const response = responses.find((r) => r.item_id === task.id)
                const isCompleted = response?.is_completed
                const hasValue = !!localInputValues[task.id]

                return (
                  <Card key={task.id} className={`${isCompleted ? "bg-green-50 border-green-200" : ""} shadow-sm`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start space-x-3">
                        <div className="mt-1 flex-shrink-0">{getTaskIcon(task.task_type)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <CardTitle
                              className={`text-base md:text-lg ${isCompleted ? "line-through text-muted-foreground" : ""}`}
                            >
                              {task.name}
                            </CardTitle>
                            {task.is_required && (
                              <Badge variant="destructive" className="text-xs">
                                Required
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {task.task_type}
                            </Badge>
                          </div>
                          <CardDescription
                            className={`text-sm ${isCompleted ? "line-through text-muted-foreground" : ""}`}
                          >
                            {task.description}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>{renderTaskInput(task)}</div>

                      <div>
                        <Label htmlFor={`notes-${task.id}`} className="text-sm font-medium">
                          Notes (optional)
                        </Label>
                        <Textarea
                          id={`notes-${task.id}`}
                          placeholder="Add any notes or observations..."
                          value={localNotes[task.id] || ""}
                          onChange={(e) => handleTaskNotes(task.id, e.target.value)}
                          className="mt-1"
                          rows={2}
                        />
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t">
                        <div className="flex items-center gap-2">
                          {isCompleted && (
                            <Badge variant="default" className="text-xs">
                              <Check className="w-3 h-3 mr-1" />
                              Completed
                            </Badge>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant={isCompleted ? "outline" : "default"}
                          onClick={() => {
                            console.log("[v0] Mark completed button clicked for task:", task.id)
                            handleMarkCompleted(task.id)
                          }}
                          className="text-xs"
                        >
                          {isCompleted ? "Completed ✓" : "Mark as Completed"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {progress === 100 && (
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
          <Button onClick={handleCompleteChecklist} disabled={isSaving} size="lg" className="flex-1">
            {isSaving ? "Submitting..." : "Submit Report"}
          </Button>
          <Button variant="outline" onClick={() => router.push("/staff")} size="lg" className="flex-1 sm:flex-none">
            Back to Tasks
          </Button>
        </div>
      )}

      {progress < 100 && (
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
          <div className="text-center text-muted-foreground">
            Complete all tasks to finish this report ({Math.round(progress)}% done)
          </div>
          <Button variant="outline" onClick={() => router.push("/staff")} size="lg" className="flex-1 sm:flex-none">
            Back to Tasks
          </Button>
        </div>
      )}
    </div>
  )
}
