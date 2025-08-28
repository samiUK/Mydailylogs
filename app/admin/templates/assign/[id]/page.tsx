"use client"

import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar } from "@/components/ui/calendar"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Users, CalendarIcon, X } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface Template {
  id: string
  name: string
  description: string | null
  frequency: string
  schedule_type: string
}

interface TeamMember {
  id: string
  email: string
  full_name: string | null
  first_name: string | null
  last_name: string | null
  role: string
  position: string | null
  avatar_url: string | null
  is_assigned?: boolean
}

interface Holiday {
  id: string
  name: string
  date: string
  is_recurring: boolean
}

export default function AssignTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const [template, setTemplate] = useState<Template | null>(null)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [templateId, setTemplateId] = useState<string>("")

  const router = useRouter()

  useEffect(() => {
    const resolveParams = async () => {
      const resolvedParams = await params
      setTemplateId(resolvedParams.id)
    }
    resolveParams()
  }, [params])

  useEffect(() => {
    if (templateId) {
      loadData()
    }
  }, [templateId])

  const loadData = async () => {
    try {
      setLoading(true)
      const supabase = createClient()

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single()

      if (!profile) throw new Error("Profile not found")

      const { data: templateData, error: templateError } = await supabase
        .from("checklist_templates")
        .select("id, name, description, frequency, schedule_type")
        .eq("id", templateId)
        .eq("organization_id", profile.organization_id)
        .single()

      if (templateError) throw templateError
      setTemplate(templateData)

      const { data: holidaysData } = await supabase
        .from("holidays")
        .select("*")
        .eq("organization_id", profile.organization_id)
        .order("date", { ascending: true })

      setHolidays(holidaysData || [])

      const { data: exclusionsData } = await supabase
        .from("template_schedule_exclusions")
        .select("*")
        .eq("template_id", templateId)
        .single()

      if (exclusionsData) {
        setExcludeHolidays(exclusionsData.exclude_holidays)
        setExcludeWeekends(exclusionsData.exclude_weekends)
        if (exclusionsData.custom_excluded_dates) {
          setCustomExcludedDates(exclusionsData.custom_excluded_dates.map((date: string) => new Date(date)))
        }
      }

      const { data: members, error: membersError } = await supabase
        .from("profiles")
        .select(`
          id, email, full_name, first_name, last_name, role, position, avatar_url,
          template_assignments!left(id, is_active)
        `)
        .eq("organization_id", profile.organization_id)
        .neq("id", user.id)

      if (membersError) throw membersError

      const processedMembers =
        members?.map((member) => ({
          ...member,
          is_assigned:
            member.template_assignments?.some(
              (assignment: any) => assignment.is_active && assignment.template_id === templateId,
            ) || false,
        })) || []

      setTeamMembers(processedMembers)

      const assignedMemberIds = processedMembers.filter((member) => member.is_assigned).map((member) => member.id)
      setSelectedMembers(new Set(assignedMemberIds))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data")
    } finally {
      setLoading(false)
    }
  }

  const handleMemberToggle = (memberId: string) => {
    const newSelected = new Set(selectedMembers)
    if (newSelected.has(memberId)) {
      newSelected.delete(memberId)
    } else {
      newSelected.add(memberId)
    }
    setSelectedMembers(newSelected)
  }

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return

    const dateExists = customExcludedDates.some((d) => d.toDateString() === date.toDateString())
    if (dateExists) {
      setCustomExcludedDates(customExcludedDates.filter((d) => d.toDateString() !== date.toDateString()))
    } else {
      setCustomExcludedDates([...customExcludedDates, date])
    }
  }

  const handleSubmitClick = () => {
    if (!template) return
    setConfirmDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!template) return

    try {
      setSubmitting(true)
      const supabase = createClient()

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single()

      if (!profile) throw new Error("Profile not found")

      const currentlyAssigned = teamMembers.filter((member) => member.is_assigned).map((member) => member.id)

      const newlySelected = Array.from(selectedMembers)

      const toUnassign = currentlyAssigned.filter((id) => !selectedMembers.has(id))

      const toAssign = newlySelected.filter((id) => !currentlyAssigned.includes(id))

      if (toUnassign.length > 0) {
        const { error: unassignError } = await supabase
          .from("template_assignments")
          .update({ is_active: false })
          .eq("template_id", template.id)
          .in("assigned_to", toUnassign)

        if (unassignError) throw unassignError
      }

      if (toAssign.length > 0) {
        const assignments = toAssign.map((memberId) => ({
          template_id: template.id,
          assigned_to: memberId,
          assigned_by: user.id,
          organization_id: profile.organization_id,
        }))

        const { error: assignError } = await supabase.from("template_assignments").insert(assignments)

        if (assignError) throw assignError
      }

      if (template.schedule_type === "recurring") {
        const exclusionData = {
          template_id: template.id,
          organization_id: profile.organization_id,
          exclude_holidays: excludeHolidays,
          exclude_weekends: excludeWeekends,
          custom_excluded_dates: customExcludedDates.map((date) => date.toISOString().split("T")[0]),
        }

        const { error: exclusionError } = await supabase
          .from("template_schedule_exclusions")
          .upsert(exclusionData, { onConflict: "template_id" })

        if (exclusionError) throw exclusionError
      }

      setConfirmDialogOpen(false)
      alert("Template assignments updated successfully!")
      router.push("/admin")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update assignments")
    } finally {
      setSubmitting(false)
    }
  }

  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [excludeHolidays, setExcludeHolidays] = useState(true)
  const [excludeWeekends, setExcludeWeekends] = useState(false)
  const [customExcludedDates, setCustomExcludedDates] = useState<Date[]>([])
  const [showCalendar, setShowCalendar] = useState(false)

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Link href="/admin">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Assign Report Template</h1>
            <p className="text-muted-foreground mt-2">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !template) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Link href="/admin">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Assign Report Template</h1>
            <p className="text-red-600 mt-2">Error: {error || "Template not found"}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/admin">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Assign Report Template</h1>
          <p className="text-muted-foreground mt-2">Assign "{template.name}" to team members</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{template.name}</CardTitle>
          <CardDescription>
            {template.description} • Frequency: {template.frequency}
          </CardDescription>
        </CardHeader>
      </Card>

      {template.schedule_type === "recurring" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" />
              Schedule Management
            </CardTitle>
            <CardDescription>Configure holidays and unavailability for this recurring template</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="exclude-holidays"
                    checked={excludeHolidays}
                    onCheckedChange={(checked) => setExcludeHolidays(checked === true)}
                  />
                  <Label htmlFor="exclude-holidays">Skip organization holidays</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="exclude-weekends"
                    checked={excludeWeekends}
                    onCheckedChange={(checked) => setExcludeWeekends(checked === true)}
                  />
                  <Label htmlFor="exclude-weekends">Skip weekends</Label>
                </div>

                {holidays.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Organization Holidays:</Label>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {holidays.map((holiday) => (
                        <div key={holiday.id} className="text-xs text-muted-foreground flex justify-between">
                          <span>{holiday.name}</span>
                          <span>{new Date(holiday.date).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Custom Excluded Dates</Label>
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowCalendar(!showCalendar)}>
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    {showCalendar ? "Hide Calendar" : "Select Dates"}
                  </Button>
                </div>

                {customExcludedDates.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {customExcludedDates.map((date, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {date.toLocaleDateString()}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0 ml-1 hover:bg-destructive hover:text-destructive-foreground"
                            onClick={() => setCustomExcludedDates(customExcludedDates.filter((_, i) => i !== index))}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {showCalendar && (
                  <div className="border rounded-lg p-4">
                    <Calendar
                      mode="multiple"
                      selected={customExcludedDates}
                      onSelect={(dates) => setCustomExcludedDates(dates || [])}
                      className="rounded-md border-0"
                      modifiers={{
                        holiday: holidays.map((h) => new Date(h.date)),
                        excluded: customExcludedDates,
                      }}
                      modifiersStyles={{
                        holiday: { backgroundColor: "#fef3c7", color: "#92400e" },
                        excluded: { backgroundColor: "#fee2e2", color: "#991b1b" },
                      }}
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Click dates to exclude them from the schedule. Yellow dates are holidays.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Select Team Members</CardTitle>
          <CardDescription>Choose which team members should be assigned this template</CardDescription>
        </CardHeader>
        <CardContent>
          {teamMembers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teamMembers.map((member) => (
                <div
                  key={member.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedMembers.has(member.id)
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => handleMemberToggle(member.id)}
                >
                  <div className="flex items-center space-x-3">
                    <Checkbox checked={selectedMembers.has(member.id)} onChange={() => handleMemberToggle(member.id)} />
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={member.avatar_url || undefined} />
                      <AvatarFallback>
                        {member.full_name?.charAt(0) || member.first_name?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {member.full_name || `${member.first_name} ${member.last_name}` || "Unnamed User"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={member.role === "admin" ? "default" : "secondary"} className="text-xs">
                          {member.role}
                        </Badge>
                        {member.position && <span className="text-xs text-muted-foreground">{member.position}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No team members found</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Link href="/admin">
          <Button variant="outline">Cancel</Button>
        </Link>
        <Button onClick={handleSubmitClick} disabled={submitting}>
          {submitting ? "Updating..." : "Update Report Assignments"}
        </Button>
      </div>

      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Assignment Changes</DialogTitle>
            <DialogDescription>
              {template && (
                <>
                  You are about to update assignments for "{template.name}".
                  <br />
                  <br />
                  <strong>{selectedMembers.size}</strong> team member(s) will be assigned to this template.
                  {selectedMembers.size > 0 && (
                    <>
                      <br />
                      <br />
                      Selected members:{" "}
                      {Array.from(selectedMembers)
                        .map((memberId) => {
                          const member = teamMembers.find((m) => m.id === memberId)
                          return member?.full_name || `${member?.first_name} ${member?.last_name}` || "Unknown"
                        })
                        .join(", ")}
                    </>
                  )}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Updating..." : "Confirm Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
