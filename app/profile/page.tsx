"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  User,
  Mail,
  Camera,
  Phone,
  MapPin,
  Briefcase,
  Building,
  ArrowRightLeft,
  Lock,
  Eye,
  EyeOff,
  Shield,
} from "lucide-react"
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
}

interface UserOrganization {
  id: string
  name: string
  slug: string
  role: string
  profileId: string
  isActive: boolean
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [organizations, setOrganizations] = useState<UserOrganization[]>([])
  const [currentOrganization, setCurrentOrganization] = useState<UserOrganization | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [switching, setSwitching] = useState(false)
  const [message, setMessage] = useState("")
  const [isImpersonated, setIsImpersonated] = useState(false)
  const [impersonatedBy, setImpersonatedBy] = useState("")
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordChanging, setPasswordChanging] = useState(false)
  const [passwordResetSending, setPasswordResetSending] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState("")

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
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
          router.push("/auth/login")
          return
        }

        const { data: profileData, error } = await supabase.from("profiles").select("*").eq("id", user.id).single()

        if (error) throw error
        setProfile(profileData)

        const response = await fetch("/api/user/organizations")
        if (response.ok) {
          const { organizations: userOrgs } = await response.json()
          setOrganizations(userOrgs)

          // Find current active organization
          const activeOrg = userOrgs.find((org: UserOrganization) => org.isActive)
          if (activeOrg) {
            setCurrentOrganization(activeOrg)
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

  async function handleOrganizationSwitch(organizationValue: string) {
    const selectedOrg = organizations.find((org) => `${org.id}-${org.role}` === organizationValue)
    if (!selectedOrg || switching) return

    setSwitching(true)
    setMessage("")

    try {
      const response = await fetch("/api/user/switch-organization", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ profileId: selectedOrg.profileId }),
      })

      if (!response.ok) {
        throw new Error("Failed to switch organization")
      }

      const { profile: newProfile, redirectPath } = await response.json()

      setMessage(`Switching to ${selectedOrg.name} as ${selectedOrg.role}...`)

      // Redirect to the appropriate dashboard after a short delay
      setTimeout(() => {
        window.location.href = redirectPath
      }, 1500)
    } catch (error) {
      console.error("Error switching organization:", error)
      setMessage("Error switching organization. Please try again.")
    } finally {
      setSwitching(false)
    }
  }

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
        router.push("/admin")
      }, 1500)
    } catch (error) {
      console.error("Error updating profile:", error)
      setMessage(`Error updating profile: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  async function handlePasswordChange(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!profile) return

    setPasswordChanging(true)
    setPasswordMessage("")

    try {
      const formData = new FormData(e.currentTarget)
      const currentPassword = formData.get("currentPassword") as string
      const newPassword = formData.get("newPassword") as string
      const confirmPassword = formData.get("confirmPassword") as string

      if (newPassword !== confirmPassword) {
        setPasswordMessage("New passwords do not match")
        return
      }

      if (newPassword.length < 6) {
        setPasswordMessage("New password must be at least 6 characters long")
        return
      }

      const response = await fetch("/api/user/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to change password")
      }

      setPasswordMessage("Password changed successfully!")
      // Reset form
      e.currentTarget.reset()
    } catch (error) {
      console.error("Error changing password:", error)
      setPasswordMessage(`Error: ${error.message}`)
    } finally {
      setPasswordChanging(false)
    }
  }

  async function handlePasswordReset() {
    if (!profile) return

    setPasswordResetSending(true)
    setPasswordMessage("")

    try {
      const response = await fetch("/api/user/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: profile.email }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to send password reset email")
      }

      setPasswordMessage("Password reset email sent! Check your inbox.")
    } catch (error) {
      console.error("Error sending password reset email:", error)
      setPasswordMessage(`Error: ${error.message}`)
    } finally {
      setPasswordResetSending(false)
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

        {organizations.length > 1 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5" />
                Organization Access
              </CardTitle>
              <CardDescription>Switch between organizations you have access to</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="organizationSwitch" className="flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    Switch Organization
                  </Label>
                  <Select
                    value={currentOrganization ? `${currentOrganization.id}-${currentOrganization.role}` : ""}
                    onValueChange={handleOrganizationSwitch}
                    disabled={switching}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Select organization..." />
                    </SelectTrigger>
                    <SelectContent>
                      {organizations.map((org) => (
                        <SelectItem key={`${org.id}-${org.role}`} value={`${org.id}-${org.role}`}>
                          <div className="flex items-center justify-between w-full">
                            <span>{org.name}</span>
                            <span className="ml-2 text-xs bg-gray-100 px-2 py-1 rounded capitalize">{org.role}</span>
                            {org.isActive && (
                              <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                                Current
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {switching && <p className="text-sm text-blue-600">Switching organization...</p>}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
              {currentOrganization && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    Current Organization
                  </Label>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-md">
                    <span className="font-medium">{currentOrganization.name}</span>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded capitalize">
                      {currentOrganization.role}
                    </span>
                  </div>
                </div>
              )}

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
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Phone Number
                </Label>
                <Input id="phone" name="phone" type="tel" defaultValue={profile.phone || ""} className="bg-white" />
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

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Settings
            </CardTitle>
            <CardDescription>Manage your password and account security</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Change Password Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Change Password
                </h3>
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        name="currentPassword"
                        type={showCurrentPassword ? "text" : "password"}
                        required
                        className="bg-white pr-10"
                        placeholder="Enter your current password"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      >
                        {showCurrentPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        name="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        required
                        className="bg-white pr-10"
                        placeholder="Enter your new password"
                        minLength={6}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                    <p className="text-sm text-gray-500">Password must be at least 6 characters long</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        className="bg-white pr-10"
                        placeholder="Confirm your new password"
                        minLength={6}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" disabled={passwordChanging} className="w-full">
                    {passwordChanging ? "Changing Password..." : "Change Password"}
                  </Button>
                </form>
              </div>

              {/* Password Reset Section */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-medium mb-2">Forgot Your Password?</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Send a password reset link to your email address: <strong>{profile?.email}</strong>
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePasswordReset}
                  disabled={passwordResetSending}
                  className="bg-white"
                >
                  {passwordResetSending ? "Sending..." : "Send Password Reset Email"}
                </Button>
              </div>

              {passwordMessage && (
                <div
                  className={`p-3 rounded-md text-sm ${
                    passwordMessage.includes("Error") ||
                    passwordMessage.includes("do not match") ||
                    passwordMessage.includes("must be")
                      ? "bg-red-50 text-red-700 border border-red-200"
                      : "bg-green-50 text-green-700 border border-green-200"
                  }`}
                >
                  {passwordMessage}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
