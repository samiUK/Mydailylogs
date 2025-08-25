"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { CheckSquare, Hash, Type, Camera, Send, AlertCircle } from "lucide-react"

interface Template {
  id: string
  name: string
  description: string
  frequency: string
  organization_id: string
}

interface ChecklistItem {
  id: string
  name: string
  task_type: string
  category: string
  assigned_role: string
  validation_rules: any
  is_required: boolean
  order_index: number
}

interface FormResponse {
  [key: string]: string | number | boolean | File | null
}

export default function ExternalFormPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const [template, setTemplate] = useState<Template | null>(null)
  const [items, setItems] = useState<ChecklistItem[]>([])
  const [responses, setResponses] = useState<FormResponse>({})
  const [submitterName, setSubmitterName] = useState("")
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    loadTemplate()
  }, [params.id])

  const loadTemplate = async () => {
    try {
      const { data: templateData, error: templateError } = await supabase
        .from("checklist_templates")
        .select("*")
        .eq("id", params.id)
        .eq("is_active", true)
        .single()

      if (templateError) throw templateError

      const { data: itemsData, error: itemsError } = await supabase
        .from("checklist_items")
        .select("*")
        .eq("template_id", params.id)
        .order("order_index")

      if (itemsError) throw itemsError

      setTemplate(templateData)
      setItems(itemsData || [])
    } catch (error) {
      console.error("Error loading template:", error)
      setError("Template not found or no longer available")
    } finally {
      setLoading(false)
    }
  }

  const handleResponseChange = (itemId: string, value: any) => {
    setResponses((prev) => ({
      ...prev,
      [itemId]: value,
    }))
  }

  const validateForm = () => {
    if (!submitterName.trim()) {
      setError("Please provide your full name")
      return false
    }

    for (const item of items) {
      if (item.is_required && !responses[item.id]) {
        setError(`Please complete the required field: ${item.name}`)
        return false
      }

      if (item.task_type === "numeric" && responses[item.id]) {
        const value = Number(responses[item.id])
        const rules = item.validation_rules || {}

        if (rules.min !== undefined && value < rules.min) {
          setError(`${item.name} must be at least ${rules.min}`)
          return false
        }

        if (rules.max !== undefined && value > rules.max) {
          setError(`${item.name} must be no more than ${rules.max}`)
          return false
        }
      }
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!validateForm()) return

    setSubmitting(true)

    try {
      const submissionData = {
        template_id: params.id,
        organization_id: template?.organization_id,
        submitter_name: submitterName.trim(),
        submission_type: "external",
        status: "completed",
        submitted_at: new Date().toISOString(),
      }

      const { data: submission, error: submissionError } = await supabase
        .from("external_submissions")
        .insert(submissionData)
        .select()
        .single()

      if (submissionError) throw submissionError

      const responseRecords = items.map((item) => ({
        submission_id: submission.id,
        item_id: item.id,
        response_value: responses[item.id]?.toString() || null,
        response_type: item.task_type,
      }))

      const { error: responsesError } = await supabase.from("external_responses").insert(responseRecords)

      if (responsesError) throw responsesError

      setSubmitted(true)
    } catch (error) {
      console.error("Error submitting form:", error)
      setError("Failed to submit form. Please try again.")
    } finally {
      setSubmitting(false)
    }
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

  const renderFormField = (item: ChecklistItem) => {
    const value = responses[item.id]

    switch (item.task_type) {
      case "boolean":
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={item.id}
              checked={value === true}
              onCheckedChange={(checked) => handleResponseChange(item.id, checked)}
            />
            <Label htmlFor={item.id}>Yes</Label>
          </div>
        )

      case "numeric":
        return (
          <Input
            type="number"
            value={value?.toString() || ""}
            onChange={(e) => handleResponseChange(item.id, e.target.value ? Number(e.target.value) : "")}
            placeholder="Enter number"
            min={item.validation_rules?.min}
            max={item.validation_rules?.max}
          />
        )

      case "text":
        return (
          <Textarea
            value={value?.toString() || ""}
            onChange={(e) => handleResponseChange(item.id, e.target.value)}
            placeholder="Enter your response"
            maxLength={item.validation_rules?.max_length}
            rows={3}
          />
        )

      case "photo":
        return <div className="text-sm text-muted-foreground">Photo upload not available for external forms</div>

      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-muted-foreground mt-2">Loading form...</p>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="text-center py-12">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Send className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Form Submitted Successfully!</h2>
            <p className="text-muted-foreground">
              Thank you, {submitterName}. Your response has been recorded and will be reviewed by the team.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error && !template) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="text-center py-12">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Form Not Available</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const groupedItems = items.reduce(
    (acc, item) => {
      const category = item.category || "General"
      if (!acc[category]) acc[category] = []
      acc[category].push(item)
      return acc
    },
    {} as Record<string, ChecklistItem[]>,
  )

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <Card className="mb-6">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{template?.name}</CardTitle>
            <CardDescription>{template?.description}</CardDescription>
            <Badge variant="outline" className="w-fit mx-auto">
              External Form
            </Badge>
          </CardHeader>
        </Card>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Submitter Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Your Information</CardTitle>
              <CardDescription>Please provide your details to sign off on this report</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="submitterName">Full Name *</Label>
                <Input
                  id="submitterName"
                  value={submitterName}
                  onChange={(e) => setSubmitterName(e.target.value)}
                  placeholder="Enter your full name"
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Form Items by Category */}
          {Object.entries(groupedItems).map(([category, categoryItems]) => (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="text-lg">{category}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {categoryItems.map((item) => (
                  <div key={item.id} className="space-y-2">
                    <Label className="flex items-center gap-2">
                      {getTaskIcon(item.task_type)}
                      {item.name}
                      {item.is_required && <span className="text-red-500">*</span>}
                    </Label>
                    {renderFormField(item)}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}

          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>}

          <Button type="submit" disabled={submitting} className="w-full" size="lg">
            <Send className="w-4 h-4 mr-2" />
            {submitting ? "Submitting..." : "Submit Report"}
          </Button>
        </form>
      </div>
    </div>
  )
}
