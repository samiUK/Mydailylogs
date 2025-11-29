"use client"

import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Camera, FileText, Hash, CheckSquare, Check, X, Lock } from "lucide-react"
import { getSubscriptionLimits } from "@/lib/subscription-limits"
import Link from "next/link"

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

export default function ChecklistPage({ params }: { params: Promise<{ id: string }> }) {
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
  const [hasPhotoUpload, setHasPhotoUpload] = useState(false)
  const [checklistId, setChecklistId] = useState<string | null>(null)
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const compressImage = (file: File, targetSizeKB = 200): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      const img = new Image()

      img.onload = () => {
        let { width, height } = img
        const maxDimension = 800

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

  const loadChecklist = async () => {
    try {
      setIsLoading(true)

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("user_id", user.id)
        .single()

      if (!profile) throw new Error("Profile not found")

      setOrganizationId(profile.organization_id)

      const limits = await getSubscriptionLimits(profile.organization_id)
      setHasPhotoUpload(limits.hasPhotoUpload)

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
        .eq("template_id", checklistId)
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
            .eq("template_id", checklistId)
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
                template_id: checklistId,
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
          .eq("template_id", checklistId)
          .order("order_index")

        console.log("[v0] Tasks loaded:", tasksData?.length)
        if (tasksData) {
          setTasks(tasksData)
        }

        const checklistIdForResponses = dailyChecklist?.id || checklistId
        console.log("[v0] Loading responses for checklist ID:", checklistIdForResponses)

        const { data: responsesData } = await supabase
          .from("checklist_responses")
          .select("*")
          .eq("checklist_id", checklistIdForResponses)

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
    } catch (error) {
      console.error("[v0] Error loading checklist:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleTaskResponse = async (taskId: string, value: string, isCompleted = true) => {
    try {
      const { data } = await supabase
        .from("checklist_responses")
        .upsert({
          checklist_id: dailyChecklist?.id || checklistId,
          item_id: taskId,
          response_value: value,
          is_completed: isCompleted,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (data) {
        setResponses((prev) => prev.map((r) => (r.id === data.id ? data : r)))
      }
    } catch (error) {
      console.error("[v0] Error handling task response:", error)
    }
  }

  const handleTaskNotes = async (taskId: string, notes: string) => {
    try {
      setLocalNotes((prev) => ({ ...prev, [taskId]: notes }))

      const { data } = await supabase
        .from("checklist_responses")
        .upsert({
          checklist_id: dailyChecklist?.id || checklistId,
          item_id: taskId,
          notes,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (data) {
        setResponses((prev) => prev.map((r) => (r.id === data.id ? data : r)))
      }
    } catch (error) {
      console.error("[v0] Error handling task notes:", error)
    }
  }

  const handleMarkCompleted = async (taskId: string) => {
    console.log("[v0] Mark completed button clicked for task:", taskId)

    try {
      const { data } = await supabase
        .from("checklist_responses")
        .upsert({
          checklist_id: dailyChecklist?.id || checklistId,
          item_id: taskId,
          is_completed: !responses.some((r) => r.item_id === taskId && r.is_completed),
          completed_at: responses.some((r) => r.item_id === taskId && r.is_completed) ? null : new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (data) {
        setResponses((prev) => prev.map((r) => (r.id === data.id ? data : r)))
      }
    } catch (error) {
      console.error("[v0] Exception in mark completed:", error)
    }
  }

  const renderTaskInput = (task: ChecklistTask) => {
    const response = responses.find((r) => r.item_id === task.id)
    const currentValue = localInputValues[task.id] ?? ""

    switch (task.task_type) {
      case "boolean":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant={currentValue === "true" ? "default" : "outline"}
                size="lg"
                className="h-14 text-lg font-semibold shadow-md border-2"
                onClick={() => {
                  setLocalInputValues((prev) => ({ ...prev, [task.id]: "true" }))
                  handleTaskResponse(task.id, "true")
                }}
              >
                <Check className="w-6 h-6 mr-2" />
                Yes
              </Button>
              <Button
                type="button"
                variant={currentValue === "false" ? "default" : "outline"}
                size="lg"
                className="h-14 text-lg font-semibold shadow-md border-2"
                onClick={() => {
                  setLocalInputValues((prev) => ({ ...prev, [task.id]: "false" }))
                  handleTaskResponse(task.id, "false")
                }}
              >
                <X className="w-6 h-6 mr-2" />
                No
              </Button>
            </div>
            {currentValue && (
              <Badge variant={currentValue === "true" ? "default" : "secondary"} className="text-sm px-3 py-1">
                {currentValue === "true" ? "✓ Yes" : "✗ No"}
              </Badge>
            )}
          </div>
        )

      case "numeric":
        const validation = task.validation_rules || {}
        return (
          <div className="space-y-3">
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
              className="h-14 text-lg border-2 shadow-md focus:ring-4 focus:ring-blue-200"
            />
            {validation.min && validation.max && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm font-medium text-blue-800">
                  Valid range: {validation.min} - {validation.max}
                </p>
              </div>
            )}
          </div>
        )

      case "text":
        const textValidation = task.validation_rules || {}
        return (
          <div className="space-y-3">
            <Textarea
              placeholder={`Enter text${textValidation.maxLength ? ` (max ${textValidation.maxLength} characters)` : ""}`}
              value={currentValue}
              maxLength={textValidation.maxLength}
              onChange={(e) => {
                const value = e.target.value
                setLocalInputValues((prev) => ({ ...prev, [task.id]: value }))
                handleTaskResponse(task.id, value, !!value)
              }}
              rows={4}
              className="text-lg border-2 shadow-md focus:ring-4 focus:ring-blue-200 min-h-[100px]"
            />
            {textValidation.maxLength && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-sm font-medium text-gray-700">
                  {currentValue.length}/{textValidation.maxLength} characters
                </p>
              </div>
            )}
          </div>
        )

      case "photo":
        return (
          <div key={task.id} className="space-y-4 pb-8 border-b-2 border-dashed border-gray-300">
            <h3 className="text-lg font-semibold text-gray-800">{task.name}</h3>

            {!hasPhotoUpload ? (
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Lock className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="space-y-2">
                      <p className="font-medium text-amber-900">Photo Upload - Premium Feature</p>
                      <p className="text-sm text-amber-800">
                        Upgrade to Growth or Scale plan to upload photos with your reports. Photo uploads help document
                        work completion with visual evidence.
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-amber-300 text-amber-900 hover:bg-amber-100 bg-transparent"
                        asChild
                      >
                        <Link href="/admin/profile/billing">Upgrade Plan</Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="flex items-center justify-center w-full">
                  <label
                    htmlFor={`photo-${task.id}`}
                    className="flex flex-col items-center justify-center w-full h-40 border-3 border-blue-300 border-dashed rounded-xl cursor-pointer bg-blue-50 hover:bg-blue-100 shadow-lg transition-all duration-200"
                  >
                    <div className="flex flex-col items-center justify-center pt-6 pb-6">
                      <Camera className="w-12 h-12 mb-3 text-blue-500" />
                      <p className="mb-2 text-lg font-semibold text-blue-700">Tap to Take Photo</p>
                      <p className="text-sm text-blue-600">Photos auto-compressed for faster upload</p>
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {uploadedFiles[task.id].map((file, index) => (
                      <div key={index} className="relative bg-white rounded-lg border-2 border-gray-200 shadow-md">
                        <img
                          src={URL.createObjectURL(file) || "/placeholder.svg"}
                          alt={`Upload ${index + 1}`}
                          className="w-full h-32 object-cover rounded-t-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removeFile(task.id, index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 shadow-lg"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <div className="p-2">
                          <p className="text-sm font-medium text-gray-700 truncate">{file.name}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {uploading[task.id] && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="text-lg font-medium text-blue-700">📸 Processing photos...</div>
                  </div>
                )}
                {currentValue && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-sm font-medium text-green-700">
                      ✓ {currentValue.split(",").length} photo(s) uploaded
                    </p>
                  </div>
                )}
              </>
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

    try {
      const reportData = tasks.map((task) => {
        const response = responses.find((r) => r.item_id === task.id)
        return {
          task_name: task.name,
          task_description: task.description,
          response_value: response?.response_value || "",
          notes: response?.notes || "",
          is_completed: response?.is_completed || false,
          completed_at: response?.completed_at || null,
        }
      })

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
          .eq("template_id", checklistId)
          .eq("assigned_to", (await supabase.auth.getUser()).data.user.id)
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

      const { data: submittedReport, error: submittedReportError } = await supabase
        .from("submitted_reports")
        .insert({
          template_name: template?.name || "Untitled Report",
          template_description: template?.description || "",
          submitted_by: (await supabase.auth.getUser()).data.user.id,
          organization_id: organizationId,
          report_data: reportData,
          status: "completed",
          submitted_at: new Date().toISOString(),
        })
        .select()

      if (submittedReportError) {
        console.error("[v0] Error creating submitted_reports entry:", submittedReportError)
      } else {
        console.log("[v0] Submitted report entry created successfully:", submittedReport)
      }

      // Create a completion notification for admin
      const { error: notificationError } = await supabase.from("notifications").insert({
        user_id: (await supabase.auth.getUser()).data.user.id,
        template_id: checklistId,
        type: "checklist_completed",
        message: `${(await supabase.auth.getUser()).data.user.email} submitted a report: ${template?.name}`,
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

  useEffect(() => {
    const resolveParams = async () => {
      const resolvedParams = await params
      setChecklistId(resolvedParams.id)
    }
    resolveParams()
  }, [params])

  useEffect(() => {
    if (checklistId) {
      loadChecklist()
    }
  }, [checklistId])

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    )
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
    <div className="min-h-screen bg-background p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4 md:space-y-6">
      <div className="space-y-3 sm:space-y-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">{template.name}</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">{template.description}</p>
          <Badge variant="outline" className="mt-2 text-xs">
            {template.frequency}
          </Badge>
        </div>

        <div className="space-y-2">
          <div className="w-full bg-muted rounded-full h-2.5 sm:h-2">
            <div
              className="bg-primary h-2.5 sm:h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground font-medium">
            {completedTasks} of {totalTasks} tasks completed ({Math.round(progress)}%)
          </p>
        </div>
      </div>

      <div className="space-y-3 sm:space-y-4 md:space-y-6">
        {Object.entries(tasksByCategory).map(([category, categoryTasks]) => (
          <div key={category} className="space-y-2 sm:space-y-3">
            <h2 className="text-base sm:text-lg md:text-xl font-semibold text-foreground">{category}</h2>
            <div className="space-y-3 md:space-y-4">
              {categoryTasks.map((task) => {
                const response = responses.find((r) => r.item_id === task.id)
                const isCompleted = response?.is_completed
                const hasValue = !!localInputValues[task.id]

                return (
                  <Card
                    key={task.id}
                    className={`${isCompleted ? "bg-green-50 border-green-300 shadow-lg" : "bg-white border-gray-300 shadow-md"} border-2 transition-all duration-200`}
                  >
                    <CardHeader className="pb-3 sm:pb-4">
                      <div className="flex items-start space-x-3 sm:space-x-4">
                        <div className="mt-1 flex-shrink-0 p-1.5 sm:p-2 rounded-full bg-gray-100">
                          {getTaskIcon(task.task_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                            <CardTitle
                              className={`text-base sm:text-lg md:text-xl font-bold ${isCompleted ? "line-through text-gray-500" : "text-gray-900"}`}
                            >
                              {task.name}
                            </CardTitle>
                            {task.is_required && (
                              <Badge
                                variant="destructive"
                                className="text-xs sm:text-sm px-2 sm:px-3 py-0.5 sm:py-1 font-semibold"
                              >
                                Required
                              </Badge>
                            )}
                          </div>
                          <CardDescription
                            className={`text-sm sm:text-base ${isCompleted ? "line-through text-gray-500" : "text-gray-700"}`}
                          >
                            {task.description}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4 sm:space-y-6">
                      <div>{renderTaskInput(task)}</div>

                      <div className="space-y-2">
                        <Label
                          htmlFor={`notes-${task.id}`}
                          className="text-sm sm:text-base font-semibold text-gray-900"
                        >
                          Additional Notes (optional)
                        </Label>
                        <Textarea
                          id={`notes-${task.id}`}
                          placeholder="Add any notes or observations..."
                          value={localNotes[task.id] || ""}
                          onChange={(e) => handleTaskNotes(task.id, e.target.value)}
                          className="text-base sm:text-lg border-2 shadow-md focus:ring-4 focus:ring-blue-200 min-h-[80px] touch-manipulation"
                          rows={3}
                        />
                      </div>

                      <div className="flex justify-between items-center pt-3 sm:pt-4 border-t-2 border-gray-200">
                        <div className="flex items-center gap-2">
                          {isCompleted && (
                            <Badge
                              variant="default"
                              className="text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 font-semibold bg-green-600"
                            >
                              <Check className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                              Completed
                            </Badge>
                          )}
                        </div>
                        <Button
                          size="lg"
                          variant={isCompleted ? "outline" : "default"}
                          onClick={() => {
                            console.log("[v0] Mark completed button clicked for task:", task.id)
                            handleMarkCompleted(task.id)
                          }}
                          className="h-11 sm:h-12 px-4 sm:px-6 text-sm sm:text-base font-semibold shadow-md border-2 touch-manipulation"
                        >
                          {isCompleted ? "✓ Completed" : "Mark Complete"}
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
        <div className="sticky bottom-3 sm:bottom-4 z-10">
          <Card className="bg-green-50 border-green-300 border-2 shadow-xl">
            <CardContent className="pt-4 sm:pt-6 pb-4 sm:pb-6">
              <div className="text-center space-y-3 sm:space-y-4">
                <div className="text-base sm:text-lg font-semibold text-green-800">
                  🎉 All tasks completed! Ready to submit your report.
                </div>
                <Button
                  onClick={handleCompleteChecklist}
                  disabled={isSaving}
                  size="lg"
                  className="w-full h-14 sm:h-16 text-lg sm:text-xl font-bold shadow-lg bg-green-600 hover:bg-green-700 touch-manipulation"
                >
                  {isSaving ? "Submitting Report..." : "Submit Report"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {progress < 100 && (
        <div className="flex flex-col gap-3 pt-4 border-t">
          <div className="text-center text-sm sm:text-base text-muted-foreground">
            Complete all tasks to finish this report ({Math.round(progress)}% done)
          </div>
          <Button
            variant="outline"
            onClick={() => router.push("/staff")}
            size="lg"
            className="w-full h-11 sm:h-auto touch-manipulation"
          >
            Back to Tasks
          </Button>
        </div>
      )}
    </div>
  )
}
