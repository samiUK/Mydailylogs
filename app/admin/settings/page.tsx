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
  id: string
  name: string
  logo_url: string | null
  primary_color: string | null
}

export default function SettingsPage() {
  const [organization, setOrganization] = useState<Organization | null>(null)
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
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single()

        if (profile?.organization_id) {
          const subscriptionLimits = await getSubscriptionLimits(profile.organization_id)
          setHasCustomBranding(subscriptionLimits.hasCustomBranding)

          const { data: org } = await supabase
            .from("organizations")
            .select("*")
            .eq("id", profile.organization_id)
            .single()

          if (org) {
            setOrganization(org)
            setName(org.name || "")
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
      setLogoFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSave = async () => {
    if (!organization) return

    setIsSaving(true)
    setError(null)

    try {
      const supabase = createClient()
      let logoUrl = organization.logo_url

      if (logoFile) {
        const fileExt = logoFile.name.split(".").pop()
        const fileName = `${organization.id}/logo.${fileExt}`

        const { error: uploadError } = await supabase.storage.from("organization-assets").upload(fileName, logoFile, {
          upsert: true,
        })

        if (uploadError) {
          throw new Error("Failed to upload logo")
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("organization-assets").getPublicUrl(fileName)
        logoUrl = publicUrl
      }

      const { error: updateError } = await supabase
        .from("organizations")
        .update({
          name,
          logo_url: logoUrl,
          primary_color: primaryColor,
          updated_at: new Date().toISOString(),
        })
        .eq("id", organization.id)

      if (updateError) throw updateError

      setOrganization((prev) =>
        prev
          ? {
              ...prev,
              name,
              logo_url: logoUrl,
              primary_color: primaryColor,
            }
          : null,
      )

      alert("Settings saved successfully!")
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return <div className="flex justify-center py-8">Loading...</div>
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Organization Settings</h1>
        <p className="text-gray-600 mt-2">Customize your organization&apos;s branding and identity</p>
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
            />
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
                  />
                </div>
              )}
              <div>
                <Input id="logo" type="file" accept="image/*" onChange={handleLogoChange} className="mb-2" />
                <p className="text-xs text-gray-500">Recommended: Square format (200x200px), PNG or JPG</p>
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

          <Button onClick={handleSave} disabled={isSaving}>
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
              <h3 className="text-xl font-bold text-gray-900">{name || "Your Organization"}</h3>
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
