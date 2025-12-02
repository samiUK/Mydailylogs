"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Save, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { getSubscriptionLimits } from "@/lib/subscription-limits"

interface Template {
  id: string
  name: string
  description: string
  frequency: string
  schedule_type: string
  specific_date: string | null
  deadline_date: string | null
  multi_day_dates: string[] | null // Added multi_day_dates field
  schedule_time: string | null
  is_active: boolean
  is_recurring: boolean
  recurrence_type: string | null
}

export default function EditTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const supabase = createClient()
  const [templateId, setTemplateId] = useState<string>("")
  const [template, setTemplate] = useState<Template | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [scheduleType, setScheduleType] = useState("one-off")
  const [frequency, setFrequency] = useState("daily")
  const [specificDate, setSpecificDate] = useState("")
  const [deadlineDate, setDeadlineDate] = useState("")
  const [multiDayDates, setMultiDayDates] = useState<string[]>([]) // Added multi-day dates state
  const [scheduleTime, setScheduleTime] = useState("")
  const [isActive, setIsActive] = useState(true)
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
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push("/auth/login")
        return
      }

      const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single()

      if (!profile) {
        router.push("/auth/login")
        return
      }

      const limits = await getSubscriptionLimits(profile.organization_id)
      setHasTaskAutomation(limits.hasTaskAutomation)

      const { data: templateData, error } = await supabase
        .from("checklist_templates")
        .select("*")
        .eq("id", templateId)
        .eq("organization_id", profile.organization_id)
        .single()

      if (error) throw error

      console.log("[v0] Template loaded in edit page:", templateData)

      setTemplate(templateData)
      setName(templateData.name)
      setDescription(templateData.description || "")
      setScheduleType(templateData.schedule_type || "one-off")
      setFrequency(templateData.frequency || "daily")
      setSpecificDate(templateData.specific_date || "")
      setDeadlineDate(templateData.deadline_date || "")
      setMultiDayDates(templateData.multi_day_dates || []) // Load multi-day dates
      setScheduleTime(templateData.schedule_time || "")
      setIsActive(templateData.is_active)

      console.log("[v0] Schedule type set to:", templateData.schedule_type || "one-off")
    } catch (error) {
      console.error("Error loading template:", error)
      toast.error("Failed to load template")
    } finally {
      setLoading(false)
    }
  }

  const getMaxMultiDayDate = () => {
    if (hasTaskAutomation) {
      // Paid users have no restriction
      return null
    }
    // Starter users can only schedule 30 days ahead
    const maxDate = new Date()
    maxDate.setDate(maxDate.getDate() + 30)
    return maxDate.toISOString().split("T")[0]
  }

  const validateMultiDayDates = () => {
    if (scheduleType === "multi_day" && multiDayDates.length === 0) {
      toast.error("Please add at least one date for multi-day scheduling")
      return false
    }

    if (scheduleType === "multi_day" && !hasTaskAutomation) {
      const maxDate = new Date()
      maxDate.setDate(maxDate.getDate() + 30)
      maxDate.setHours(0, 0, 0, 0)

      const futureDates = multiDayDates.filter((date) => {
        const d = new Date(date)
        d.setHours(0, 0, 0, 0)
        return d > maxDate
      })

      if (futureDates.length > 0) {
        toast.error(
          "Starter plan can only schedule multi-day dates within 30 days. Upgrade to Growth or Scale for unlimited scheduling.",
        )
        return false
      }
    }

    return true
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      if (!name.trim()) {
        toast.error("Template name is required")
        return
      }

      if (scheduleType === "recurring" && !hasTaskAutomation) {
        toast.error("Task Automation is a premium feature. Upgrade to Growth or Scale plan.")
        return
      }

      if (!validateMultiDayDates()) {
        return
      }

      let processedSpecificDate = null
      let processedDeadlineDate = null
      let processedFrequency = frequency
      let processedMultiDayDates = null // Added multi-day dates processing

      if (scheduleType === "specific_date" && specificDate) {
        processedSpecificDate = specificDate
      }

      if (scheduleType === "deadline" && deadlineDate) {
        processedDeadlineDate = deadlineDate
      }

      if (scheduleType === "multi_day" && multiDayDates.length > 0) {
        processedMultiDayDates = multiDayDates
      }

      if (scheduleType !== "recurring") {
        processedFrequency = "custom"
      }

      const isRecurringTemplate = scheduleType === "recurring"

      const { error } = await supabase
        .from("checklist_templates")
        .update({
          name: name.trim(),
          description: description.trim(),
          schedule_type: scheduleType,
          frequency: processedFrequency,
          is_recurring: isRecurringTemplate, // Always sync this field
          recurrence_type: isRecurringTemplate ? frequency : null, // Set recurrence_type for cron job
          specific_date: processedSpecificDate,
          deadline_date: processedDeadlineDate,
          multi_day_dates: processedMultiDayDates, // Update multi-day dates
          schedule_time: scheduleTime || null,
          is_active: isActive,
          updated_at: new Date().toISOString(),
        })
        .eq("id", templateId)

      if (error) throw error

      toast.success("Template updated successfully!")
      router.push("/admin/templates")
    } catch (error) {
      console.error("Error updating template:", error)
      toast.error("Failed to update template")
    } finally {
      setSaving(false)
    }
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
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/templates">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Edit Template</h1>
          <p className="text-muted-foreground">Update template settings and schedule</p>
        </div>
      </div>

      <form onSubmit={handleSave}>
        <Card>
          <CardHeader>
            <CardTitle>Template Settings</CardTitle>
            <CardDescription>Update the basic information and schedule for this template</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-2">
              <Label htmlFor="name" required>
                Template Name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Daily Safety Checklist"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the purpose of this template..."
                rows={3}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="scheduleType">
                Schedule Type <span className="text-red-500">*</span>
              </Label>
              <Select
                value={scheduleType}
                onValueChange={(value) => {
                  console.log("[v0] Schedule type changed from", scheduleType, "to", value)
                  setScheduleType(value)
                }}
              >
                <SelectTrigger id="scheduleType">
                  <SelectValue placeholder="Select schedule type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="one-off">One-off</SelectItem>
                  <SelectItem value="deadline">Deadline</SelectItem>
                  <SelectItem value="specific_date">Specific Date</SelectItem>
                  <SelectItem value="multi_day">Multi-Day (Multiple Dates)</SelectItem>
                  <SelectItem value="recurring" disabled={!hasTaskAutomation}>
                    Recurring (Daily/Weekly/Monthly)
                    {!hasTaskAutomation && " 👑 Premium"}
                  </SelectItem>
                </SelectContent>
              </Select>
              {scheduleType === "recurring" && !hasTaskAutomation && (
                <p className="text-sm text-amber-600">
                  Task Automation is a premium feature. Upgrade to Growth or Scale plan.
                </p>
              )}
            </div>

            {scheduleType === "recurring" && (
              <div className="grid gap-2">
                <Label htmlFor="frequency">
                  Frequency <span className="text-red-500">*</span>
                </Label>
                <Select value={frequency} onValueChange={setFrequency}>
                  <SelectTrigger id="frequency">
                    <SelectValue placeholder="Select frequency" />
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
                  onChange={(e) => setSpecificDate(e.target.value)}
                  required
                  min={new Date().toISOString().split("T")[0]}
                />
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
                  onChange={(e) => setDeadlineDate(e.target.value)}
                  required
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>
            )}

            {scheduleType === "multi_day" && (
              <div className="grid gap-2">
                <Label required>Multiple Dates</Label>
                {!hasTaskAutomation && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-2">
                    <p className="text-sm text-amber-800 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      <span>
                        <strong>Starter Plan:</strong> Multi-day dates limited to 30 days ahead. Upgrade to Growth or
                        Scale for unlimited scheduling.
                      </span>
                    </p>
                  </div>
                )}
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      id="multiDayDateInput"
                      min={new Date().toISOString().split("T")[0]}
                      max={getMaxMultiDayDate() || undefined}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          const input = e.currentTarget
                          if (input.value && !multiDayDates.includes(input.value)) {
                            setMultiDayDates([...multiDayDates, input.value].sort())
                            input.value = ""
                          }
                        }
                      }}
                    />
                    <Button
                      type="button"
                      onClick={() => {
                        const input = document.getElementById("multiDayDateInput") as HTMLInputElement
                        if (input.value && !multiDayDates.includes(input.value)) {
                          setMultiDayDates([...multiDayDates, input.value].sort())
                          input.value = ""
                        }
                      }}
                    >
                      Add Date
                    </Button>
                  </div>
                  {multiDayDates.length > 0 && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <p className="text-sm font-medium text-gray-700 mb-2">Selected Dates:</p>
                      <div className="flex flex-wrap gap-2">
                        {multiDayDates.map((date) => (
                          <div
                            key={date}
                            className="flex items-center gap-2 bg-white border border-emerald-300 rounded-full px-3 py-1 text-sm"
                          >
                            <span>{new Date(date).toLocaleDateString("en-GB")}</span>
                            <button
                              type="button"
                              onClick={() => setMultiDayDates(multiDayDates.filter((d) => d !== date))}
                              className="text-red-500 hover:text-red-700 font-bold"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {!hasTaskAutomation
                      ? "Add specific dates within the next 30 days. For automated recurring tasks, upgrade to a paid plan."
                      : "Add multiple specific dates when this task should be completed"}
                  </p>
                </div>
              </div>
            )}

            {(scheduleType === "specific_date" || scheduleType === "deadline" || scheduleType === "multi_day") && (
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

            <div className="flex gap-2">
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
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
