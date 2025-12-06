"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Edit2, Trash2, RefreshCw, Gift, Users, CheckCircle2, XCircle, Plus, CreditCard } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Superuser {
  id: string
  email: string
  created_at: string
  full_name?: string
}

interface AuditLog {
  id: string
  action: string
  target_email: string
  performed_by: string
  created_at: string
  details: string
}

interface Campaign {
  campaign_id: string
  name: string
  description: string
  discount_type: string
  discount_value: number
  max_redemptions: number
  requirement_type: string
  requirement_details: string
  is_active: boolean
  total_submissions?: number
  total_redeemed?: number
  promo_code_template?: string
}

interface Submission {
  submission_id: string
  user_email: string
  submission_rank: number
  promo_code: string
  is_redeemed: boolean
  social_share_url?: string
}

interface Redemption {
  id: string
  user_email: string
  organization_name: string
  organization_id: string
  promo_code: string
  plan_name: string
  discount_amount: number
  redeemed_at: string
  stripe_customer_id: string
  ip_address: string
}

interface SuperuserToolsSectionProps {
  superusers: Superuser[]
  onAddSuperuser: (email: string, password: string) => Promise<void>
  onRemoveSuperuser: (id: string) => Promise<void>
  onUpdateSuperuser: (id: string, password: string) => Promise<void>
}

