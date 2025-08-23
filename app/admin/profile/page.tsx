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
  const [isImpersonated, setIsImpersonated] = useState(false)
  const [impersonatedBy, setImpersonatedBy] = useState("")
  const router = useRouter()

  useEffect(() => {
    const checkImpersonation = () => {
      const isImpersonating = localStorage.getItem("masterAdminImpersonation") === "true"
      const impersonatedEmail = localStorage.getItem("impersonatedUserEmail") || ""
      setIsImpersonated(isImpersonating)
      setImpersonatedBy(impersonatedEmail)
    }

    checkImpersonation()

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
      {isImpersonated && (
        <div className="bg-orange-100 border-l-4 border-orange-500 p-4 rounded-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-orange-700">
                  <strong>IMPERSONATED SESSION</strong> - You are viewing this profile as: {impersonatedBy}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                localStorage.removeItem("masterAdminImpersonation")
                localStorage.removeItem("impersonatedUserEmail")
                localStorage.removeItem("impersonatedUserRole")
                localStorage.removeItem("impersonatedOrganizationId")
                window.location.href = "/masterdashboard"
              }}
              className="text-orange-700 hover:text-orange-900 text-sm font-medium"
            >
              Exit Impersonation
            </button>
          </div>
        </div>
      )}

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
