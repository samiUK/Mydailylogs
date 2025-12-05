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
import { ArrowLeft, Copy, ExternalLink, Check, Lock, Mail } from "lucide-react"
import Link from "next/link"
import { toast } from "react-toastify"

interface Template {
  id: string
  name: string
  description: string
  frequency: string
  is_active: boolean
  organization_id: string
  schedule_type: string
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
  const [contractorEmail, setContractorEmail] = useState("")
  const [contractorName, setContractorName] = useState("")
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailsSentThisCycle, setEmailsSentThisCycle] = useState(0)
  const [emailLimitReached, setEmailLimitReached] = useState(false)
  const EMAIL_LIMIT_PER_CYCLE = 15

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

      if (templateData.schedule_type === "recurring") {
        toast.error("Recurring templates cannot be shared with external contractors")
        router.push("/admin/templates")
        return
      }

      setTemplate(templateData)
      setOrganizationId(templateData.organization_id)

      const limits = await getSubscriptionLimits(templateData.organization_id)
      setHasContractorAccess(limits.hasContractorLinkShare)

      await loadEmailCount(templateData.organization_id)

      generateShareableLink()
    } catch (error) {
      console.error("Error loading template:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadEmailCount = async (orgId: string) => {
    try {
      // Get subscription to determine billing cycle
      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("current_period_start")
        .eq("organization_id", orgId)
        .eq("status", "active")
        .single()

      const billingCycleStart = subscription?.current_period_start || new Date().toISOString()

      // Count emails sent this billing cycle
      const { count, error } = await supabase
        .from("contractor_emails_sent")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .gte("billing_cycle_start", billingCycleStart)

      if (error) {
        console.error("Error loading email count:", error)
        return
      }

      setEmailsSentThisCycle(count || 0)
      setEmailLimitReached((count || 0) >= EMAIL_LIMIT_PER_CYCLE)

      console.log("[v0] Email usage:", {
        count,
        limit: EMAIL_LIMIT_PER_CYCLE,
        limitReached: (count || 0) >= EMAIL_LIMIT_PER_CYCLE,
      })
    } catch (error) {
      console.error("Error in loadEmailCount:", error)
    }
  }

  const generateShareableLink = () => {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.mydaylogs.co.uk"
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

  const sendLinkViaEmail = async () => {
    if (!contractorEmail || !contractorName) {
      toast.error("Please enter both contractor name and email")
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contractorEmail)) {
      toast.error("Please enter a valid email address")
      return
    }

    setSendingEmail(true)

    try {
      const response = await fetch("/api/external/send-contractor-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractorEmail,
          contractorName,
          templateName: template?.name,
          templateId,
          shareableLink,
          organizationId,
        }),
      })

      const result = await response.json()

      if (response.ok) {
        toast.success(`Link sent to ${contractorEmail}`)
        setContractorEmail("")
        setContractorName("")
        await loadEmailCount(organizationId)
      } else {
        toast.error(result.error || "Failed to send email")
      }
    } catch (error) {
      console.error("Error sending email:", error)
      toast.error("Failed to send email. Please try again.")
    } finally {
      setSendingEmail(false)
    }
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
        <p className="text-muted-foreground">The template you're looking for doesn't exist.</p>
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
            <h1 className="text-2xl font-bold text-foreground">Share Log</h1>
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
              Upgrade your plan to share external logs with contractors, vendors, or temporary workers who don't need
              full access to your system.
            </p>
            <div className="bg-white border border-amber-200 rounded-lg p-4">
              <h4 className="font-medium text-foreground mb-2">With Contractor Link Share you can:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Share logs without requiring account creation</li>
                <li>• Collect submissions from external contractors</li>
                <li>• Track external submissions separately</li>
                <li>• Maintain security while gathering data</li>
              </ul>
            </div>
            <Link href="/admin/billing">
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
          <h1 className="text-2xl font-bold text-foreground">Share Log</h1>
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
          <CardTitle>External Log Link</CardTitle>
          <CardDescription>
            Share this link with external contractors or people who don't need to be part of your team. They can fill
            out the log without creating an account.
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

          {!emailLimitReached ? (
            <div className="border-t pt-6 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-foreground">Send Link via Email</h3>
                  <Badge variant={emailsSentThisCycle >= 10 ? "destructive" : "secondary"}>
                    <Mail className="w-3 h-3 mr-1" />
                    {emailsSentThisCycle}/{EMAIL_LIMIT_PER_CYCLE} sent
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Enter the contractor's details to send them the log link directly via email
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contractorName">Contractor Name</Label>
                  <Input
                    id="contractorName"
                    placeholder="John Smith"
                    value={contractorName}
                    onChange={(e) => setContractorName(e.target.value)}
                    disabled={sendingEmail}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contractorEmail">Contractor Email</Label>
                  <Input
                    id="contractorEmail"
                    type="email"
                    placeholder="john@example.com"
                    value={contractorEmail}
                    onChange={(e) => setContractorEmail(e.target.value)}
                    disabled={sendingEmail}
                  />
                </div>
              </div>

              <Button
                onClick={sendLinkViaEmail}
                disabled={sendingEmail || !contractorEmail || !contractorName}
                className="w-full"
              >
                {sendingEmail ? "Sending..." : "Send Link via Email"}
              </Button>

              {emailsSentThisCycle >= 10 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-sm text-amber-800">
                    You have {EMAIL_LIMIT_PER_CYCLE - emailsSentThisCycle} email
                    {EMAIL_LIMIT_PER_CYCLE - emailsSentThisCycle !== 1 ? "s" : ""} remaining this billing cycle. The
                    limit will reset at the start of your next billing cycle.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="border-t pt-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-red-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-red-900 mb-1">Email Limit Reached</h4>
                    <p className="text-sm text-red-800 mb-2">
                      You've sent {EMAIL_LIMIT_PER_CYCLE} contractor emails this billing cycle. The limit will reset at
                      the start of your next billing cycle.
                    </p>
                    <p className="text-sm text-red-700">
                      You can still share the link by copying it above and sending it through your own email client.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">How it works:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• External users can access the log without logging in</li>
              <li>• They'll be asked to provide their name and email address</li>
              <li>• They'll see the same questions as your internal team</li>
              <li>• When submitted, you'll receive an email notification</li>
              <li>• The contractor will receive an email confirmation</li>
              <li>• Submissions appear in Reports & Analytics as "External submissions"</li>
              <li>• Perfect for contractors, vendors, or temporary workers</li>
              <li>• Note: Only one-off, deadline, and specific date templates can be shared</li>
              <li>• Limited to {EMAIL_LIMIT_PER_CYCLE} email sends per billing cycle to manage server costs</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
