"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getSubscriptionLimits } from "@/lib/subscription-limits"

interface Organization {
  organization_id: string
  organization_name: string
  logo_url: string | null
  primary_color: string | null
  slug: string // Added slug to interface
}

export default function SettingsPage() {
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [profile, setProfile] = useState<any>(null) // Added profile state to check user role
  const [name, setName] = useState("")
  const [primaryColor, setPrimaryColor] = useState("#10b981")
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasCustomBranding, setHasCustomBranding] = useState(false)
  const router = useRouter()

  useEffect(() => {
    async function loadOrganization() {
      const supabase = createClient()

      const impersonationCookie = document.cookie.split("; ").find((row) => row.startsWith("masterAdminImpersonation="))
      const isImpersonating = impersonationCookie?.split("=")[1] === "true"

      let userId = null

      if (isImpersonating) {
        const impersonatedEmailCookie = document.cookie
          .split("; ")
          .find((row) => row.startsWith("impersonatedUserEmail="))
        const impersonatedEmail = impersonatedEmailCookie?.split("=")[1]

        if (impersonatedEmail) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("*") // Select all profile data to check role
            .eq("email", decodeURIComponent(impersonatedEmail))
            .single()
          userId = profile?.id
          setProfile(profile) // Set profile state
        }
      } else {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        userId = user?.id

        if (userId) {
          const { data: userProfile } = await supabase.from("profiles").select("*").eq("id", userId).single()
          setProfile(userProfile)
        }
      }

      if (userId) {
        const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", userId).single()

        if (profile?.organization_id) {
          const subscriptionLimits = await getSubscriptionLimits(profile.organization_id)
          setHasCustomBranding(isImpersonating || subscriptionLimits.hasCustomBranding)

          const { data: org } = await supabase
            .from("organizations")
            .select("*")
            .eq("organization_id", profile.organization_id)
            .single()

          if (org) {
            setOrganization(org)
            setName(org.organization_name || "")
            setPrimaryColor(org.primary_color || "#10b981")
            setLogoPreview(org.logo_url)
          }
        }
      }
      setIsLoading(false)
    }

    loadOrganization()
  }, [])

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const maxSize = 5 * 1024 * 1024 // 5MB
      const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]

      if (file.size > maxSize) {
        setError("Logo file must be smaller than 5MB")
        return
      }

      if (!allowedTypes.includes(file.type)) {
        setError("Logo must be a valid image file (JPG, PNG, GIF, or WebP)")
        return
      }

      setError(null)
      setLogoFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const generateSlug = (name: string): string => {
    if (!name || typeof name !== "string") {
      return `org-${Date.now()}`
    }

    const baseSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "") // Remove special characters
      .replace(/\s+/g, "-") // Replace spaces with hyphens
      .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
      .replace(/^-|-$/g, "") // Remove leading/trailing hyphens

    // If slug is empty after processing, use a fallback
    const finalSlug = baseSlug || `org-${Date.now()}`

    // Ensure slug is not empty and has minimum length
    return finalSlug.length > 0 ? finalSlug : `org-${Date.now()}`
  }

  const handleSave = async () => {
    if (!organization) return

    if (!name.trim()) {
      setError("Organization name is required")
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const supabase = createClient()
      let logoUrl = organization.logo_url

      if (logoFile) {
        const fileExt = logoFile.name.split(".").pop()?.toLowerCase()
        const timestamp = Date.now()
        const fileName = `${organization.organization_id}/logo-${timestamp}.${fileExt}`

        // Delete old logo if it exists
        if (organization.logo_url) {
          const oldFileName = organization.logo_url.split("/").pop()
          if (oldFileName && oldFileName.startsWith("logo")) {
            await supabase.storage
              .from("organization-assets")
              .remove([`${organization.organization_id}/${oldFileName}`])
          }
        }

        const { error: uploadError, data: uploadData } = await supabase.storage
          .from("organization-assets")
          .upload(fileName, logoFile, {
            upsert: false, // Don't overwrite, use unique filename
            contentType: logoFile.type,
          })

        if (uploadError) {
          console.error("Upload error:", uploadError)
          throw new Error(`Failed to upload logo: ${uploadError.message}`)
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("organization-assets").getPublicUrl(fileName)

        logoUrl = `${publicUrl}?v=${timestamp}`
      }

      const slug = generateSlug(name)

      if (!slug || slug.trim().length === 0) {
        throw new Error("Failed to generate valid slug")
      }

      console.log("[v0] Generated slug:", slug, "from name:", name)

      const updateData = {
        organization_name: name.trim(),
        slug: slug,
        logo_url: logoUrl,
        primary_color: primaryColor,
        updated_at: new Date().toISOString(),
      }

      console.log("[v0] Update data:", updateData)

      const { error: updateError } = await supabase
        .from("organizations")
        .update(updateData)
        .eq("organization_id", organization.organization_id)

      if (updateError) {
        console.log("[v0] Update error:", updateError)
        throw updateError
      }

      const { error: profileUpdateError } = await supabase
        .from("profiles")
        .update({
          organization_name: name,
        })
        .eq("organization_id", organization.organization_id)

      if (profileUpdateError) throw profileUpdateError

      setOrganization((prev) =>
        prev
          ? {
              ...prev,
              organization_name: name,
              slug: slug,
              logo_url: logoUrl,
              primary_color: primaryColor,
            }
          : null,
      )

      const brandingCache = (window as any).brandingCache
      if (brandingCache) {
        brandingCache.clear()
      }

      window.dispatchEvent(new CustomEvent("brandingRefresh"))

      setLogoPreview(logoUrl)

      alert("Settings saved successfully!")

      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("brandingRefresh"))
        window.location.reload()
      }, 300)
    } catch (error: unknown) {
      console.error("Save error:", error)
      setError(error instanceof Error ? error.message : "An error occurred while saving settings")
    } finally {
      setIsSaving(false)
    }
  }

  const canEditOrganizationName = profile?.role === "admin" || profile?.role === "master_admin"

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <Card>
          <CardHeader>
            <div className="animate-pulse space-y-2">
              <div className="h-6 bg-gray-200 rounded w-1/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-16 bg-gray-200 rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Organization Settings</h1>
        <p className="text-gray-600 mt-2">Customize your organization&apos;s branding and identity</p>
        {!canEditOrganizationName && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              <strong>Note:</strong> Only administrators and master administrators can modify organization settings.
            </p>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organization Identity</CardTitle>
          <CardDescription>Set your organization name, logo, and brand color</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-2">
            <Label htmlFor="name" required>
              Organization Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your Organization Name"
              required
              disabled={!canEditOrganizationName} // Disable input for non-admin users
            />
            {canEditOrganizationName && (
              <p className="text-xs text-gray-500">This name will appear throughout the platform and in reports.</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="logo">Organization Logo</Label>
            <div className="flex items-center gap-4">
              {logoPreview && (
                <div className="w-16 h-16 border rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center">
                  <img
                    src={logoPreview || "/placeholder.svg"}
                    alt="Logo preview"
                    className="max-w-full max-h-full object-contain"
                    onError={(e) => {
                      console.error("Logo preview failed to load")
                      setError("Logo preview failed to load. Please try a different image.")
                    }}
                  />
                </div>
              )}
              <div className="flex-1">
                <Input
                  id="logo"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  onChange={handleLogoChange}
                  className="mb-2"
                />
                <p className="text-xs text-gray-500">
                  Recommended: Square format (200x200px), PNG or JPG. Max size: 5MB
                </p>
                {isSaving && logoFile && (
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: "60%" }}></div>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">Uploading logo...</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="primaryColor">Brand Color</Label>
            {!hasCustomBranding && (
              <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">★</span>
                  </div>
                  <p className="text-sm text-amber-800 font-medium">Premium Feature</p>
                </div>
                <p className="text-xs text-amber-700 mt-1">
                  Upgrade to customize your brand colors. Free users use the default MyDayLogs green theme.
                </p>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Input
                id="primaryColor"
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-16 h-10 p-1 border rounded"
                disabled={!hasCustomBranding}
              />
              <Input
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                placeholder="#10b981"
                className="flex-1"
                disabled={!hasCustomBranding}
              />
            </div>
            <p className="text-xs text-gray-500">
              This color will be used for buttons and accents throughout the platform
            </p>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <Button onClick={handleSave} disabled={isSaving || !canEditOrganizationName}>
            {isSaving ? "Saving..." : "Save Settings"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Brand Preview</CardTitle>
          <CardDescription>See how your branding will appear in the platform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg p-6 bg-gray-50">
            <div className="flex items-center gap-4 mb-6">
              {logoPreview && (
                <div className="w-12 h-12 rounded overflow-hidden bg-white flex items-center justify-center shadow-sm">
                  <img
                    src={logoPreview || "/placeholder.svg"}
                    alt="Logo"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              )}
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900">{name || "Your Organization"}</h3>
                <p className="text-sm text-gray-600">Organization Brand Preview</p>
              </div>
            </div>
            <div className="space-y-3">
              <div
                className="px-4 py-2 rounded text-white font-medium text-sm"
                style={{ backgroundColor: hasCustomBranding ? primaryColor : "#10b981" }}
              >
                Primary Action Button
              </div>
              <div
                className="px-4 py-2 rounded border font-medium text-sm"
                style={{
                  borderColor: hasCustomBranding ? primaryColor : "#10b981",
                  color: hasCustomBranding ? primaryColor : "#10b981",
                }}
              >
                Secondary Button
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
