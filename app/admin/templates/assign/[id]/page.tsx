"use client"

import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Users } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

interface Template {
  id: string
  name: string
  description: string | null
  frequency: string
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

export default function AssignTemplatePage({ params }: { params: { id: string } }) {
  const [template, setTemplate] = useState<Template | null>(null)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    loadData()
  }, [params.id])

  const loadData = async () => {
    try {
      setLoading(true)
      const supabase = createClient()

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      // Get user's organization
      const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single()

      if (!profile) throw new Error("Profile not found")

      // Get template details
      const { data: templateData, error: templateError } = await supabase
        .from("checklist_templates")
        .select("id, name, description, frequency")
        .eq("id", params.id)
        .eq("organization_id", profile.organization_id)
        .single()

      if (templateError) throw templateError
      setTemplate(templateData)

      // Get team members and their assignment status
      const { data: members, error: membersError } = await supabase
        .from("profiles")
        .select(`
          id, email, full_name, first_name, last_name, role, position, avatar_url,
          template_assignments!left(id, is_active)
        `)
        .eq("organization_id", profile.organization_id)
        .neq("id", user.id) // Exclude current user

      if (membersError) throw membersError

      // Process members to include assignment status
      const processedMembers =
        members?.map((member) => ({
          ...member,
          is_assigned:
            member.template_assignments?.some(
              (assignment: any) => assignment.is_active && assignment.template_id === params.id,
            ) || false,
        })) || []

      setTeamMembers(processedMembers)

      // Pre-select already assigned members
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

      // Get currently assigned members
      const currentlyAssigned = teamMembers.filter((member) => member.is_assigned).map((member) => member.id)

      const newlySelected = Array.from(selectedMembers)

      // Members to unassign (were assigned but not selected now)
      const toUnassign = currentlyAssigned.filter((id) => !selectedMembers.has(id))

      // Members to assign (selected but not currently assigned)
      const toAssign = newlySelected.filter((id) => !currentlyAssigned.includes(id))

      // Unassign members
      if (toUnassign.length > 0) {
        const { error: unassignError } = await supabase
          .from("template_assignments")
          .update({ is_active: false })
          .eq("template_id", template.id)
          .in("assigned_to", toUnassign)

        if (unassignError) throw unassignError
      }

      // Assign new members
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

      router.push("/admin")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update assignments")
    } finally {
      setSubmitting(false)
    }
  }

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
      {/* Header */}
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

      {/* Template Info */}
      <Card>
        <CardHeader>
          <CardTitle>{template.name}</CardTitle>
          <CardDescription>
            {template.description} • Frequency: {template.frequency}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Team Members */}
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

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <Link href="/admin">
          <Button variant="outline">Cancel</Button>
        </Link>
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Updating..." : "Update Report Assignments"}
        </Button>
      </div>
    </div>
  )
}
