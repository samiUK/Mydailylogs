"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

interface Organization {
  id: string
  name: string
  slug: string
  logo_url: string | null
  primary_color: string | null
  secondary_color: string | null
}

export default function SettingsPage() {
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [primaryColor, setPrimaryColor] = useState("#4F46E5")
  const [secondaryColor, setSecondaryColor] = useState("#6B7280")
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
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
          const { data: org } = await supabase
            .from("organizations")
            .select("*")
            .eq("id", profile.organization_id)
            .single()

          if (org) {
            setOrganization(org)
            setName(org.name || "")
            setSlug(org.slug || "")
            setPrimaryColor(org.primary_color || "#4F46E5")
            setSecondaryColor(org.secondary_color || "#6B7280")
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

      // Upload logo if a new file was selected
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

      // Update organization
      const { error: updateError } = await supabase
        .from("organizations")
        .update({
          name,
          slug,
          logo_url: logoUrl,
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          updated_at: new Date().toISOString(),
        })
        .eq("id", organization.id)

      if (updateError) throw updateError

      // Update local state
      setOrganization((prev) =>
        prev
          ? {
              ...prev,
              name,
              slug,
              logo_url: logoUrl,
              primary_color: primaryColor,
              secondary_color: secondaryColor,
            }
          : null,
      )

      // Apply branding immediately
      applyBranding(primaryColor, secondaryColor)

      alert("Settings saved successfully!")
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsSaving(false)
    }
  }

  const applyBranding = (primary: string, secondary: string) => {
    document.documentElement.style.setProperty("--brand-primary", primary)
    document.documentElement.style.setProperty("--brand-secondary", secondary)
  }

  if (isLoading) {
    return <div className="flex justify-center py-8">Loading...</div>
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Organization Settings</h1>
        <p className="text-gray-600 mt-2">Customize your organization&apos;s branding and settings</p>
      </div>

      {/* Branding Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Brand Identity</CardTitle>
          <CardDescription>Customize your organization&apos;s appearance and branding</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="grid gap-2">
              <Label htmlFor="name">Organization Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your Company Name" />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="slug">URL Slug</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                placeholder="your-company"
              />
              <p className="text-xs text-gray-500">Used in URLs: yourcompany.dailybrandcheck.com</p>
            </div>
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
                <p className="text-xs text-gray-500">Recommended: 200x200px, PNG or JPG format</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="grid gap-2">
              <Label htmlFor="primaryColor">Primary Brand Color</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="primaryColor"
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-16 h-10 p-1 border rounded"
                />
                <Input
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  placeholder="#4F46E5"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="secondaryColor">Secondary Color</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="secondaryColor"
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="w-16 h-10 p-1 border rounded"
                />
                <Input
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  placeholder="#6B7280"
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Settings"}
          </Button>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Brand Preview</CardTitle>
          <CardDescription>See how your branding will appear</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg p-6 bg-gray-50">
            <div className="flex items-center gap-4 mb-4">
              {logoPreview && (
                <div className="w-12 h-12 rounded overflow-hidden bg-white flex items-center justify-center">
                  <img
                    src={logoPreview || "/placeholder.svg"}
                    alt="Logo"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              )}
              <h3 className="text-xl font-bold" style={{ color: primaryColor }}>
                {name || "Your Organization"}
              </h3>
            </div>
            <div className="space-y-2">
              <div className="px-4 py-2 rounded text-white font-medium" style={{ backgroundColor: primaryColor }}>
                Primary Button
              </div>
              <div className="px-4 py-2 rounded text-white font-medium" style={{ backgroundColor: secondaryColor }}>
                Secondary Button
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Settings</CardTitle>
          <CardDescription>Configure platform-specific settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h4 className="font-medium">Email Notifications</h4>
              <p className="text-sm text-gray-600">Send email reminders for overdue checklists</p>
            </div>
            <Button variant="outline" size="sm">
              Configure
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h4 className="font-medium">Custom Domain</h4>
              <p className="text-sm text-gray-600">Use your own domain for the platform</p>
            </div>
            <Button variant="outline" size="sm">
              Setup
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h4 className="font-medium">API Access</h4>
              <p className="text-sm text-gray-600">Generate API keys for integrations</p>
            </div>
            <Button variant="outline" size="sm">
              Manage
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
