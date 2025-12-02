import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { User } from "lucide-react"

console.log("[v0] Staff Team page - File loaded and parsing")

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
  }>
  supervisor?: {
    id: string
    first_name: string | null
    last_name: string | null
    full_name: string | null
    email: string
  } | null
}

function ProfileCard({ member }: { member: TeamMember }) {
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
          {member.assigned_templates &&
            member.assigned_templates.filter(
              (t: any) => t.frequency === "daily" || t.frequency === "weekly" || t.frequency === "monthly",
            ).length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Regular Jobs</p>
                <div className="space-y-1">
                  {member.assigned_templates
                    .filter(
                      (template: any) =>
                        template.frequency === "daily" ||
                        template.frequency === "weekly" ||
                        template.frequency === "monthly",
                    )
                    .slice(0, 2)
                    .map((template) => (
                      <div key={template.id} className="text-xs bg-secondary/50 rounded px-2 py-1">
                        {template.name} ({template.frequency})
                      </div>
                    ))}
                  {member.assigned_templates.filter(
                    (t: any) => t.frequency === "daily" || t.frequency === "weekly" || t.frequency === "monthly",
                  ).length > 2 && (
                    <div className="text-xs text-muted-foreground">
                      +
                      {member.assigned_templates.filter(
                        (t: any) => t.frequency === "daily" || t.frequency === "weekly" || t.frequency === "monthly",
                      ).length - 2}{" "}
                      more
                    </div>
                  )}
                </div>
              </div>
            )}
        </div>
      </CardContent>
    </Card>
  )
}

function OrganizationalChart({ members }: { members: TeamMember[] }) {
  // Find admins (top level)
  const admins = members.filter((member) => member.role === "admin")

  // Find staff members and group by supervisor
  const getDirectReports = (supervisorId: string) => {
    return members.filter((member) => member.reports_to === supervisorId)
  }

  return (
    <div className="space-y-12">
      {/* Admin Level */}
      <div className="text-center">
        <h3 className="text-lg font-semibold text-foreground mb-6">Leadership</h3>
        <div className="flex flex-wrap justify-center gap-8">
          {admins.map((admin) => (
            <div key={admin.id} className="flex flex-col items-center">
              <ProfileCard member={admin} />

              {/* Direct Reports */}
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
                            <ProfileCard member={report} />
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

      {/* Unassigned Staff */}
      {(() => {
        const unassignedStaff = members.filter((member) => member.role === "staff" && !member.reports_to)
        if (unassignedStaff.length > 0) {
          return (
            <div className="text-center">
              <h3 className="text-lg font-semibold text-foreground mb-6">Team Members</h3>
              <div className="flex flex-wrap justify-center gap-6">
                {unassignedStaff.map((staff) => (
                  <ProfileCard key={staff.id} member={staff} />
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

export default async function StaffTeamPage() {
  console.log("[v0] Staff Team page - Component function called")

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    console.log("[v0] Staff Team page - No user found, returning null")
    return null
  }

  const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single()

  if (!profile) {
    console.log("[v0] Staff Team page - No profile found, returning null")
    return null
  }

  console.log("[v0] Staff Team page - User found:", user.id)
  console.log("[v0] Staff Team page - Profile found, organization_id:", profile.organization_id)

  const { data: members, error: membersError } = await supabase
    .from("profiles")
    .select(`
      id,
      email,
      full_name,
      first_name,
      last_name,
      role,
      position,
      avatar_url,
      created_at,
      reports_to,
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

  if (membersError || !members) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Team Directory</h1>
          <p className="text-red-600 mt-2">Error loading team members</p>
        </div>
      </div>
    )
  }

  const processedMembers = members.map((member) => ({
    ...member,
    assigned_templates:
      member.template_assignments
        ?.filter((assignment: any) => assignment.is_active && assignment.checklist_templates)
        .map((assignment: any) => assignment.checklist_templates) || [],
  }))

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Team Directory</h1>
        <p className="text-muted-foreground mt-2">View your organization's team structure and hierarchy</p>
      </div>

      {processedMembers && processedMembers.length > 0 ? (
        <OrganizationalChart members={processedMembers} />
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No team members found</h3>
            <p className="text-muted-foreground">Contact your administrator for more information</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
