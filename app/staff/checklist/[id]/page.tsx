"use client"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Camera, FileText, Hash, CheckSquare, Check, X, Loader2 } from "lucide-react"
import { toast } from "react-toastify"
import { Card, CardContent } from "@/components/ui/card"

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

interface ChecklistPageProps {
  params: { id: string }
}

export default function ChecklistPage({ params }: ChecklistPageProps) {
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
  const [profileId, setProfileId] = useState<string | null>(null)
  const [assignmentId, setAssignmentId] = useState<string | null>(null)
  const [completedAssignmentId, setCompletedAssignmentId] = useState<string | null>(null)
  const [completedDailyChecklistId, setCompletedDailyChecklistId] = useState<string | null>(null)
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement("canvas")
          const ctx = canvas.getContext("2d")
          if (!ctx) {
            resolve(file)
            return
          }

          let width = img.width
          let height = img.height
          const maxWidth = 400

          if (width > maxWidth) {
            height = (height / width) * maxWidth
            width = maxWidth
          }

          canvas.width = width
          canvas.height = height
          ctx.drawImage(img, 0, 0, width, height)

          console.log("[v0] Original dimensions:", img.width, "x", img.height, "→ Resized to:", width, "x", height)

          const targetSizeKB = 100
          const quality = 0.7

          const attemptCompression = (q: number) => {
            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  resolve(file)
                  return
                }

                const sizeKB = blob.size / 1024
                console.log("[v0] Compression attempt - Quality:", q, "Size:", sizeKB.toFixed(1), "KB")

                if (sizeKB <= targetSizeKB || q <= 0.1) {
                  console.log("[v0] Final compressed size:", sizeKB.toFixed(1), "KB")
                  const fileName = file.name.replace(/\.[^/.]+$/, ".jpg")
                  resolve(new File([blob], fileName, { type: "image/jpeg" }))
                } else {
                  attemptCompression(q - 0.05)
                }
              },
              "image/jpeg",
              q,
            )
          }

          attemptCompression(quality)
        }
        img.onerror = reject
        img.src = e.target?.result as string
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const handleFileUpload = async (taskId: string, files: FileList | null) => {
    if (!files || files.length === 0) return

    setUploading((prev) => ({ ...prev, [taskId]: true }))

    try {
      const file = files[0]
      console.log("[v0] Starting photo upload for task:", taskId, "File:", file.name, "Size:", file.size)

      const compressedFile = file.type.startsWith("image/") ? await compressImage(file) : file
      console.log("[v0] Compressed file size:", compressedFile.size)

      const fileExt = compressedFile.name.split(".").pop()?.toLowerCase()
      const timestamp = Date.now()
      const fileName = `${organizationId}/${profileId}/${taskId}-${timestamp}.${fileExt}`

      console.log("[v0] Uploading to Supabase Storage:", fileName)

      const supabase = createClient()
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("report-photos")
        .upload(fileName, compressedFile, {
          contentType: compressedFile.type,
          upsert: false,
        })

      if (uploadError) {
        console.error("[v0] Upload error:", uploadError)
        toast({
          title: "Upload Failed",
          description: uploadError.message,
          variant: "destructive",
        })
        setUploading((prev) => ({ ...prev, [taskId]: false }))
        return
      }

      console.log("[v0] Upload successful, getting public URL")

      const {
        data: { publicUrl },
      } = supabase.storage.from("report-photos").getPublicUrl(fileName)

      console.log("[v0] Public URL:", publicUrl)

      const previewUrl = URL.createObjectURL(compressedFile)

      const displayFile = new File([compressedFile], compressedFile.name, { type: compressedFile.type })
      setUploadedFiles((prev) => ({
        ...prev,
        [taskId]: [displayFile],
      }))

      const value = JSON.stringify([{ name: compressedFile.name, url: publicUrl }])
      setLocalInputValues((prev) => ({ ...prev, [taskId]: value }))

      await handleTaskResponse(taskId, value, true)

      console.log("[v0] Photo saved to database successfully")

      toast({
        title: "Photo Uploaded",
        description: "Photo saved successfully",
      })
    } catch (error) {
      console.error("[v0] Error uploading photo:", error)
      toast({
        title: "Upload Error",
        description: "Failed to upload photo. Please try again.",
        variant: "destructive",
      })
    } finally {
      setUploading((prev) => ({ ...prev, [taskId]: false }))
    }
  }

  const removeFile = async (taskId: string, fileIndex: number) => {
    try {
      const existingPhotos = localInputValues[taskId] ? JSON.parse(localInputValues[taskId]) : []
      const photoToDelete = existingPhotos[fileIndex]

      if (photoToDelete?.url) {
        // Extract file path from URL
        const urlParts = photoToDelete.url.split("/report-photos/")
        if (urlParts.length > 1) {
          const filePath = urlParts[1].split("?")[0] // Remove query params
          await createClient().storage.from("report-photos").remove([filePath])
        }
      }

      setUploadedFiles((prev) => {
        const newFiles = [...(prev[taskId] || [])]
        newFiles.splice(fileIndex, 1)
        return { ...prev, [taskId]: newFiles }
      })

      existingPhotos.splice(fileIndex, 1)
      const value = JSON.stringify(existingPhotos)

      setLocalInputValues((prev) => ({ ...prev, [taskId]: value }))
      handleTaskResponse(taskId, value, existingPhotos.length > 0)
    } catch (error) {
      console.error("[v0] Error removing file:", error)
    }
  }

  const loadChecklist = async () => {
    if (!checklistId) return

    console.log("[v0] Loading checklist:", checklistId)
    setIsLoading(true)

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.push("/auth/login")
      return
    }

    try {
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

      if (!profile) {
        console.error("[v0] No profile found")
        setIsLoading(false)
        return
      }

      setOrganizationId(profile.organization_id)
      setProfileId(user.id)

      const assignmentIdFromUrl = params.id
      setAssignmentId(assignmentIdFromUrl)
      console.log("[v0] Assignment ID from URL:", assignmentIdFromUrl)

      const { data: assignmentData } = await supabase
        .from("template_assignments")
        .select("*, checklist_templates(*)")
        .eq("id", assignmentIdFromUrl)
        .single()

      if (!assignmentData || !assignmentData.checklist_templates) {
        console.error("[v0] Assignment or template not found for ID:", assignmentIdFromUrl)
        setError("Assignment not found. Please contact your administrator.")
        setIsLoading(false)
        return
      }

      console.log("[v0] Assignment loaded:", assignmentData)
      const templateData = assignmentData.checklist_templates
      setTemplate(templateData)

      const { data: tasksData, error: tasksError } = await supabase
        .from("checklist_items")
        .select("*")
        .eq("template_id", templateData.id)
        .order("order_index")

      if (tasksError) {
        console.error("[v0] Error loading tasks:", tasksError)
      }

      console.log("[v0] Tasks loaded for template", templateData.id, ":", tasksData?.length || 0)
      if (tasksData && tasksData.length > 0) {
        setTasks(tasksData)
      } else {
        console.warn("[v0] No tasks found for template:", templateData.id)
        setTasks([])
      }

      const { data: responsesData, error: responsesError } = await supabase
        .from("checklist_responses")
        .select("*")
        .eq("assignment_id", assignmentIdFromUrl)

      if (responsesError) {
        console.error("[v0] Error loading responses:", responsesError)
      }

      console.log("[v0] Responses loaded for assignment:", assignmentIdFromUrl, "count:", responsesData?.length || 0)

      if (responsesData && responsesData.length > 0) {
        setResponses(responsesData)
        const initialInputValues: Record<string, string> = {}
        const initialNotes: Record<string, string> = {}
        const initialUploadedFiles: Record<string, File[]> = {}

        responsesData.forEach((response) => {
          if (response.notes) {
            initialNotes[response.item_id] = response.notes
          }
          if (response.response_value) {
            initialInputValues[response.item_id] = response.response_value

            try {
              const photoData = JSON.parse(response.response_value)

              if (photoData.photos && Array.isArray(photoData.photos)) {
                initialUploadedFiles[response.item_id] = photoData.photos.map((url: string) => ({
                  name: url.split("/").pop() || "photo.jpg",
                  url,
                })) as any
              }
            } catch (e) {
              // Not a photo response, just a regular value
            }
          }
        })

        setLocalInputValues(initialInputValues)
        setLocalNotes(initialNotes)
        setUploadedFiles(initialUploadedFiles)
      } else {
        console.log("[v0] Fresh assignment - starting with empty responses")
        setResponses([])
        setLocalInputValues({})
        setLocalNotes({})
        setUploadedFiles({})
      }
    } catch (error) {
      console.error("[v0] Error loading checklist:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleTaskResponse = async (taskId: string, value: string, isCompleted = false) => {
    const supabase = createClient()

    try {
      const responseData: any = {
        assignment_id: assignmentId,
        item_id: taskId,
        response_value: value,
        is_completed: isCompleted,
        completed_at: isCompleted ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      }

      console.log("[v0] Saving response with assignment_id:", assignmentId)

      const { data: existingResponse } = await supabase
        .from("checklist_responses")
        .select("id")
        .eq("assignment_id", assignmentId)
        .eq("item_id", taskId)
        .single()

      let data, error

      if (existingResponse) {
        const result = await supabase
          .from("checklist_responses")
          .update(responseData)
          .eq("id", existingResponse.id)
          .select()
          .single()
        data = result.data
        error = result.error
      } else {
        const result = await supabase.from("checklist_responses").insert(responseData).select().single()
        data = result.data
        error = result.error
      }

      if (error) {
        console.error("[v0] Error saving response:", error)
        toast.error("Failed to save response")
        return
      }

      console.log("[v0] Response saved successfully for assignment:", assignmentId)

      setResponses((prev) => {
        const existingIndex = prev.findIndex((r) => r.item_id === taskId && r.assignment_id === assignmentId)
        if (existingIndex >= 0) {
          const newResponses = [...prev]
          newResponses[existingIndex] = data
          return newResponses
        }
        return [...prev, data]
      })
    } catch (error) {
      console.error("[v0] Error in handleTaskResponse:", error)
      toast.error("Failed to save response")
    }
  }

  const handleTaskNotes = async (taskId: string, notes: string) => {
    try {
      setLocalNotes((prev) => ({ ...prev, [taskId]: notes }))

      const { data: existingResponse } = await createClient()
        .from("checklist_responses")
        .select("id")
        .eq("assignment_id", assignmentId)
        .eq("item_id", taskId)
        .single()

      if (existingResponse) {
        const { data } = await createClient()
          .from("checklist_responses")
          .update({
            notes,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingResponse.id)
          .select()
          .single()

        if (data) {
          setResponses((prev) => prev.map((r) => (r.id === data.id ? data : r)))
        }
      } else {
        const { data } = await createClient()
          .from("checklist_responses")
          .insert({
            assignment_id: assignmentId,
            item_id: taskId,
            notes,
            updated_at: new Date().toISOString(),
          })
          .select()
          .single()

        if (data) {
          setResponses((prev) => [...prev, data])
        }
      }
    } catch (error) {
      console.error("[v0] Error handling task notes:", error)
    }
  }

  const handleMarkCompleted = async (taskId: string) => {
    console.log("[v0] Mark completed button clicked for task:", taskId)

    try {
      const existingResponse = responses.find((r) => r.item_id === taskId && r.assignment_id === assignmentId)
      const isCurrentlyCompleted = existingResponse?.is_completed || false

      if (existingResponse) {
        const { data } = await createClient()
          .from("checklist_responses")
          .update({
            is_completed: !isCurrentlyCompleted,
            completed_at: !isCurrentlyCompleted ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingResponse.id)
          .select()
          .single()

        if (data) {
          setResponses((prev) => prev.map((r) => (r.id === data.id ? data : r)))
        }
      } else {
        const { data } = await createClient()
          .from("checklist_responses")
          .insert({
            assignment_id: assignmentId,
            item_id: taskId,
            is_completed: true,
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single()

        if (data) {
          setResponses((prev) => [...prev, data])
        }
      }
    } catch (error) {
      console.error("[v0] Exception in mark completed:", error)
    }
  }

  const handleSubmit = async () => {
    console.log("[v0] Submit button clicked")
    setIsSaving(true)

    try {
      console.log("[v0] Updating assignment by unique ID:", assignmentId)
      const { data: updateData, error: assignmentError } = await createClient()
        .from("template_assignments")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", assignmentId)
        .select()

      if (assignmentError) {
        console.error("[v0] Database error updating assignment:", assignmentError)
        alert(`Database error completing checklist: ${assignmentError.message}. Please try again.`)
        setIsSaving(false)
        return
      }

      if (!updateData || updateData.length === 0) {
        console.error("[v0] No assignment found to update with ID:", assignmentId)
        alert("Error: Could not update assignment. Please contact support.")
        setIsSaving(false)
        return
      }

      console.log("[v0] Assignment updated successfully:", updateData[0])

      const reportData = {
        template_id: template?.id,
        assignment_id: assignmentId,
        responses: responses,
        tasks: tasks,
        global_notes: globalNotes,
        completed_at: new Date().toISOString(),
      }

      const { data: submittedReport, error: submittedReportError } = await createClient()
        .from("submitted_reports")
        .insert({
          template_name: template?.name || "Untitled Report",
          template_description: template?.description || "",
          submitted_by: profileId,
          organization_id: organizationId,
          report_data: reportData,
          status: "completed",
          submitted_at: new Date().toISOString(),
          assignment_id: assignmentId,
        })
        .select()

      if (submittedReportError) {
        console.error("[v0] Error creating submitted_reports entry:", submittedReportError)
      } else {
        console.log("[v0] Submitted report created with assignment_id:", assignmentId)
      }

      const { error: notificationError } = await createClient()
        .from("notifications")
        .insert({
          user_id: profileId,
          template_id: template?.id,
          organization_id: organizationId,
          type: "report_submitted",
          title: "Report Submitted",
          message: `Report for "${template?.name}" has been submitted`,
          created_at: new Date().toISOString(),
        })

      if (notificationError) {
        console.error("[v0] Error creating notification:", notificationError)
      }

      toast.success("Checklist completed successfully!")
      router.push("/staff")
    } catch (error) {
      console.error("[v0] Error submitting checklist:", error)
      alert("An error occurred while submitting. Please try again.")
    }

    setIsSaving(false)
  }

  useEffect(() => {
    setChecklistId(params.id)
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

  if (error) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <h2 className="text-xl font-semibold mb-2">Error</h2>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={() => router.push("/staff")}>Back to Dashboard</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!template) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <h2 className="text-xl font-semibold mb-2">Assignment Not Found</h2>
              <p className="text-muted-foreground mb-4">
                This assignment could not be loaded. It may have been deleted or you may not have access to it.
              </p>
              <Button onClick={() => router.push("/staff")}>Back to Dashboard</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const completedTasks = responses.filter((r) => r.is_completed && r.assignment_id === assignmentId).length
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
              className="text-lg border-2 shadow-md focus:ring-4 focus:ring-blue-200 min-h-[100px] touch-manipulation"
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
          <div key={task.id} className="space-y-4">
            {!uploadedFiles[task.id] || uploadedFiles[task.id].length === 0 ? (
              <div className="bg-blue-50 border-2 border-dashed border-blue-300 rounded-xl p-8 text-center">
                <label htmlFor={`photo-upload-${task.id}`} className="cursor-pointer block">
                  <Camera className="w-16 h-16 mx-auto text-blue-600 mb-3" />
                  <div className="text-lg font-semibold text-blue-800 mb-2">Tap to Take Photo</div>
                  <div className="text-sm text-blue-600">Photos auto-compressed for faster upload</div>
                  <input
                    id={`photo-upload-${task.id}`}
                    type="file"
                    className="hidden"
                    accept="image/*"
                    capture="environment"
                    disabled={uploading[task.id]}
                    onChange={(e) => handleFileUpload(task.id, e.target.files)}
                  />
                </label>
              </div>
            ) : (
              <div className="space-y-4">
                {uploadedFiles[task.id].map((file, index) => {
                  const photoData = localInputValues[task.id] ? JSON.parse(localInputValues[task.id])[index] : null
                  return (
                    <div
                      key={index}
                      className="relative bg-white rounded-xl shadow-lg overflow-hidden border-2 border-green-200"
                    >
                      {photoData?.url ? (
                        <img
                          src={photoData.url || "/placeholder.svg"}
                          alt="Uploaded photo"
                          className="w-full h-auto object-contain"
                        />
                      ) : (
                        <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
                          <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
                        </div>
                      )}
                      <div className="absolute top-2 right-2">
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="rounded-full shadow-lg"
                          onClick={() => removeFile(task.id, index)}
                        >
                          <X className="w-5 h-5" />
                        </Button>
                      </div>
                      <div className="bg-green-50 p-3 border-t border-green-200">
                        <p className="text-sm font-medium text-green-800 flex items-center gap-2">
                          <Check className="w-4 h-4" />
                          Photo uploaded successfully
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {uploading[task.id] && (
              <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4 text-center">
                <Loader2 className="w-8 h-8 mx-auto text-yellow-600 animate-spin mb-2" />
                <p className="text-sm font-medium text-yellow-800">Uploading photo...</p>
              </div>
            )}
          </div>
        )

      default:
        return null
    }
  }

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

        <div className="bg-card border rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Progress</span>
            <span className="text-sm text-muted-foreground">
              {completedTasks} of {totalTasks} tasks completed ({Math.round(progress)}%)
            </span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2.5">
            <div
              className="bg-primary h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        <div className="space-y-4">
          {Object.keys(tasksByCategory).map((category) => (
            <div key={category} className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">{category}</h2>
              {tasksByCategory[category].map((task) => (
                <div key={task.id} className="bg-card border rounded-lg p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    {getTaskIcon(task.task_type)}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-foreground">{task.name}</h3>
                        {task.is_required && (
                          <Badge variant="destructive" className="text-xs">
                            Required
                          </Badge>
                        )}
                      </div>
                      {task.description && <p className="text-sm text-muted-foreground mt-1">{task.description}</p>}
                    </div>
                  </div>
                  {renderTaskInput(task)}
                  <div className="space-y-2 border-t pt-3">
                    <Label htmlFor={`notes-${task.id}`} className="text-sm">
                      Additional Notes (optional)
                    </Label>
                    <Textarea
                      id={`notes-${task.id}`}
                      placeholder="Add any notes or observations..."
                      value={localNotes[task.id] || ""}
                      onChange={(e) => handleTaskNotes(task.id, e.target.value)}
                      rows={2}
                      className="text-sm"
                    />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-4">
          <Button type="button" variant="default" size="lg" onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Complete Checklist"
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
