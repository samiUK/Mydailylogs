"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

interface Profile {
  id: string
  first_name: string | null
  last_name: string | null
  full_name: string | null
  email: string
  position: string | null
  role: string
  reports_to: string | null
}

interface AdminProfile {
  id: string
  first_name: string | null
  last_name: string | null
  full_name: string | null
  email: string
}

interface EditTeamMemberClientProps {
  memberId: string
}

export function EditTeamMemberClient({ memberId }: EditTeamMemberClientProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [member, setMember] = useState<Profile | null>(null)
  const [admins, setAdmins] = useState<AdminProfile[]>([])
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    position: "",
    role: "staff",
    reports_to: "none",
  })

  useEffect(() => {
    if (memberId) {
      loadMemberData()
      loadAdmins()
    }
  }, [memberId])

  const loadMemberData = async () => {
    const { data: member } = await supabase.from("profiles").select("*").eq("id", memberId).single()

    if (member) {
      setMember(member)
      setFormData({
        first_name: member.first_name || "",
        last_name: member.last_name || "",
        position: member.position || "",
        role: member.role || "staff",
        reports_to: member.reports_to || "none",
      })
    }
  }

  const loadAdmins = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single()

    const { data: admins } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, full_name, email")
      .eq("organization_id", profile?.organization_id)
      .eq("role", "admin")

    setAdmins(admins || [])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const fullName = `${formData.first_name} ${formData.last_name}`.trim()

      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          full_name: fullName,
          position: formData.position,
          role: formData.role,
          reports_to: formData.reports_to === "none" ? null : formData.reports_to,
        })
        .eq("id", memberId)

      if (error) throw error

      router.push("/admin/team")
    } catch (error) {
      console.error("Error updating team member:", error)
      alert("Failed to update team member. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (!member) {
    return <div>Loading...</div>
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/admin/team">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Team
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Edit Team Member</h1>
          <p className="text-muted-foreground mt-2">Update team member information</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team Member Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="position">Position</Label>
              <Input
                id="position"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                placeholder="e.g., Marketing Manager, Sales Representative"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reports_to">Reports To</Label>
              <Select
                value={formData.reports_to}
                onValueChange={(value) => setFormData({ ...formData, reports_to: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select supervisor (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No supervisor</SelectItem>
                  {admins.map((admin) => (
                    <SelectItem key={admin.id} value={admin.id}>
                      {admin.full_name || `${admin.first_name} ${admin.last_name}` || admin.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>
                {loading ? "Updating..." : "Update Team Member"}
              </Button>
              <Link href="/admin/team">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
