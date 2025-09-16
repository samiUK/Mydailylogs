"use client"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trash2, Users, Crown, ExternalLink, ChevronDown, UserCheck } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { MultiLevelDeleteDialog } from "@/components/multi-level-delete-dialog"
import { reportSecurity } from "@/lib/report-security"
import Link from "next/link"
import { useState, useEffect, useCallback, useMemo } from "react"
import { toast } from "sonner"

export const dynamic = "force-dynamic"

console.log("[v0] Admin Templates page - File loaded and parsing")

interface Template {
  id: string
  name: string
  description: string
  frequency: string
  is_active: boolean
  created_at: string
  created_by: string
  profiles?: {
    full_name: string
  }
}

interface TeamMember {
  id: string
  first_name: string
  last_name: string
  full_name: string
  role: string
}

export default function AdminTemplatesPage() {
  console.log("[v0] Admin Templates page - Component function called")

  const [templates, setTemplates] = useState<Template[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [assigningTemplate, setAssigningTemplate] = useState<string | null>(null)
  const [selectedMembers, setSelectedMembers] = useState<{ [key: string]: string[] }>({})
  const [assignConfirmOpen, setAssignConfirmOpen] = useState<string | null>(null)

  const activeTemplatesCount = useMemo(() => {
    return templates.filter((t) => t.is_active).length
  }, [templates])

  const templatesByStatus = useMemo(() => {
    return {
      active: templates.filter((t) => t.is_active),
      inactive: templates.filter((t) => !t.is_active),
    }
  }, [templates])

  useEffect(() => {
    const loadData = async () => {
      const isMasterAdminImpersonating = localStorage.getItem("masterAdminImpersonation") === "true"
      const impersonatedUserEmail = localStorage.getItem("impersonatedUserEmail")

      console.log("[v0] Admin Templates page - Master admin impersonating:", isMasterAdminImpersonating)
      console.log("[v0] Admin Templates page - Impersonated user email:", impersonatedUserEmail)

      const supabase = createClient()

      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()

      console.log("[v0] Admin Templates page - Authenticated user ID:", authUser?.id)

      if (!authUser) {
        console.log("[v0] Admin Templates page - No authenticated user found, redirecting to login")
        window.location.href = "/auth/login"
        return
      }

      let user: any = authUser
      let profileData: any = null

      if (isMasterAdminImpersonating && impersonatedUserEmail) {
        const { data: masterAdminCheck } = await supabase
          .from("superusers")
          .select("email")
          .eq("email", authUser.email)
          .eq("is_active", true)
          .single()

        if (masterAdminCheck) {
          const { data: impersonatedProfile, error: impersonatedError } = await supabase
            .from("profiles")
            .select("*")
            .eq("email", impersonatedUserEmail)
            .single()

          console.log("[v0] Admin Templates page - Impersonated profile error:", impersonatedError)
          console.log("[v0] Admin Templates page - Impersonated profile found:", impersonatedProfile?.id)

          if (impersonatedProfile) {
            user = { id: impersonatedProfile.id }
            profileData = impersonatedProfile
          }
        } else {
          console.log("[v0] Admin Templates page - Invalid master admin session, clearing impersonation")
          localStorage.removeItem("masterAdminImpersonation")
          localStorage.removeItem("impersonatedUserEmail")
          localStorage.removeItem("impersonatedUserRole")
          localStorage.removeItem("impersonatedOrganizationId")
          localStorage.removeItem("masterAdminType")
        }
      }

      if (!profileData) {
        const { data: regularProfile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", authUser.id)
          .single()

        console.log("[v0] Admin Templates page - Profile query error:", profileError)
        console.log("[v0] Admin Templates page - Profile found, organization_id:", regularProfile?.organization_id)

        if (profileError || !regularProfile) {
          console.log("[v0] Admin Templates page - Profile not found, redirecting to login")
          window.location.href = "/auth/login"
          return
        }

        profileData = regularProfile
        user = authUser
      }

      if (!user || !profileData) {
        console.log("[v0] Admin Templates page - No valid user or profile, redirecting to login")
        window.location.href = "/auth/login"
        return
      }

      setProfile(profileData)

      const [templatesRes, teamMembersRes] = await Promise.all([
        supabase
          .from("checklist_templates")
          .select("id, name, description, frequency, is_active, created_at, created_by")
          .eq("organization_id", profileData.organization_id)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("profiles")
          .select("id, first_name, last_name, full_name, role")
          .eq("organization_id", profileData.organization_id)
          .neq("id", user.id)
          .order("first_name")
          .limit(50),
      ])

      let templatesWithCreators = templatesRes.data || []
      if (templatesRes.data?.length > 0) {
        const creatorIds = [...new Set(templatesRes.data.map((t) => t.created_by).filter(Boolean))]
        if (creatorIds.length > 0) {
          const { data: creators } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", creatorIds)
            .limit(20)

          const creatorsMap = new Map(creators?.map((c) => [c.id, c]) || [])
          templatesWithCreators = templatesRes.data.map((template) => ({
            ...template,
            profiles: creatorsMap.get(template.created_by) || null,
          }))
        }
      }

      setTemplates(templatesWithCreators)
      setTeamMembers(teamMembersRes.data || [])
    }

    loadData()
  }, [])

  const handleAssign = useCallback(
    async (templateId: string, memberIds: string[]) => {
      if (memberIds.length === 0) return

      setAssigningTemplate(templateId)

      try {
        await reportSecurity.logReportAccess(templateId, "submitted_report", "create", {
          action: "template_assignment",
          assigned_to: memberIds,
          assigned_count: memberIds.length,
        })

        const response = await fetch("/api/admin/assign-template", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            templateId,
            memberIds,
            organizationId: profile?.organization_id,
          }),
        })

        if (!response.ok) throw new Error("Failed to assign template")

        setSelectedMembers((prev) => ({ ...prev, [templateId]: [] }))
        setAssignConfirmOpen(null)
        toast.success("Template assigned successfully!")
      } catch (error) {
        console.error("Error assigning template:", error)
        toast.error("Failed to assign template")
      } finally {
        setAssigningTemplate(null)
      }
    },
    [profile?.organization_id],
  )

  const toggleMember = useCallback((templateId: string, memberId: string) => {
    setSelectedMembers((prev) => {
      const current = prev[templateId] || []
      const updated = current.includes(memberId) ? current.filter((id) => id !== memberId) : [...current, memberId]
      return { ...prev, [templateId]: updated }
    })
  }, [])

  const selectAllMembers = useCallback(
    (templateId: string) => {
      setSelectedMembers((prev) => ({
        ...prev,
        [templateId]: teamMembers.map((member) => member.id),
      }))
    },
    [teamMembers],
  )

  const clearSelection = useCallback((templateId: string) => {
    setSelectedMembers((prev) => ({ ...prev, [templateId]: [] }))
  }, [])

  const handleAssignConfirm = (templateId: string) => {
    const memberIds = selectedMembers[templateId] || []
    if (memberIds.length === 0) return

    setAssignConfirmOpen(templateId)
  }

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      const template = templates.find((t) => t.id === templateId)
      if (!template) throw new Error("Template not found")

      await reportSecurity.createReportBackup(templateId, "submitted_report", "pre_deletion")

      await reportSecurity.logReportAccess(templateId, "submitted_report", "delete", {
        template_name: template.name,
        template_frequency: template.frequency,
        deletion_reason: "admin_initiated",
      })

      const formData = new FormData()
      formData.append("id", templateId)

      const response = await fetch("/api/admin/delete-template", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) throw new Error("Failed to delete template")

      setTemplates(templates.filter((t) => t.id !== templateId))
      toast.success("Template deleted successfully!")
    } catch (error) {
      console.error("Error deleting template:", error)
      toast.error("Failed to delete template")
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Report Templates</h1>
          <p className="text-muted-foreground mt-2">Create and manage your compliance report templates</p>
        </div>
        <Link href="/admin/templates/new">
          <Button>Create Report Template</Button>
        </Link>
      </div>

      {templates && templates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <Card key={template.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <CardDescription className="mt-1">{template.description}</CardDescription>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      template.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {template.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>Frequency: {template.frequency}</p>
                  <p>Created by: {template.profiles?.full_name}</p>
                  <p>Created: {new Date(template.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-2 mt-4">
                  <Link href={`/admin/templates/${template.id}`}>
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                  </Link>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" disabled={assigningTemplate === template.id}>
                        {assigningTemplate === template.id ? "Assigning..." : "Assign"}
                        <ChevronDown className="ml-2 h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem onClick={() => selectAllMembers(template.id)}>
                        <Users className="mr-2 h-4 w-4" />
                        Select All ({teamMembers.length})
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => clearSelection(template.id)}>Clear Selection</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {teamMembers.map((member) => (
                        <DropdownMenuItem key={member.id} onClick={() => toggleMember(template.id, member.id)}>
                          <div className="flex items-center w-full">
                            <input
                              type="checkbox"
                              checked={(selectedMembers[template.id] || []).includes(member.id)}
                              onChange={() => {}}
                              className="mr-2"
                            />
                            <span className="flex-1">
                              {member.full_name || `${member.first_name} ${member.last_name}`}
                            </span>
                            <span className="text-xs text-muted-foreground ml-2">{member.role}</span>
                          </div>
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleAssignConfirm(template.id)}
                        disabled={(selectedMembers[template.id] || []).length === 0}
                      >
                        <UserCheck className="mr-2 h-4 w-4" />
                        Assign to {(selectedMembers[template.id] || []).length} member(s)
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled
                    className="text-amber-600 hover:text-amber-700 border-amber-200 hover:border-amber-300 bg-transparent"
                    title="Premium feature - Share forms with external contractors"
                  >
                    <Crown className="w-4 h-4 mr-1" />
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Share
                  </Button>

                  <MultiLevelDeleteDialog
                    trigger={
                      <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 bg-transparent">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    }
                    title="Delete Report Template"
                    description="This will permanently remove the template and may affect business operations."
                    itemName={template.name}
                    itemDetails={{
                      Frequency: template.frequency,
                      "Created by": template.profiles?.full_name || "Unknown",
                      Created: new Date(template.created_at).toLocaleDateString(),
                      Status: template.is_active ? "Active" : "Inactive",
                    }}
                    riskLevel="high"
                    requiresSecureSession={true}
                    onConfirm={() => handleDeleteTemplate(template.id)}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <h3 className="text-lg font-semibold text-foreground mb-2">No report templates yet</h3>
            <p className="text-muted-foreground mb-4">Create your first report template to get started</p>
            <Link href="/admin/templates/new">
              <Button>Create Your First Report Template</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <Dialog open={assignConfirmOpen !== null} onOpenChange={(open) => !open && setAssignConfirmOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Assignment</DialogTitle>
            <DialogDescription>
              {assignConfirmOpen && (
                <>
                  Are you sure you want to assign "{templates.find((t) => t.id === assignConfirmOpen)?.name}" to{" "}
                  {(selectedMembers[assignConfirmOpen] || []).length} team member(s)?
                  <br />
                  <br />
                  Selected members:{" "}
                  {(selectedMembers[assignConfirmOpen] || [])
                    .map((memberId) => {
                      const member = teamMembers.find((m) => m.id === memberId)
                      return member?.full_name || `${member?.first_name} ${member?.last_name}`
                    })
                    .join(", ")}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignConfirmOpen(null)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                assignConfirmOpen && handleAssign(assignConfirmOpen, selectedMembers[assignConfirmOpen] || [])
              }
            >
              Confirm Assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
