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
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Organization {
  organization_id: string
  organization_name: string
  logo_url: string | null
  primary_color: string | null
  secondary_color: string | null
  slug: string
  business_hours?: BusinessHours | null // Made optional to handle missing column
}

interface BusinessHours {
  monday: DayHours
  tuesday: DayHours
  wednesday: DayHours
  thursday: DayHours
  friday: DayHours
  saturday: DayHours
  sunday: DayHours
}

interface DayHours {
  enabled: boolean
  open: string
  close: string
}

export default function SettingsPage() {
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [profile, setProfile] = useState<any>(null) // Added profile state to check user role
  const [name, setName] = useState("")
  const [primaryColor, setPrimaryColor] = useState("#10b981")
  const [colorAutoExtracted, setColorAutoExtracted] = useState(false) // Added state to track if color was auto-extracted from logo
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasCustomBranding, setHasCustomBranding] = useState(false)
  const router = useRouter()
  const [isImpersonating, setIsImpersonating] = useState(false)
  const [impersonatedEmail, setImpersonatedEmail] = useState("")

  const [businessHours, setBusinessHours] = useState<BusinessHours>({
    monday: { enabled: true, open: "09:00", close: "17:00" },
    tuesday: { enabled: true, open: "09:00", close: "17:00" },
    wednesday: { enabled: true, open: "09:00", close: "17:00" },
    thursday: { enabled: true, open: "09:00", close: "17:00" },
    friday: { enabled: true, open: "09:00", close: "17:00" },
    saturday: { enabled: false, open: "09:00", close: "17:00" },
    sunday: { enabled: false, open: "09:00", close: "17:00" },
  })

  const orderedDays: (keyof BusinessHours)[] = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ]

  useEffect(() => {
    async function loadOrganization() {
      const supabase = createClient()

      console.log("[v0] Loading organization settings...")

      const masterAdminImpersonation = localStorage.getItem("masterAdminImpersonation") === "true"
      const impersonatedUserEmail = localStorage.getItem("impersonatedUserEmail")

      console.log("[v0] Impersonation check:", { masterAdminImpersonation, impersonatedUserEmail })

      let userProfile: any = null
      let profileError: any = null

      if (masterAdminImpersonation && impersonatedUserEmail) {
        setIsImpersonating(true)
        setImpersonatedEmail(impersonatedUserEmail)

        console.log("[v0] Loading impersonated user profile:", impersonatedUserEmail)

        const { data, error } = await supabase
          .from("profiles")
          .select(
            "*, organizations!inner(organization_id, organization_name, logo_url, primary_color, secondary_color)",
          )
          .eq("email", impersonatedUserEmail)
          .single()

        userProfile = data
        profileError = error
      } else {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        console.log("[v0] Current user:", user?.id)

        if (!user) {
          console.error("[v0] No authenticated user found")
          setError("User not authenticated. Please log in again.")
          setIsLoading(false)
          return
        }

        const { data, error } = await supabase
          .from("profiles")
          .select(
            "*, organizations!inner(organization_id, organization_name, logo_url, primary_color, secondary_color)",
          )
          .eq("id", user.id)
          .single()

        userProfile = data
        profileError = error
      }

      console.log("[v0] Profile data:", userProfile)
      console.log("[v0] Profile error:", profileError)

      if (profileError || !userProfile) {
        console.error("[v0] Failed to load user profile:", profileError)
        setError("User settings could not be found. Please contact support.")
        setIsLoading(false)
        return
      }

      setProfile(userProfile)

      if (!userProfile.organization_id) {
        console.error("[v0] User has no organization assigned")
        setError("No organization assigned to this user. Please contact support.")
        setIsLoading(false)
        return
      }

      const subscriptionLimits = await getSubscriptionLimits(userProfile.organization_id)
      setHasCustomBranding(subscriptionLimits.hasCustomBranding)

      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .select("*")
        .eq("organization_id", userProfile.organization_id)
        .single()

      console.log("[v0] Organization data:", org)
      console.log("[v0] Organization error:", orgError)

      if (orgError || !org) {
        console.error("[v0] Failed to load organization:", orgError)
        setError("Organization settings could not be loaded. Please contact support.")
        setIsLoading(false)
        return
      }

      setOrganization(org)
      setName(org.organization_name || "")
      setPrimaryColor(org.primary_color || "#10b981")
      setLogoPreview(org.logo_url)
      if (org.business_hours) {
        setBusinessHours(org.business_hours as BusinessHours)
      }

      console.log("[v0] Successfully loaded organization settings")
      setIsLoading(false)
    }

    loadOrganization()
  }, [])

  const extractColorFromImage = (imageUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image()
      img.crossOrigin = "Anonymous"
      img.onload = () => {
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")
        if (!ctx) {
          resolve("#10b981") // fallback
          return
        }

        canvas.width = img.width
        canvas.height = img.height
        ctx.drawImage(img, 0, 0)

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data
        const colorCounts: { [key: string]: number } = {}

        // Sample pixels and count colors (skip transparent pixels)
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i]
          const g = data[i + 1]
          const b = data[i + 2]
          const a = data[i + 3]

          // Skip very light colors (likely background) and transparent pixels
          if (a < 128 || (r > 240 && g > 240 && b > 240)) continue

          const color = `${r},${g},${b}`
          colorCounts[color] = (colorCounts[color] || 0) + 1
        }

        // Find most common color
        let dominantColor = "16,185,129" // default green
        let maxCount = 0
        for (const [color, count] of Object.entries(colorCounts)) {
          if (count > maxCount) {
            maxCount = count
            dominantColor = color
          }
        }

        // Convert to lighter shade (increase brightness by 20%)
        const [r, g, b] = dominantColor.split(",").map(Number)
        const lighterR = Math.min(255, Math.round(r + (255 - r) * 0.2))
        const lighterG = Math.min(255, Math.round(g + (255 - g) * 0.2))
        const lighterB = Math.min(255, Math.round(b + (255 - b) * 0.2))

        const hexColor = `#${lighterR.toString(16).padStart(2, "0")}${lighterG.toString(16).padStart(2, "0")}${lighterB.toString(16).padStart(2, "0")}`
        console.log("[v0] Extracted and lightened color from logo:", hexColor)
        resolve(hexColor)
      }
      img.onerror = () => {
        resolve("#10b981") // fallback
      }
      img.src = imageUrl
    })
  }

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      reader.onload = async (e) => {
        const imageUrl = e.target?.result as string
        setLogoPreview(imageUrl)

        // Extract color from logo if user has custom branding
        if (hasCustomBranding) {
          const extractedColor = await extractColorFromImage(imageUrl)
          setPrimaryColor(extractedColor)
          setColorAutoExtracted(true)
          console.log("[v0] Auto-extracted brand color from logo:", extractedColor)
        }
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

    const finalSlug = baseSlug || `org-${Date.now()}`
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
        try {
          const fileExt = logoFile.name.split(".").pop()?.toLowerCase()
          const timestamp = Date.now()
          const fileName = `${organization.organization_id}/logo-${timestamp}.${fileExt}`

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
              upsert: false,
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
        } catch (storageError) {
          console.error("[v0] Storage operation failed:", storageError)
          throw new Error("Failed to upload logo. Please try again or contact support.")
        }
      }

      const newSlug = name.trim() !== organization.organization_name ? generateSlug(name) : organization.slug

      if (!newSlug || newSlug.trim().length === 0) {
        throw new Error("Failed to generate valid slug")
      }

      console.log("[v0] Generated slug:", newSlug, "from name:", name)

      const updateData: any = {
        organization_name: name.trim(),
        logo_url: logoUrl,
        primary_color: primaryColor,
        updated_at: new Date().toISOString(),
      }

      if (newSlug !== organization.slug) {
        updateData.slug = newSlug
      }

      if ("business_hours" in organization) {
        updateData.business_hours = businessHours
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
              slug: newSlug,
              logo_url: logoUrl,
              primary_color: primaryColor,
              business_hours: businessHours,
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

  const updateDayHours = (day: keyof BusinessHours, field: keyof DayHours, value: any) => {
    setBusinessHours((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }))
  }

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

        <Card>
          <CardHeader>
            <CardTitle>Business Hours</CardTitle>
            <CardDescription>
              Set your operating hours for automated task scheduling (Growth & Scale plans)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {orderedDays.map((day) => {
              const hours = businessHours[day]
              return (
                <div key={day} className="flex items-center gap-4 p-3 border rounded-lg">
                  <div className="flex items-center gap-3 flex-1">
                    <input
                      type="checkbox"
                      checked={hours.enabled}
                      onChange={(e) => updateDayHours(day, "enabled", e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300"
                      disabled={!canEditOrganizationName}
                    />
                    <Label className="capitalize font-medium w-24">{day}</Label>
                  </div>

                  {hours.enabled && (
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={hours.open}
                        onChange={(e) => updateDayHours(day, "open", e.target.value)}
                        className="w-32"
                        disabled={!canEditOrganizationName}
                      />
                      <span className="text-gray-500">to</span>
                      <Input
                        type="time"
                        value={hours.close}
                        onChange={(e) => updateDayHours(day, "close", e.target.value)}
                        className="w-32"
                        disabled={!canEditOrganizationName}
                      />
                    </div>
                  )}

                  {!hours.enabled && <span className="text-gray-400 text-sm">Closed</span>}
                </div>
              )
            })}

            <p className="text-sm text-gray-600">
              Business hours help the system schedule automated recurring tasks only during your operating hours. Free
              users can set this but it only affects Growth and Scale plans with task automation.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error && !organization) {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Organization Settings</h1>
          <p className="text-gray-600 mt-2">Customize your organization&apos;s branding and identity</p>
        </div>
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-red-100 mx-auto flex items-center justify-center">
                <span className="text-3xl">⚠️</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Settings Not Found</h3>
              <p className="text-gray-600 max-w-md mx-auto">{error}</p>
              <Button onClick={() => router.push("/admin")}>Return to Dashboard</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {isImpersonating && (
        <Alert className="bg-red-50 border-red-200">
          <AlertDescription>
            <div>
              <strong className="text-red-900">IMPERSONATION MODE</strong>
              <span className="text-red-700 ml-2">Viewing settings for: {impersonatedEmail}</span>
            </div>
          </AlertDescription>
        </Alert>
      )}

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
              disabled={!canEditOrganizationName}
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
            {colorAutoExtracted && hasCustomBranding && (
              <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  ✓ Brand color automatically extracted from your logo. You can adjust it manually below if needed.
                </p>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Input
                id="primaryColor"
                type="color"
                value={primaryColor}
                onChange={(e) => {
                  setPrimaryColor(e.target.value)
                  setColorAutoExtracted(false) // User manually changed it
                }}
                className="w-16 h-10 p-1 border rounded"
                disabled={!hasCustomBranding}
              />
              <Input
                value={primaryColor}
                onChange={(e) => {
                  setPrimaryColor(e.target.value)
                  setColorAutoExtracted(false) // User manually changed it
                }}
                placeholder="#10b981"
                className="flex-1"
                disabled={!hasCustomBranding}
              />
            </div>
            <p className="text-xs text-gray-500">
              {hasCustomBranding
                ? "This color is automatically extracted from your logo, but you can adjust it manually"
                : "This color will be used for buttons and accents throughout the platform"}
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
          <CardTitle>Business Hours</CardTitle>
          <CardDescription>
            Set your operating hours for automated task scheduling (Growth & Scale plans)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {orderedDays.map((day) => {
            const hours = businessHours[day]
            return (
              <div key={day} className="flex items-center gap-4 p-3 border rounded-lg">
                <div className="flex items-center gap-3 flex-1">
                  <input
                    type="checkbox"
                    checked={hours.enabled}
                    onChange={(e) => updateDayHours(day, "enabled", e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300"
                    disabled={!canEditOrganizationName}
                  />
                  <Label className="capitalize font-medium w-24">{day}</Label>
                </div>

                {hours.enabled && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={hours.open}
                      onChange={(e) => updateDayHours(day, "open", e.target.value)}
                      className="w-32"
                      disabled={!canEditOrganizationName}
                    />
                    <span className="text-gray-500">to</span>
                    <Input
                      type="time"
                      value={hours.close}
                      onChange={(e) => updateDayHours(day, "close", e.target.value)}
                      className="w-32"
                      disabled={!canEditOrganizationName}
                    />
                  </div>
                )}

                {!hours.enabled && <span className="text-gray-400 text-sm">Closed</span>}
              </div>
            )
          })}

          <p className="text-sm text-gray-600">
            Business hours help the system schedule automated recurring tasks only during your operating hours. Free
            users can set this but it only affects Growth and Scale plans with task automation.
          </p>
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
