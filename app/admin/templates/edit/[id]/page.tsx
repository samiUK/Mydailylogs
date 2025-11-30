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
import { ArrowLeft, Save } from "lucide-react"
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
  schedule_time: string | null
  is_active: boolean
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

      let processedSpecificDate = null
      let processedDeadlineDate = null
      let processedFrequency = frequency

      if (scheduleType === "specific_date" && specificDate) {
        processedSpecificDate = specificDate
      }

      if (scheduleType === "deadline" && deadlineDate) {
        processedDeadlineDate = deadlineDate
      }

      if (scheduleType !== "recurring") {
        processedFrequency = "custom"
      }

      const { error } = await supabase
        .from("checklist_templates")
        .update({
          name: name.trim(),
          description: description.trim(),
          schedule_type: scheduleType,
          frequency: processedFrequency,
          specific_date: processedSpecificDate,
          deadline_date: processedDeadlineDate,
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
