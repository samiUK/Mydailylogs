"use client"

import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Link from "next/link"
import { Edit, User, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

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
    assignmentId: string
    assigned_at: string
    status: string
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

function ProfileCard({
  member,
  onCancelAssignment,
}: { member: TeamMember; onCancelAssignment?: (assignmentId: string, templateName: string) => void }) {
  const regularJobs =
    member.assigned_templates?.filter(
      (t) => t.frequency === "daily" || t.frequency === "weekly" || t.frequency === "monthly",
    ) || []

  const customAssignments =
    member.assigned_templates?.filter(
      (t) => t.frequency !== "daily" && t.frequency !== "weekly" && t.frequency !== "monthly",
    ) || []

  return (
    <Card className="w-72 mx-auto">
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

          {regularJobs.length > 0 && (
            <div className="text-left">
              <p className="text-sm text-muted-foreground mb-2 font-semibold">Regular Jobs</p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {regularJobs.map((template) => (
                  <div
                    key={template.assignmentId}
                    className="flex items-center justify-between text-xs bg-blue-50 border border-blue-200 rounded px-2 py-1.5"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{template.name}</div>
                      <div className="text-muted-foreground capitalize">{template.frequency}</div>
                    </div>
                    {onCancelAssignment && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onCancelAssignment(template.assignmentId, template.name)
                        }}
                        className="ml-2 text-red-600 hover:text-red-800 transition-colors flex-shrink-0"
                        title="Cancel recurring assignment"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {customAssignments.length > 0 && (
            <div className="text-left">
              <p className="text-sm text-muted-foreground mb-2 font-semibold">Custom Assignments</p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {customAssignments.map((template) => (
                  <div
                    key={template.assignmentId}
                    className="flex items-center justify-between text-xs bg-yellow-50 border border-yellow-200 rounded px-2 py-1.5"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{template.name}</div>
                      <div className="text-muted-foreground capitalize">
                        {template.frequency === "custom" ? "One-time" : template.frequency}
                      </div>
                    </div>
                    {onCancelAssignment && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onCancelAssignment(template.assignmentId, template.name)
                        }}
                        className="ml-2 text-red-600 hover:text-red-800 transition-colors flex-shrink-0"
                        title="Cancel assignment"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {(regularJobs.length > 0 || customAssignments.length > 0) && (
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                Total: {regularJobs.length + customAssignments.length} active assignment
                {regularJobs.length + customAssignments.length !== 1 ? "s" : ""}
              </p>
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

function OrganizationalChart({
  members,
  onCancelAssignment,
}: { members: TeamMember[]; onCancelAssignment: (assignmentId: string, templateName: string) => void }) {
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
              <ProfileCard member={admin} onCancelAssignment={onCancelAssignment} />

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
                            <ProfileCard member={report} onCancelAssignment={onCancelAssignment} />
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
                  <ProfileCard key={staff.id} member={staff} onCancelAssignment={onCancelAssignment} />
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

export default function AdminTeamPage() {
  const router = useRouter()
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadTeamData() {
      try {
        const supabase = createClient()

        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          router.push("/auth/login")
          return
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("organization_id")
          .eq("id", user.id)
          .single()

        if (profileError || !profile?.organization_id) {
          setError("User profile not found")
          setLoading(false)
          return
        }

        const { data: membersData, error: membersError } = await supabase
          .from("profiles")
          .select(`
            *,
            supervisor:reports_to(id, first_name, last_name, full_name, email),
            template_assignments!template_assignments_assigned_to_fkey(
              id,
              is_active,
              checklist_templates(id, name, frequency)
            )
          `)
          .eq("organization_id", profile.organization_id)
          .order("role", { ascending: false })
          .order("created_at", { ascending: false })

        if (membersError) {
          setError(membersError.message)
          setLoading(false)
          return
        }

        const processedMembers =
          membersData?.map((member) => ({
            ...member,
            assigned_templates:
              member.template_assignments
                ?.filter((assignment: any) => assignment.is_active && assignment.checklist_templates)
                .map((assignment: any) => ({
                  ...assignment.checklist_templates,
                  assignmentId: assignment.id,
                  assigned_at: assignment.assigned_at,
                  status: assignment.status,
                })) || [],
          })) || []

        setMembers(processedMembers)
        setLoading(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred")
        setLoading(false)
      }
    }

    loadTeamData()
  }, [router])

  const handleCancelAssignment = async (assignmentId: string, templateName: string) => {
    if (
      confirm(
        `Are you sure you want to cancel "${templateName}"?\n\nThis will:\n• Stop the staff member from seeing this assignment\n• Preserve historical data for auditing\n• Can be reassigned later if needed`,
      )
    ) {
      try {
        const response = await fetch("/api/admin/cancel-assignment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assignmentId }),
        })

        if (response.ok) {
          window.location.reload()
        } else {
          const data = await response.json()
          alert(`Failed to cancel assignment: ${data.error || "Unknown error"}`)
        }
      } catch (error) {
        alert("Failed to cancel assignment. Please try again.")
        console.error("[v0] Error canceling assignment:", error)
      }
    }
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Team Management</h1>
            <p className="text-muted-foreground mt-2">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Team Management</h1>
            <p className="text-red-600 mt-2">Error: {error}</p>
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

      {members && members.length > 0 ? (
        <OrganizationalChart members={members} onCancelAssignment={handleCancelAssignment} />
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
