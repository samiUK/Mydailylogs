"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Trash2, Users } from "lucide-react"
import Link from "next/link"

interface Template {
  id: string
  name: string
  description: string
  frequency: string
  is_active: boolean
  created_at: string
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

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)

  const supabase = createClient()

  const commonRoles = [
    "Manager",
    "Supervisor",
    "Staff",
    "Kitchen Staff",
    "Front Desk",
    "Maintenance",
    "Security",
    "Cleaning",
    "Admin",
    "Technician",
  ]

  const loadTemplates = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      // Get user's organization
      const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single()

      // Get templates for this organization
      const { data: templatesData } = await supabase
        .from("checklist_templates")
        .select("*, profiles!checklist_templates_created_by_fkey(full_name)")
        .eq("organization_id", profile?.organization_id)
        .order("created_at", { ascending: false })

      setTemplates(templatesData || [])
    } catch (error) {
      console.error("Error loading templates:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadTeamMembers = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single()

      const { data: members } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, full_name, role")
        .eq("organization_id", profile?.organization_id)
        .neq("id", user.id)
        .order("first_name")

      setTeamMembers(members || [])
    } catch (error) {
      console.error("Error loading team members:", error)
    }
  }

  const handleDelete = async (templateId: string) => {
    setDeleting(templateId)
    try {
      const response = await fetch(`/api/admin/delete-template?id=${templateId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete template")
      }

      // Remove template from local state
      setTemplates(templates.filter((t) => t.id !== templateId))
    } catch (error) {
      console.error("Error deleting template:", error)
      alert("Failed to delete template. Please try again.")
    } finally {
      setDeleting(null)
    }
  }

  useEffect(() => {
    const fetchUserData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single()
        setProfile(profile)
      }
    }
    fetchUserData()
    loadTemplates()
    loadTeamMembers()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="text-muted-foreground mt-2">Loading templates...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Checklist Templates</h1>
          <p className="text-muted-foreground mt-2">Create and manage your compliance checklist templates</p>
        </div>
        <Link href="/admin/templates/new">
          <Button>Create Template</Button>
        </Link>
      </div>

      {/* Templates Grid */}
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
                  <TemplateAssignDropdown template={template} teamMembers={teamMembers} />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 bg-transparent">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Template</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{template.name}"? This action cannot be undone and will also
                          delete all associated tasks.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(template.id)}
                          disabled={deleting === template.id}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          {deleting === template.id ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <h3 className="text-lg font-semibold text-foreground mb-2">No templates yet</h3>
            <p className="text-muted-foreground mb-4">Create your first checklist template to get started</p>
            <Link href="/admin/templates/new">
              <Button>Create Your First Template</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function TemplateAssignDropdown({
  template,
  teamMembers,
}: {
  template: Template
  teamMembers: TeamMember[]
}) {
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [assigning, setAssigning] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)

  const handleAssign = async () => {
    if (selectedMembers.length === 0) return

    setAssigning(true)
    try {
      const response = await fetch("/api/admin/assign-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: template.id,
          memberIds: selectedMembers,
        }),
      })

      if (!response.ok) throw new Error("Failed to assign template")

      setSelectedMembers([])
      setShowDropdown(false)
    } catch (error) {
      console.error("Error assigning template:", error)
      alert("Failed to assign template. Please try again.")
    } finally {
      setAssigning(false)
    }
  }

  const toggleMember = (memberId: string) => {
    setSelectedMembers((prev) => (prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]))
  }

  const selectAll = () => {
    setSelectedMembers(teamMembers.map((m) => m.id))
  }

  const clearAll = () => {
    setSelectedMembers([])
  }

  return (
    <div className="relative">
      <Button size="sm" variant="outline" onClick={() => setShowDropdown(!showDropdown)} disabled={assigning}>
        <Users className="w-4 h-4 mr-1" />
        {assigning ? "Assigning..." : "Assign"}
      </Button>

      {showDropdown && (
        <div className="absolute left-0 top-full mt-1 w-64 bg-white border rounded-lg shadow-lg z-10">
          <div className="p-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Assign to Team</span>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={selectAll} className="text-xs h-6">
                  All
                </Button>
                <Button size="sm" variant="ghost" onClick={clearAll} className="text-xs h-6">
                  Clear
                </Button>
              </div>
            </div>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {teamMembers.map((member) => (
                <label
                  key={member.id}
                  className="flex items-center space-x-2 text-sm cursor-pointer hover:bg-gray-50 p-1 rounded"
                >
                  <input
                    type="checkbox"
                    checked={selectedMembers.includes(member.id)}
                    onChange={() => toggleMember(member.id)}
                    className="rounded"
                  />
                  <span className="flex-1">{member.full_name}</span>
                  <span className="text-xs text-muted-foreground">{member.role}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                onClick={handleAssign}
                disabled={selectedMembers.length === 0 || assigning}
                className="flex-1"
              >
                Assign ({selectedMembers.length})
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowDropdown(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
