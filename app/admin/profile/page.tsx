"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { User } from "lucide-react"
import { useRouter } from "next/navigation"

interface Profile {
  id: string
  email: string
  first_name: string
  last_name: string
  full_name: string
  role: string
  avatar_url?: string
  organization_name?: string
  position?: string
  phone?: string
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  useEffect(() => {
    async function loadProfileData() {
      const supabase = createClient()

      try {
        // Get current user
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
          router.push("/auth/login")
          return
        }

        // Load profile
        const { data: profileData } = await supabase
          .from("profiles")
          .select(`
            *,
            organizations!inner(name)
          `)
          .eq("id", user.id)
          .single()

        if (profileData) {
          setProfile({
            ...profileData,
            organization_name: profileData.organizations?.name,
          })
        }
      } catch (error) {
        console.error("Error loading profile data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadProfileData()
  }, [router])

  const handleSaveProfile = async () => {
    if (!profile) return

    setSaving(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: profile.first_name,
          last_name: profile.last_name,
          full_name: `${profile.first_name} ${profile.last_name}`,
          position: profile.position,
          phone: profile.phone,
        })
        .eq("id", profile.id)

      if (error) throw error
    } catch (error) {
      console.error("Error saving profile:", error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="flex justify-center py-8">Loading profile...</div>
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Profile</h1>
        <p className="text-muted-foreground mt-2">Manage your personal information</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Personal Information
          </CardTitle>
          <CardDescription>Update your personal details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="organizationName" required>
              Organization Name *
            </Label>
            <Input id="organizationName" value={profile?.organization_name || ""} disabled className="bg-gray-50" />
            <p className="text-sm text-muted-foreground">Organization name cannot be changed</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="position">Position</Label>
            <Input
              id="position"
              value={profile?.position || ""}
              onChange={(e) => setProfile((prev) => (prev ? { ...prev, position: e.target.value } : null))}
              placeholder="e.g. Manager, Director, Team Lead"
              className="bg-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName" required>
                First Name *
              </Label>
              <Input
                id="firstName"
                value={profile?.first_name || ""}
                onChange={(e) => setProfile((prev) => (prev ? { ...prev, first_name: e.target.value } : null))}
                className="bg-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName" required>
                Last Name *
              </Label>
              <Input
                id="lastName"
                value={profile?.last_name || ""}
                onChange={(e) => setProfile((prev) => (prev ? { ...prev, last_name: e.target.value } : null))}
                className="bg-white"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" required>
              Email *
            </Label>
            <Input id="email" value={profile?.email || ""} disabled className="bg-gray-50" />
            <p className="text-sm text-muted-foreground">Email cannot be changed</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              value={profile?.phone || ""}
              onChange={(e) => setProfile((prev) => (prev ? { ...prev, phone: e.target.value } : null))}
              placeholder="e.g. +44 7123 456789"
              className="bg-white"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Input id="role" value={profile?.role || ""} disabled className="bg-gray-50" />
          </div>
          <Button onClick={handleSaveProfile} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
