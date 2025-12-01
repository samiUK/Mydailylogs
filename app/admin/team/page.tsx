"use client"

import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Link from "next/link"
import { Edit, User, X } from "lucide-react"
import { redirect } from "next/navigation"
import React from "react"
import { cancelRecurringAssignment } from "@/app/actions/team"

export const dynamic = "force-dynamic"

console.log("[v0] Admin Team page - File loaded and parsing")

interface TeamMember {
  id: string
  email: string
  full_name: string | null
  first_name: string | null
  last_name: string | null
  role: string
  position: string | null
  avatar_url: string | null
  created_at: string
  reports_to: string | null
  assigned_templates?: Array<{
    id: string
    name: string
    frequency: string
    schedule_type: string
    assignment_id: string
  }>
  supervisor?: {
    id: string
    first_name: string | null
    last_name: string | null
    full_name: string | null
    email: string
  } | null
  organization_id?: string
}

function CancelAssignmentButton({
  assignmentId,
  organizationId,
  templateName,
}: {
  assignmentId: string
  organizationId: string
  templateName: string
}) {
  const [isPending, startTransition] = React.useTransition()

  const handleCancel = () => {
    if (
      confirm(
        `Are you sure you want to cancel the recurring assignment for "${templateName}"? No future tasks will be auto-assigned.`,
      )
    ) {
      startTransition(async () => {
        const result = await cancelRecurringAssignment(assignmentId, organizationId)
        if (result.success) {
          window.location.reload()
        } else {
          alert(`Failed to cancel assignment: ${result.error}`)
        }
      })
    }
  }

  return (
    <button
      onClick={handleCancel}
      disabled={isPending}
      className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
      title="Cancel recurring assignment"
    >
      <X className="w-3 h-3" />
    </button>
  )
}

