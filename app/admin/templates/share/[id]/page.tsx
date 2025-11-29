"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { getSubscriptionLimits } from "@/lib/subscription-limits"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Copy, ExternalLink, Check, Lock } from "lucide-react"
import Link from "next/link"

interface Template {
  id: string
  name: string
  description: string
  frequency: string
  is_active: boolean
  organization_id: string
}

export default function ShareTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const supabase = createClient()
  const [template, setTemplate] = useState<Template | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [shareableLink, setShareableLink] = useState("")
  const [templateId, setTemplateId] = useState<string>("")
  const [hasContractorAccess, setHasContractorAccess] = useState(false)
  const [organizationId, setOrganizationId] = useState<string>("")

  useEffect(() => {
    const resolveParams = async () => {
      const resolvedParams = await params
      setTemplateId(resolvedParams.id)
    }
    resolveParams()
  }, [params])

  useEffect(() => {
    if (templateId) {
      loadTemplate()
    }
  }, [templateId])

  const loadTemplate = async () => {
    try {
      const { data: templateData, error } = await supabase
        .from("checklist_templates")
        .select("*")
        .eq("id", templateId)
        .single()

      if (error) throw error
      setTemplate(templateData)
      setOrganizationId(templateData.organization_id)

      const limits = await getSubscriptionLimits(templateData.organization_id)
      setHasContractorAccess(limits.hasContractorLinkShare)

      generateShareableLink()
    } catch (error) {
      console.error("Error loading template:", error)
    } finally {
      setLoading(false)
    }
  }

  const generateShareableLink = () => {
    const baseUrl = window.location.origin
    const link = `${baseUrl}/external/form/${templateId}`
    setShareableLink(link)
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareableLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error("Failed to copy:", error)
    }
  }

  const openExternalForm = () => {
    window.open(shareableLink, "_blank")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="text-muted-foreground mt-2">Loading template...</p>
        </div>
      </div>
    )
  }

  if (!template) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-foreground mb-2">Template not found</h2>
        <p className="text-muted-foreground mb-4">The template you're looking for doesn't exist.</p>
        <Link href="/admin/templates">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Templates
          </Button>
        </Link>
      </div>
    )
  }

  if (!hasContractorAccess) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/templates">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Share External Form</h1>
            <p className="text-muted-foreground">Generate a shareable link for external contractors</p>
          </div>
        </div>

        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-amber-600" />
              <CardTitle>Premium Feature</CardTitle>
            </div>
            <CardDescription>Contractor Link Share is available on Growth and Scale plans</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Upgrade your plan to share external forms with contractors, vendors, or temporary workers who don't need
              full access to your system.
            </p>
            <div className="bg-white border border-amber-200 rounded-lg p-4">
              <h4 className="font-medium text-foreground mb-2">With Contractor Link Share you can:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Share forms without requiring account creation</li>
                <li>• Collect submissions from external contractors</li>
                <li>• Track external submissions separately</li>
                <li>• Maintain security while gathering data</li>
              </ul>
            </div>
            <Link href="/admin/profile/billing">
              <Button className="w-full">Upgrade to Access Contractor Links</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/templates">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Share External Form</h1>
          <p className="text-muted-foreground">Generate a shareable link for external contractors</p>
        </div>
      </div>

      {/* Template Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {template.name}
            <Badge variant={template.is_active ? "default" : "secondary"}>
              {template.is_active ? "Active" : "Inactive"}
            </Badge>
          </CardTitle>
          <CardDescription>{template.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            <p>Frequency: {template.frequency}</p>
          </div>
        </CardContent>
      </Card>

      {/* Shareable Link */}
      <Card>
        <CardHeader>
          <CardTitle>External Form Link</CardTitle>
          <CardDescription>
            Share this link with external contractors or people who don't need to be part of your team. They can fill
            out the form without creating an account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="shareableLink">Shareable Link</Label>
            <div className="flex gap-2">
              <Input id="shareableLink" value={shareableLink} readOnly className="font-mono text-sm" />
              <Button onClick={copyToClipboard} variant="outline" className="flex-shrink-0 bg-transparent">
                {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              </Button>
              <Button onClick={openExternalForm} variant="outline" className="flex-shrink-0 bg-transparent">
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
            {copied && <p className="text-sm text-green-600">Link copied to clipboard!</p>}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">How it works:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• External users can access the form without logging in</li>
              <li>• They'll see the same questions as your internal team</li>
              <li>• When submitting, they'll be asked to provide their full name</li>
              <li>• Submissions will appear in your Reports & Analytics as "External Report submissions"</li>
              <li>• Perfect for contractors, vendors, or temporary workers</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
