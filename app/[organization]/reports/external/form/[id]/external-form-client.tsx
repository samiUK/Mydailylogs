"use client"

import type React from "react"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Send, CheckCircle, Camera, X } from "lucide-react"

interface Template {
  id: string
  name: string
  description: string
  organization_id: string
}

interface ChecklistItem {
  id: string
  question: string
  type: string
  options: string[] | null
  is_required: boolean
  order_index: number
}

interface Organization {
  id: string
  name: string
  slug: string
}

interface ExternalFormClientProps {
  organization: Organization
  template: Template
  items: ChecklistItem[]
  templateId: string
}

export default function ExternalFormClient({ organization, template, items, templateId }: ExternalFormClientProps) {
  console.log("[v0] External form client - Component loaded with:", {
    organization: organization.name,
    template: template.name,
    itemCount: items.length,
  })

  const supabase = createClient()
  const [responses, setResponses] = useState<Record<string, string | boolean | string[]>>({})
  const [submitterName, setSubmitterName] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState("")
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, File[]>>({})
  const [uploading, setUploading] = useState<Record<string, boolean>>({})

  const compressImage = (file: File, targetSizeKB = 15): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      const img = new Image()

      img.onload = () => {
        // Calculate dimensions to maintain aspect ratio while reducing size
        let { width, height } = img
        const maxDimension = 400 // Start with reasonable max dimension

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

        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height)

        // Start with high quality and reduce until we hit target size
        let quality = 0.8
        const tryCompress = () => {
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const sizeKB = blob.size / 1024

                if (sizeKB <= targetSizeKB || quality <= 0.1) {
                  // Create compressed file
                  const compressedFile = new File([blob], file.name, {
                    type: "image/jpeg",
                    lastModified: Date.now(),
                  })
                  resolve(compressedFile)
                } else {
                  // Reduce quality and try again
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

  const handleResponseChange = (itemId: string, value: string | boolean | string[]) => {
    setResponses((prev) => ({
      ...prev,
      [itemId]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!submitterName.trim()) {
      setError("Please provide your full name")
      return
    }

    setSubmitting(true)
    setError("")

    try {
      console.log("[v0] External form client - Submitting form for:", submitterName)

      // Create external submission
      const { data: submission, error: submissionError } = await supabase
        .from("external_submissions")
        .insert({
          template_id: templateId,
          organization_id: organization.id,
          submitter_name: submitterName.trim(),
          status: "completed",
        })
        .select()
        .single()

      if (submissionError) throw submissionError

      // Create responses
      const responseData = items.map((item) => ({
        submission_id: submission.id,
        item_id: item.id,
        response: responses[item.id] || null,
      }))

      const { error: responsesError } = await supabase.from("external_responses").insert(responseData)

      if (responsesError) throw responsesError

      console.log("[v0] External form client - Form submitted successfully")
      setSubmitted(true)
    } catch (error) {
      console.error("[v0] External form client - Error submitting form:", error)
      setError("An error occurred while submitting the form. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleFileUpload = async (itemId: string, files: FileList | null) => {
    if (!files || files.length === 0) return

    setUploading((prev) => ({ ...prev, [itemId]: true }))

    try {
      const fileArray = Array.from(files)

      const compressedFiles = await Promise.all(
        fileArray.map(async (file) => {
          if (file.type.startsWith("image/")) {
            const compressed = await compressImage(file)
            console.log(
              `[v0] Compressed ${file.name}: ${(file.size / 1024).toFixed(1)}KB → ${(compressed.size / 1024).toFixed(1)}KB`,
            )
            return compressed
          }
          return file
        }),
      )

      setUploadedFiles((prev) => ({
        ...prev,
        [itemId]: [...(prev[itemId] || []), ...compressedFiles],
      }))

      const fileNames = compressedFiles.map((file) => file.name)
      const currentResponse = responses[itemId]
      const existingFiles = Array.isArray(currentResponse) ? currentResponse : []
      handleResponseChange(itemId, [...existingFiles, ...fileNames])
    } catch (error) {
      console.error("[v0] Error handling file upload:", error)
      setError("Error uploading files. Please try again.")
    } finally {
      setUploading((prev) => ({ ...prev, [itemId]: false }))
    }
  }

  const removeFile = (itemId: string, fileIndex: number) => {
    setUploadedFiles((prev) => {
      const newFiles = [...(prev[itemId] || [])]
      newFiles.splice(fileIndex, 1)
      return { ...prev, [itemId]: newFiles }
    })

    const currentResponse = responses[itemId]
    const currentResponses = Array.isArray(currentResponse) ? currentResponse : []
    const newResponses = [...currentResponses]
    newResponses.splice(fileIndex, 1)
    handleResponseChange(itemId, newResponses)
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto text-center">
          <CardHeader>
            <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <CardTitle className="text-green-600">Form Submitted Successfully!</CardTitle>
            <CardDescription>Thank you for your submission. Your responses have been recorded.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <Badge variant="outline" className="mb-4">
            {organization.name}
          </Badge>
          <h1 className="text-3xl font-bold text-foreground mb-2">{template.name}</h1>
          <p className="text-muted-foreground">{template.description}</p>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>External Contractor Form</CardTitle>
            <CardDescription>
              Please fill out all required fields and provide your full name to sign off on this report.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Submitter Name */}
              <div className="space-y-2">
                <Label htmlFor="submitterName" className="text-sm font-medium">
                  Full Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="submitterName"
                  value={submitterName}
                  onChange={(e) => setSubmitterName(e.target.value)}
                  placeholder="Enter your full name"
                  required
                />
              </div>

              {/* Form Questions */}
              {items.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No form questions found for this template.</p>
                  <p className="text-sm text-muted-foreground mt-2">Template ID: {templateId}</p>
                </div>
              ) : (
                items.map((item) => (
                  <div key={item.id} className="space-y-2">
                    <Label className="text-sm font-medium">
                      {item.question}
                      {item.is_required && <span className="text-red-500 ml-1">*</span>}
                    </Label>

                    {item.type === "text" && (
                      <Input
                        value={typeof responses[item.id] === "boolean" ? "" : (responses[item.id] as string) || ""}
                        onChange={(e) => handleResponseChange(item.id, e.target.value)}
                        required={item.is_required}
                      />
                    )}

                    {item.type === "textarea" && (
                      <Textarea
                        value={typeof responses[item.id] === "boolean" ? "" : (responses[item.id] as string) || ""}
                        onChange={(e) => handleResponseChange(item.id, e.target.value)}
                        required={item.is_required}
                        rows={3}
                      />
                    )}

                    {item.type === "radio" && item.options && (
                      <RadioGroup
                        value={typeof responses[item.id] === "boolean" ? "" : (responses[item.id] as string) || ""}
                        onValueChange={(value) => handleResponseChange(item.id, value)}
                        required={item.is_required}
                      >
                        {item.options.map((option, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <RadioGroupItem value={option} id={`${item.id}-${index}`} />
                            <Label htmlFor={`${item.id}-${index}`}>{option}</Label>
                          </div>
                        ))}
                      </RadioGroup>
                    )}

                    {item.type === "checkbox" && (
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={item.id}
                          checked={responses[item.id] || false}
                          onCheckedChange={(checked) => handleResponseChange(item.id, checked)}
                          required={item.is_required}
                        />
                        <Label htmlFor={item.id}>Yes</Label>
                      </div>
                    )}

                    {item.type === "photo" && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-center w-full">
                          <label
                            htmlFor={`photo-${item.id}`}
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
                              id={`photo-${item.id}`}
                              type="file"
                              className="hidden"
                              accept="image/*"
                              multiple
                              capture="environment"
                              onChange={(e) => handleFileUpload(item.id, e.target.files)}
                              required={
                                item.is_required && (!uploadedFiles[item.id] || uploadedFiles[item.id].length === 0)
                              }
                            />
                          </label>
                        </div>

                        {/* Display uploaded files */}
                        {uploadedFiles[item.id] && uploadedFiles[item.id].length > 0 && (
                          <div className="grid grid-cols-2 gap-2">
                            {uploadedFiles[item.id].map((file, index) => (
                              <div key={index} className="relative">
                                <img
                                  src={URL.createObjectURL(file) || "/placeholder.svg"}
                                  alt={`Upload ${index + 1}`}
                                  className="w-full h-24 object-cover rounded-lg border"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeFile(item.id, index)}
                                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                                <p className="text-xs text-gray-500 mt-1 truncate">{file.name}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {uploading[item.id] && <div className="text-sm text-blue-600">Uploading photos...</div>}
                      </div>
                    )}
                  </div>
                ))
              )}

              {error && (
                <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>
              )}

              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Submit Report
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
