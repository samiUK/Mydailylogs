"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { User, Mail, Camera, Phone, MapPin, Briefcase, Building } from "lucide-react"
import { useRouter } from "next/navigation"

interface Profile {
  id: string
  first_name: string | null
  last_name: string | null
  full_name: string
  email: string
  avatar_url: string | null
  phone: string | null
  position: string | null
  address_line_1: string | null
  address_line_2: string | null
  city: string | null
  postcode: string | null
  country: string | null
  organization_id: string | null
}

interface Organization {
  id: string
  name: string
}

export default function StaffProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState("")
  const [isImpersonated, setIsImpersonated] = useState(false)
  const [impersonatedBy, setImpersonatedBy] = useState("")
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const checkImpersonation = () => {
      const isImpersonating = localStorage.getItem("masterAdminImpersonation") === "true"
      const impersonatedEmail = localStorage.getItem("impersonatedUserEmail") || ""
      setIsImpersonated(isImpersonating)
      setImpersonatedBy(impersonatedEmail)
    }

    checkImpersonation()

    async function loadProfile() {
      try {
        const impersonationContext = sessionStorage.getItem("masterAdminImpersonation")
        let currentUser: any = null

        if (impersonationContext) {
          const impersonationData = JSON.parse(impersonationContext)

          const { data: targetProfile } = await supabase
            .from("profiles")
            .select("*")
            .eq("email", impersonationData.targetUserEmail)
            .single()

          if (targetProfile) {
            currentUser = { id: targetProfile.id, email: impersonationData.targetUserEmail }
            setProfile(targetProfile)
          }
        }

        if (!currentUser) {
          // Regular authentication flow
          const {
            data: { user },
          } = await supabase.auth.getUser()

          if (!user) {
            router.push("/auth/login")
            return
          }

          currentUser = user

          const { data: profileData, error } = await supabase.from("profiles").select("*").eq("id", user.id).single()

          if (error) throw error
          setProfile(profileData)
        }

        if (profile && profile.organization_id) {
          const { data: orgData, error: orgError } = await supabase
            .from("organizations")
            .select("id, name")
            .eq("id", profile.organization_id)
            .single()

          if (!orgError && orgData) {
            setOrganization(orgData)
          }
        }
      } catch (error) {
        console.error("Error loading profile:", error)
        setMessage("Error loading profile")
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [supabase, router])

  async function handlePhotoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file || !profile) return

    if (!file.type.startsWith("image/")) {
      setMessage("Please select an image file")
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setMessage("File size must be less than 2MB")
      return
    }

    setUploading(true)
    setMessage("")

    try {
      const fileExt = file.name.split(".").pop()
      const fileName = `${profile.id}-${Date.now()}.${fileExt}`
      const filePath = `${profile.id}/${fileName}`

      const { error: uploadError } = await supabase.storage.from("profile-photos").upload(filePath, file)

      if (uploadError) throw uploadError

      const {
        data: { publicUrl },
      } = supabase.storage.from("profile-photos").getPublicUrl(filePath)

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", profile.id)

      if (updateError) throw updateError

      setProfile({ ...profile, avatar_url: publicUrl })
      setMessage("Profile photo updated successfully!")
    } catch (error) {
      console.error("Error uploading photo:", error)
      setMessage(`Error uploading photo: ${error.message}`)
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!profile) return

    setSaving(true)
    setMessage("")

    try {
      const formData = new FormData(e.currentTarget)
      const firstName = formData.get("firstName") as string
      const lastName = formData.get("lastName") as string
      const email = formData.get("email") as string
      const position = formData.get("position") as string
      const phone = formData.get("phone") as string
      const addressLine1 = formData.get("addressLine1") as string
      const addressLine2 = formData.get("addressLine2") as string
      const city = formData.get("city") as string
      const postcode = formData.get("postcode") as string
      const country = formData.get("country") as string

      const fullName = `${firstName} ${lastName}`.trim()

      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: firstName,
          last_name: lastName,
          full_name: fullName,
          email: email,
          position: position,
          phone: phone,
          address_line_1: addressLine1,
          address_line_2: addressLine2,
          city: city,
          postcode: postcode,
          country: country,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id)

      if (error) throw error

      setProfile({
        ...profile,
        first_name: firstName,
        last_name: lastName,
        full_name: fullName,
        email: email,
        position: position,
        phone: phone,
        address_line_1: addressLine1,
        address_line_2: addressLine2,
        city: city,
        postcode: postcode,
        country: country,
      })

      setMessage("Profile updated successfully!")
      setTimeout(() => {
        router.push("/staff")
      }, 1500)
    } catch (error) {
      console.error("Error updating profile:", error)
      setMessage(`Error updating profile: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="max-w-2xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="space-y-4">
              <div className="h-32 bg-gray-200 rounded"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="container mx-auto py-8">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-red-600">Error loading profile</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-2xl mx-auto">
        {isImpersonated && (
          <div className="bg-orange-100 border-l-4 border-orange-500 p-4 rounded-md mb-6">
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

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Profile Settings</h1>
          <p className="text-muted-foreground mt-2">Manage your personal information and preferences</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Personal Information
            </CardTitle>
            <CardDescription>Update your personal details and contact information</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={profile.avatar_url || undefined} />
                    <AvatarFallback className="text-lg">
                      {profile.first_name?.[0] || profile.full_name?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                  {uploading && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                    </div>
                  )}
                </div>
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 bg-white"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    <Camera className="h-4 w-4" />
                    {uploading ? "Uploading..." : "Upload Photo"}
                  </Button>
                  <p className="text-sm text-gray-500 mt-1">JPG, PNG up to 2MB</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="organizationName" className="flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Organization
                </Label>
                <Input
                  id="organizationName"
                  name="organizationName"
                  value={organization?.name || ""}
                  disabled
                  className="bg-gray-50 text-gray-600"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="position" className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Position
                </Label>
                <Input
                  id="position"
                  name="position"
                  defaultValue={profile.position || ""}
                  placeholder="e.g. Manager, Developer, Analyst"
                  className="bg-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email Address
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={profile.email}
                  required
                  className="bg-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Phone Number
                </Label>
                <Input id="phone" name="phone" type="tel" defaultValue={profile.phone || ""} className="bg-white" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    defaultValue={profile.first_name || ""}
                    required
                    className="bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    defaultValue={profile.last_name || ""}
                    required
                    className="bg-white"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <Label className="flex items-center gap-2 text-base font-medium">
                  <MapPin className="h-4 w-4" />
                  Address
                </Label>

                <div className="space-y-2">
                  <Label htmlFor="addressLine1">Address Line 1</Label>
                  <Input
                    id="addressLine1"
                    name="addressLine1"
                    defaultValue={profile.address_line_1 || ""}
                    className="bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="addressLine2">Address Line 2 (Optional)</Label>
                  <Input
                    id="addressLine2"
                    name="addressLine2"
                    defaultValue={profile.address_line_2 || ""}
                    className="bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input id="city" name="city" defaultValue={profile.city || ""} className="bg-white" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postcode">Postcode</Label>
                    <Input id="postcode" name="postcode" defaultValue={profile.postcode || ""} className="bg-white" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input id="country" name="country" defaultValue={profile.country || ""} className="bg-white" />
                </div>
              </div>

              {message && (
                <div
                  className={`p-3 rounded-md text-sm ${
                    message.includes("Error")
                      ? "bg-red-50 text-red-700 border border-red-200"
                      : "bg-green-50 text-green-700 border border-green-200"
                  }`}
                >
                  {message}
                </div>
              )}

              <div className="flex justify-end">
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