export function SuperuserToolsSection({
  superusers,
  onAddSuperuser,
  onRemoveSuperuser,
  onUpdateSuperuser,
}: SuperuserToolsSectionProps) {
  const [newEmail, setNewEmail] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [editingSuperuser, setEditingSuperuser] = useState<Superuser | null>(null)
  const [editPassword, setEditPassword] = useState("")
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [loadingLogs, setLoadingLogs] = useState(false)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [campaignSubmissions, setCampaignSubmissions] = useState<Submission[]>([])
  const [campaignRedemptions, setCampaignRedemptions] = useState<Redemption[]>([])
  const [loadingCampaigns, setLoadingCampaigns] = useState(false)
  const [showNewCampaignForm, setShowNewCampaignForm] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null)
  const [viewingRedemptions, setViewingRedemptions] = useState<string | null>(null)
  const [newCampaign, setNewCampaign] = useState({
    name: "",
    description: "",
    discount_type: "percentage",
    discount_value: 20,
    max_redemptions: 100,
    requirement_type: "feedback_and_share",
    requirement_details: "Submit feedback and share on social media",
    promo_code_template: "", // Added universal promo code field
  })

  const fetchAuditLogs = async () => {
    setLoadingLogs(true)
    try {
      const res = await fetch("/api/master/superuser-audit-log")
      if (res.ok) {
        const data = await res.json()
        setAuditLogs(data.logs || [])
      }
    } catch (error) {
    } finally {
      setLoadingLogs(false)
    }
  }

  const fetchCampaigns = async () => {
    setLoadingCampaigns(true)
    try {
      const res = await fetch("/api/master/promo-campaigns")
      if (res.ok) {
        const data = await res.json()
        setCampaigns(data.campaigns || [])
      }
    } catch (error) {
      console.error("[v0] Error fetching campaigns:", error)
    } finally {
      setLoadingCampaigns(false)
    }
  }

  const fetchCampaignSubmissions = async (campaignId?: string) => {
    try {
      const url = campaignId
        ? `/api/master/promo-campaigns/submissions?campaign_id=${campaignId}`
        : "/api/master/promo-campaigns/submissions"
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setCampaignSubmissions(data.submissions || [])
      }
    } catch (error) {
      console.error("[v0] Error fetching submissions:", error)
    }
  }

  const fetchCampaignRedemptions = async (campaignId: string) => {
    try {
      const response = await fetch(`/api/master/promo-campaigns/redemptions?campaignId=${campaignId}`)
      const data = await response.json()

      if (data.success) {
        setCampaignRedemptions(data.redemptions)
      }
    } catch (error) {
      console.error("[v0] Error fetching campaign redemptions:", error)
    }
  }

  const handleAdd = async () => {
    if (!newEmail || !newPassword) return
    await onAddSuperuser(newEmail, newPassword)
    setNewEmail("")
    setNewPassword("")
    fetchAuditLogs()
  }

  const handleUpdate = async () => {
    if (!editingSuperuser || !editPassword) return
    await onUpdateSuperuser(editingSuperuser.id, editPassword)
    setEditingSuperuser(null)
    setEditPassword("")
    fetchAuditLogs()
  }

  const handleRemove = async (id: string) => {
    await onRemoveSuperuser(id)
    fetchAuditLogs()
  }

  const handleCreateCampaign = async () => {
    try {
      const res = await fetch("/api/master/promo-campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCampaign),
      })

      if (res.ok) {
        await fetchCampaigns()
        setShowNewCampaignForm(false)
        setNewCampaign({
          name: "",
          description: "",
          discount_type: "percentage",
          discount_value: 20,
          max_redemptions: 100,
          requirement_type: "feedback_and_share",
          requirement_details: "Submit feedback and share on social media",
          promo_code_template: "", // Reset promo code template field
        })
      }
    } catch (error) {
      console.error("[v0] Error creating campaign:", error)
    }
  }

  const handleToggleCampaign = async (campaignId: string, isActive: boolean) => {
    try {
      const res = await fetch("/api/master/promo-campaigns", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaign_id: campaignId, is_active: !isActive }),
      })

      if (res.ok) {
        await fetchCampaigns()
      }
    } catch (error) {
      console.error("[v0] Error toggling campaign:", error)
    }
  }

  const handleDeleteCampaign = async (campaignId: string, campaignName: string) => {
    if (
      !confirm(
        `Are you sure you want to permanently delete the campaign "${campaignName}"?\n\nThis will:\n- Remove the campaign from the database\n- Deactivate the Stripe promotion code\n- Cannot be undone\n\nExisting redemptions will remain valid, but no new users can use this code.`,
      )
    ) {
      return
    }

    try {
      const res = await fetch(`/api/master/promo-campaigns?campaign_id=${campaignId}`, {
        method: "DELETE",
      })

      if (res.ok) {
        await fetchCampaigns()
      } else {
        const data = await res.json()
        alert(`Failed to delete campaign: ${data.error}`)
      }
    } catch (error) {
      console.error("[v0] Error deleting campaign:", error)
      alert("Failed to delete campaign. Please try again.")
    }
  }

  const handleViewRedemptions = async (campaignId: string) => {
    if (viewingRedemptions === campaignId) {
      setViewingRedemptions(null)
      setCampaignRedemptions([])
    } else {
      setViewingRedemptions(campaignId)
      await fetchCampaignRedemptions(campaignId)
    }
  }

  useEffect(() => {
    fetchAuditLogs()
    fetchCampaigns()
  }, [])

  useEffect(() => {
    if (selectedCampaign) {
      fetchCampaignSubmissions(selectedCampaign)
    }
  }, [selectedCampaign])

  return (
    <div className="space-y-6">
      {/* Superuser Management */}
      <Card className="border-red-200 bg-red-50">
        <CardHeader className="bg-red-100/50">
          <CardTitle className="text-red-600">Superuser Management</CardTitle>
          <CardDescription>Manage superuser accounts - Add, update, or remove superusers</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {/* Add New Superuser */}
          <div className="p-4 border border-red-200 rounded-lg bg-white">
            <h3 className="text-sm font-semibold mb-4 text-red-900">Add New Superuser</h3>
            <div className="space-y-3">
              <Input
                type="email"
                placeholder="Email address"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
              <Input
                type="password"
                placeholder="Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <Button onClick={handleAdd} className="w-full bg-red-600 hover:bg-red-700 text-white">
                Add Superuser
              </Button>
            </div>
          </div>

          {/* Existing Superusers */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Existing Superusers ({superusers.length})</h3>
            {superusers.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4 border rounded-lg bg-white">
                No superusers found. Create one above.
              </p>
            ) : (
              <div className="space-y-2">
                {superusers.map((superuser) => (
                  <div key={superuser.id} className="flex items-center justify-between p-3 border rounded-lg bg-white">
                    <div>
                      <p className="font-medium">{superuser.email}</p>
                      {superuser.full_name && <p className="text-xs text-gray-600">{superuser.full_name}</p>}
                      <p className="text-xs text-gray-500">
                        Created: {new Date(superuser.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="icon" onClick={() => setEditingSuperuser(superuser)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="destructive" size="icon" onClick={() => handleRemove(superuser.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Promo Campaign Manager */}
      <Card className="border-purple-200 bg-purple-50">
        <CardHeader className="bg-purple-100/50">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-purple-600 flex items-center gap-2">
                <Gift className="w-5 h-5" />
                Promo Campaign Manager
              </CardTitle>
              <CardDescription>Create and manage promotional discount campaigns</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowNewCampaignForm(!showNewCampaignForm)}
              className="border-purple-300 text-purple-700 hover:bg-purple-100 bg-transparent"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Campaign
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {/* New Campaign Form */}
          {showNewCampaignForm && (
            <div className="p-4 border border-purple-200 rounded-lg bg-white space-y-4">
              <h3 className="text-sm font-semibold text-purple-900">Create New Campaign</h3>

              <div className="space-y-2">
                <Label>Campaign Name</Label>
                <Input
                  placeholder="e.g., First 100 Users Social Share"
                  value={newCampaign.name}
                  onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="Campaign details..."
                  value={newCampaign.description}
                  onChange={(e) => setNewCampaign({ ...newCampaign, description: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Discount Type</Label>
                  <Select
                    value={newCampaign.discount_type}
                    onValueChange={(value) => setNewCampaign({ ...newCampaign, discount_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="fixed_amount">Fixed Amount ($)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Discount Value</Label>
                  <Input
                    type="number"
                    value={newCampaign.discount_value}
                    onChange={(e) =>
                      setNewCampaign({ ...newCampaign, discount_value: Number.parseInt(e.target.value) })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Max Redemptions</Label>
                <Input
                  type="number"
                  value={newCampaign.max_redemptions}
                  onChange={(e) => setNewCampaign({ ...newCampaign, max_redemptions: Number.parseInt(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label>Requirement Type</Label>
                <Select
                  value={newCampaign.requirement_type}
                  onValueChange={(value) => setNewCampaign({ ...newCampaign, requirement_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="feedback_and_share">Feedback + Social Share</SelectItem>
                    <SelectItem value="feedback_only">Feedback Only</SelectItem>
                    <SelectItem value="share_only">Social Share Only</SelectItem>
                    <SelectItem value="referral">Referral</SelectItem>
                    <SelectItem value="first_time_user">First Time User</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Promo Code (Universal)</Label>
                <Input
                  placeholder="e.g., SOCIAL20"
                  value={newCampaign.promo_code_template}
                  onChange={(e) =>
                    setNewCampaign({ ...newCampaign, promo_code_template: e.target.value.toUpperCase() })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Enter a unique promo code (alphanumeric, uppercase). The system will automatically create the Stripe
                  coupon and promotion code for you.
                </p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowNewCampaignForm(false)} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleCreateCampaign} className="flex-1 bg-purple-600 hover:bg-purple-700">
                  Create Campaign
                </Button>
              </div>
            </div>
          )}

          {/* Active Campaigns */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Active Campaigns</h3>
              <Button variant="ghost" size="sm" onClick={fetchCampaigns} disabled={loadingCampaigns}>
                <RefreshCw className={`w-4 h-4 ${loadingCampaigns ? "animate-spin" : ""}`} />
              </Button>
            </div>

            {campaigns.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8 border rounded-lg bg-white">
                No campaigns yet. Create one above to get started.
              </p>
            ) : (
              <div className="space-y-3">
                {campaigns.map((campaign) => (
                  <div
                    key={campaign.campaign_id}
                    className={`p-4 border rounded-lg bg-white ${
                      campaign.is_active ? "border-purple-200" : "border-gray-200 opacity-60"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">{campaign.name}</h4>
                          {campaign.is_active ? (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">Active</span>
                          ) : (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full">Inactive</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{campaign.description}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleCampaign(campaign.campaign_id, campaign.is_active)}
                        >
                          {campaign.is_active ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteCampaign(campaign.campaign_id, campaign.name)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 pt-3 border-t">
                      <div>
                        <p className="text-xs text-gray-500">Discount</p>
                        <p className="font-semibold">
                          {campaign.discount_type === "percentage"
                            ? `${campaign.discount_value}%`
                            : `$${campaign.discount_value}`}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Max Redemptions</p>
                        <p className="font-semibold">{campaign.max_redemptions}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Submissions</p>
                        <p className="font-semibold">{campaign.total_submissions || 0}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Redeemed</p>
                        <p className="font-semibold">{campaign.total_redeemed || 0}</p>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-2">
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() =>
                          setSelectedCampaign(selectedCampaign === campaign.campaign_id ? null : campaign.campaign_id)
                        }
                        className="text-purple-600 hover:text-purple-700 p-0 h-auto"
                      >
                        <Users className="w-4 h-4 mr-1" />
                        {selectedCampaign === campaign.campaign_id ? "Hide" : "View"} Submissions
                      </Button>
                      <span className="text-gray-300">|</span>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => handleViewRedemptions(campaign.campaign_id)}
                        className="text-green-600 hover:text-green-700 p-0 h-auto"
                      >
                        <CreditCard className="w-4 h-4 mr-1" />
                        {viewingRedemptions === campaign.campaign_id ? "Hide" : "View"} Redeemers
                      </Button>
                    </div>

                    {/* Submissions List */}
                    {selectedCampaign === campaign.campaign_id && (
                      <div className="mt-3 pt-3 border-t space-y-2 max-h-64 overflow-y-auto">
                        {campaignSubmissions.length === 0 ? (
                          <p className="text-sm text-gray-500 text-center py-4">No submissions yet</p>
                        ) : (
                          campaignSubmissions.map((submission) => (
                            <div key={submission.submission_id} className="p-2 bg-gray-50 rounded text-sm">
                              <div className="flex items-center justify-between">
                                <span className="font-medium">{submission.user_email}</span>
                                <span className="text-xs text-gray-500">#{submission.submission_rank}</span>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-gray-600">Code: {submission.promo_code}</span>
                                {submission.is_redeemed && (
                                  <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                                    Redeemed
                                  </span>
                                )}
                              </div>
                              {submission.social_share_url && (
                                <a
                                  href={submission.social_share_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-purple-600 hover:underline"
                                >
                                  View Share
                                </a>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {viewingRedemptions === campaign.campaign_id && (
                      <div className="mt-3 pt-3 border-t space-y-2 max-h-96 overflow-y-auto">
                        <h5 className="text-xs font-semibold text-gray-700 uppercase mb-2">
                          Voucher Redeemers ({campaignRedemptions.length})
                        </h5>
                        {campaignRedemptions.length === 0 ? (
                          <p className="text-sm text-gray-500 text-center py-4">No redemptions yet</p>
                        ) : (
                          <div className="space-y-2">
                            {campaignRedemptions.map((redemption) => (
                              <div
                                key={redemption.id}
                                className="p-3 bg-green-50 border border-green-200 rounded text-sm"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="font-semibold text-green-900">{redemption.user_email}</span>
                                      <span className="px-1.5 py-0.5 bg-green-600 text-white text-xs rounded">
                                        Redeemed
                                      </span>
                                    </div>
                                    <div className="text-xs text-gray-600 space-y-1">
                                      <p>
                                        <span className="font-medium">Organization:</span>{" "}
                                        {redemption.organization_name}
                                      </p>
                                      <p>
                                        <span className="font-medium">Plan:</span> {redemption.plan_name}
                                      </p>
                                      <p>
                                        <span className="font-medium">Discount:</span> $
                                        {redemption.discount_amount.toFixed(2)}
                                      </p>
                                      <p>
                                        <span className="font-medium">Code:</span> {redemption.promo_code}
                                      </p>
                                      <p>
                                        <span className="font-medium">Date:</span>{" "}
                                        {new Date(redemption.redeemed_at).toLocaleString()}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        IP: {redemption.ip_address} | Customer: {redemption.stripe_customer_id}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Audit Log */}
      <Card className="border-emerald-200 bg-emerald-50">
        <CardHeader className="bg-emerald-100/50">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-emerald-600">Audit Log</CardTitle>
              <CardDescription>Track all superuser management actions</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAuditLogs}
              disabled={loadingLogs}
              className="border-emerald-300 text-emerald-700 hover:bg-emerald-100 bg-transparent"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loadingLogs ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {auditLogs.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8 border rounded-lg bg-white">No audit logs found</p>
            ) : (
              auditLogs.map((log) => (
                <div key={log.id} className="p-3 border rounded-lg bg-white hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-sm">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-semibold mr-2 ${
                            log.action === "add"
                              ? "bg-green-100 text-green-700"
                              : log.action === "remove"
                                ? "bg-red-100 text-red-700"
                                : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {log.action.toUpperCase()}
                        </span>
                        {log.target_email}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">By: {log.performed_by}</p>
                      {log.details && <p className="text-xs text-gray-500 mt-1 italic">{log.details}</p>}
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
                      {new Date(log.created_at).toLocaleDateString()}{" "}
                      {new Date(log.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Modal */}
      {editingSuperuser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-lg font-semibold mb-4">Update Superuser Password</h3>
            <p className="text-sm text-gray-600 mb-4">{editingSuperuser.email}</p>
            <div className="space-y-4">
              <Input
                type="password"
                placeholder="New password"
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
              />
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditingSuperuser(null)} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleUpdate} className="flex-1 bg-red-600 hover:bg-red-700">
                  Update
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
