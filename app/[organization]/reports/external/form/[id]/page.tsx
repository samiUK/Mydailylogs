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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Send, CheckCircle } from "lucide-react"

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

export default function ExternalFormPage({
  params,
}: {
  params: { organization: string; id: string }
}) {
  const router = useRouter()
  const supabase = createClient()
  const [template, setTemplate] = useState<Template | null>(null)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [items, setItems] = useState<ChecklistItem[]>([])
  const [responses, setResponses] = useState<Record<string, any>>({})
  const [submitterName, setSubmitterName] = useState("")
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    loadFormData()
  }, [params.organization, params.id])

  const loadFormData = async () => {
    try {
      // Load organization by slug
      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .select("*")
        .eq("slug", params.organization)
        .single()

      if (orgError || !orgData) {
        setError("Organization not found")
        setLoading(false)
        return
      }

      setOrganization(orgData)

      // Load template
      const { data: templateData, error: templateError } = await supabase
        .from("checklist_templates")
        .select("*")
        .eq("id", params.id)
        .eq("organization_id", orgData.id)
        .eq("is_active", true)
        .single()

      if (templateError || !templateData) {
        setError("Form not found or no longer available")
        setLoading(false)
        return
      }

      setTemplate(templateData)

      // Load checklist items
      const { data: itemsData, error: itemsError } = await supabase
        .from("checklist_items")
        .select("*")
        .eq("template_id", params.id)
        .order("order_index")

      if (itemsError) {
        setError("Error loading form questions")
        setLoading(false)
        return
      }

      setItems(itemsData || [])
    } catch (error) {
      console.error("Error loading form data:", error)
      setError("An error occurred while loading the form")
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!submitterName.trim()) {
      setError("Please provide your full name")
      return
    }

    setSubmitting(true)
    setError("")

    try {
      // Create external submission
      const { data: submission, error: submissionError } = await supabase
        .from("external_submissions")
        .insert({
          template_id: params.id,
          organization_id: organization!.id,
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

      setSubmitted(true)
    } catch (error) {
      console.error("Error submitting form:", error)
      setError("An error occurred while submitting the form. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="text-muted-foreground mt-2">Loading form...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
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
            {organization?.name}
          </Badge>
          <h1 className="text-3xl font-bold text-foreground mb-2">{template?.name}</h1>
          <p className="text-muted-foreground">{template?.description}</p>
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
              {items.map((item) => (
                <div key={item.id} className="space-y-2">
                  <Label className="text-sm font-medium">
                    {item.question}
                    {item.is_required && <span className="text-red-500 ml-1">*</span>}
                  </Label>

                  {item.type === "text" && (
                    <Input
                      value={responses[item.id] || ""}
                      onChange={(e) => handleResponseChange(item.id, e.target.value)}
                      required={item.is_required}
                    />
                  )}

                  {item.type === "textarea" && (
                    <Textarea
                      value={responses[item.id] || ""}
                      onChange={(e) => handleResponseChange(item.id, e.target.value)}
                      required={item.is_required}
                      rows={3}
                    />
                  )}

                  {item.type === "radio" && item.options && (
                    <RadioGroup
                      value={responses[item.id] || ""}
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
                </div>
              ))}

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