function ProfileCard({ member, organizationId }: { member: TeamMember; organizationId: string }) {
  const recurringTemplates = member.assigned_templates?.filter((t: any) => t.schedule_type === "recurring") || []

  return (
    <Card className="w-64 mx-auto">
      <CardHeader className="text-center pb-4">
        <div className="flex justify-center mb-3">
          <Avatar className="w-16 h-16">
            <AvatarImage src={member.avatar_url || undefined} alt={member.full_name || member.email} />
            <AvatarFallback className="bg-primary/10 text-primary text-lg">
              {member.full_name?.charAt(0) || member.first_name?.charAt(0) || member.email?.charAt(0) || "?"}
            </AvatarFallback>
          </Avatar>
        </div>
        <CardTitle className="text-lg">
          {member.full_name || `${member.first_name} ${member.last_name}` || "Unnamed User"}
        </CardTitle>
        <CardDescription className="text-sm">{member.email}</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3 text-center">
          <div>
            <Badge variant={member.role === "admin" ? "default" : "secondary"} className="mb-2">
              {member.role}
            </Badge>
          </div>
          {member.position && (
            <div>
              <p className="text-sm text-muted-foreground">Position</p>
              <p className="text-sm font-medium">{member.position}</p>
            </div>
          )}
          {recurringTemplates.length > 0 && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Regular Jobs</p>
              <div className="space-y-1">
                {recurringTemplates.slice(0, 2).map((template: any) => (
                  <div
                    key={template.assignment_id}
                    className="flex items-center justify-between text-xs bg-secondary/50 rounded px-2 py-1"
                  >
                    <span className="flex-1 text-left truncate">
                      {template.name} ({template.frequency})
                    </span>
                    <CancelAssignmentButton
                      assignmentId={template.assignment_id}
                      organizationId={organizationId}
                      templateName={template.name}
                    />
                  </div>
                ))}
                {recurringTemplates.length > 2 && (
                  <div className="text-xs text-muted-foreground">+{recurringTemplates.length - 2} more</div>
                )}
              </div>
            </div>
          )}
          <div className="flex gap-2 justify-center mt-4">
            <Link href={`/admin/team/edit/${member.id}`}>
              <Button variant="outline" size="sm">
                <Edit className="w-4 h-4 mr-1" />
                Edit
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function OrganizationalChart({ members, organizationId }: { members: TeamMember[]; organizationId: string }) {
  const admins = members.filter((member) => member.role === "admin")

  const getDirectReports = (supervisorId: string) => {
    return members.filter((member) => member.reports_to === supervisorId)
  }

  return (
    <div className="space-y-12">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-foreground mb-6">Leadership</h3>
        <div className="flex flex-wrap justify-center gap-8">
          {admins.map((admin) => (
            <div key={admin.id} className="flex flex-col items-center">
              <ProfileCard member={admin} organizationId={organizationId} />

              {(() => {
                const directReports = getDirectReports(admin.id)
                if (directReports.length > 0) {
                  return (
                    <div className="mt-8">
                      <div className="w-px h-8 bg-border mx-auto mb-4"></div>
                      <div className="flex flex-wrap justify-center gap-6">
                        {directReports.map((report) => (
                          <div key={report.id} className="relative">
                            <div className="w-px h-4 bg-border mx-auto mb-2"></div>
                            <ProfileCard member={report} organizationId={organizationId} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                }
                return null
              })()}
            </div>
          ))}
        </div>
      </div>

      {(() => {
        const unassignedStaff = members.filter((member) => member.role === "staff" && !member.reports_to)
        if (unassignedStaff.length > 0) {
          return (
            <div className="text-center">
              <h3 className="text-lg font-semibold text-foreground mb-6">Unassigned Staff</h3>
              <div className="flex flex-wrap justify-center gap-6">
                {unassignedStaff.map((staff) => (
                  <ProfileCard key={staff.id} member={staff} organizationId={organizationId} />
                ))}
              </div>
            </div>
          )
        }
        return null
      })()}
    </div>
  )
}

export default async function AdminTeamPage() {
  console.log("[v0] Admin Team page - Component function called")

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  console.log("[v0] Admin Team page - User ID:", user?.id)

  if (!user) {
    console.log("[v0] Admin Team page - No user found, redirecting to login")
    redirect("/auth/login")
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single()

  console.log("[v0] Admin Team page - Profile query error:", profileError)

  if (profileError || !profile?.organization_id) {
    console.log("[v0] Admin Team page - Profile not found or no organization")
    return (
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Team Management</h1>
            <p className="text-red-600 mt-2">Error: User profile not found</p>
          </div>
        </div>
        <Card>
          <CardContent className="text-center py-12">
            <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Unable to Load Team</h3>
            <p className="text-muted-foreground mb-4">
              Your user profile could not be found. Please try logging in again.
            </p>
            <Link href="/auth/login">
              <Button>Go to Login</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  console.log("[v0] Admin Team page - Profile found, organization_id:", profile.organization_id)

  const { data: members, error: membersError } = await supabase
    .from("profiles")
    .select(`
      *,
      supervisor:reports_to(id, first_name, last_name, full_name, email),
      template_assignments!template_assignments_assigned_to_fkey(
        id,
        is_active,
        checklist_templates(id, name, frequency, schedule_type)
      )
    `)
    .eq("organization_id", profile.organization_id)
    .order("role", { ascending: false })
    .order("created_at", { ascending: false })

  console.log("[v0] Admin Team page - Members query error:", membersError)
  console.log("[v0] Admin Team page - Members found:", members?.length || 0)

  if (membersError) {
    return (
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Team Management</h1>
            <p className="text-red-600 mt-2">Error: {membersError.message}</p>
          </div>
        </div>
        <Card>
          <CardContent className="text-center py-12">
            <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Unable to Load Team</h3>
            <p className="text-muted-foreground mb-4">There was an error loading your team members.</p>
            <Link href="/admin/team">
              <Button>Try Again</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const processedMembers =
    members?.map((member) => ({
      ...member,
      assigned_templates:
        member.template_assignments
          ?.filter((assignment: any) => assignment.is_active && assignment.checklist_templates)
          .map((assignment: any) => ({
            ...assignment.checklist_templates,
            assignment_id: assignment.id,
          })) || [],
    })) || []

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Team Management</h1>
          <p className="text-muted-foreground mt-2">Organizational chart showing reporting relationships</p>
        </div>
        <Link href="/admin/team/add">
          <Button>Add Team Member</Button>
        </Link>
      </div>

      {processedMembers && processedMembers.length > 0 ? (
        <OrganizationalChart members={processedMembers} organizationId={profile.organization_id} />
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No team members yet</h3>
            <p className="text-muted-foreground mb-4">Add your first team member to get started</p>
            <Link href="/admin/team/add">
              <Button>Add Team Member</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
