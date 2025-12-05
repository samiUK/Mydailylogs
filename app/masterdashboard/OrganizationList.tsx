"use client"

import { useState } from "react"
import type { Organization } from "./types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Archive,
  Trash2,
  CheckCircle,
  AlertCircle,
  Plus,
  Minus,
  RotateCw,
  Mail,
} from "lucide-react"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"

interface OrganizationListProps {
  organizations: Organization[]
  searchTerm: string
  onSearchChange: (term: string) => void
  onArchive: (org: Organization) => void
  onDelete: (org: Organization) => void
  onRefresh: () => void
  onEmailReports?: (orgId: string) => void // Added for email reports
}

interface QuotaData {
  templatesLimit: number
  templatesUsed: number
  isCustomTemplates: boolean
  teamMembersLimit: number
  teamMembersUsed: number
  isCustomTeamMembers: boolean
  managersLimit: number
  managersUsed: number
  isCustomManagers: boolean
  monthlySubmissionsLimit: number | null
  monthlySubmissionsUsed: number
  isCustomMonthlySubmissions: boolean
  submissionPeriodReset: string | null
  plan_name: string
  admins: Array<{ email: string; full_name: string; role: string }>
  staff: Array<{ email: string; full_name: string; role: string }>
  reportRetentionDays: number
}

export function OrganizationList({
  organizations,
  searchTerm,
  onSearchChange,
  onArchive,
  onDelete,
  onRefresh,
  onEmailReports, // Added for email reports
}: OrganizationListProps) {
  const [expandedOrgs, setExpandedOrgs] = useState<Set<string>>(new Set())
  const [quotaPanelOpen, setQuotaPanelOpen] = useState<Set<string>>(new Set())
  const [quotaModifications, setQuotaModifications] = useState<Record<string, any>>({})
  const [quotaData, setQuotaData] = useState<Record<string, QuotaData>>({})
  const [loadingQuota, setLoadingQuota] = useState<Set<string>>(new Set())
  const [savingQuota, setSavingQuota] = useState<Set<string>>(new Set())
  const { toast } = useToast()

  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const filteredOrgs = organizations.filter(
    (org) =>
      (org.organization_name || "").toLowerCase().includes((searchTerm || "").toLowerCase()) ||
      (org.slug || "").toLowerCase().includes((searchTerm || "").toLowerCase()) ||
      (org.admin_email || "").toLowerCase().includes((searchTerm || "").toLowerCase()),
  )

  const totalPages = Math.ceil(filteredOrgs.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedOrgs = filteredOrgs.slice(startIndex, endIndex)

  const toggleExpand = (orgId: string) => {
    const newExpanded = new Set(expandedOrgs)
    if (newExpanded.has(orgId)) {
      newExpanded.delete(orgId)
    } else {
      newExpanded.add(orgId)
      // Fetch quota data if not already loaded
      if (!quotaData[orgId]) {
        fetchQuotaData(orgId)
      }
    }
    setExpandedOrgs(newExpanded)
  }

  const fetchQuotaData = async (orgId: string) => {
    setLoadingQuota((prev) => new Set(prev).add(orgId))
    try {
      const response = await fetch(`/api/master/organization-quota`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ organizationId: orgId }),
      })
      if (response.ok) {
        const data = await response.json()

        const profilesResponse = await fetch(`/api/master/organization-profiles?organizationId=${orgId}`)
        if (profilesResponse.ok) {
          const profilesData = await profilesResponse.json()
          data.admins = profilesData.admins || []
          data.staff = profilesData.staff || []
        }

        setQuotaData((prev) => ({ ...prev, [orgId]: data }))
      }
    } catch (error) {
      // Silent fail - retry on expand
    } finally {
      setLoadingQuota((prev) => {
        const newSet = new Set(prev)
        newSet.delete(orgId)
        return newSet
      })
    }
  }

  const toggleQuotaPanel = (orgId: string) => {
    const newPanels = new Set(quotaPanelOpen)
    if (newPanels.has(orgId)) {
      newPanels.delete(orgId)
    } else {
      newPanels.add(orgId)
    }
    setQuotaPanelOpen(newPanels)
    // Initialize with current values if not already present
    if (!quotaModifications[orgId] && quotaData[orgId]) {
      setQuotaModifications((prev) => ({
        ...prev,
        [orgId]: {
          templates: quotaData[orgId].templatesLimit,
          teamMembers: quotaData[orgId].teamMembersLimit,
          managers: quotaData[orgId].managersLimit,
          monthlySubmissions: quotaData[orgId].monthlySubmissionsLimit ?? 50, // Use nullish coalescing
        },
      }))
    }
  }

  const modifyQuotaValue = (orgId: string, field: string, delta: number) => {
    setQuotaModifications((prev) => {
      const current = prev[orgId] || {}
      const fieldValue = current[field] || 0
      return {
        ...prev,
        [orgId]: {
          ...current,
          [field]: Math.max(0, fieldValue + delta),
        },
      }
    })
  }

  const getDefaultLimits = (planName: string) => {
    const plan = planName.toLowerCase()
    if (plan === "starter") {
      return { templates: 3, teamMembers: 5, managers: 1, monthlySubmissions: 50 }
    } else if (plan === "growth") {
      return { templates: 10, teamMembers: 25, managers: 3, monthlySubmissions: null }
    } else if (plan === "scale") {
      return { templates: 20, teamMembers: 75, managers: 7, monthlySubmissions: null }
    }
    return { templates: 3, teamMembers: 5, managers: 1, monthlySubmissions: 50 } // Default to starter
  }

  const handleResetToDefaults = (orgId: string, planName: string) => {
    const defaults = getDefaultLimits(planName)
    setQuotaModifications((prev) => ({
      ...prev,
      [orgId]: defaults,
    }))
    toast({
      title: "Reset to defaults",
      description: `Quota limits reset to ${planName} plan defaults. Click Save to apply.`,
    })
  }

  const handleModifyQuota = async (orgId: string) => {
    setSavingQuota((prev) => new Set(prev).add(orgId))

    try {
      const modifications = quotaModifications[orgId]
      const quota = quotaData[orgId]
      const updates: Promise<Response>[] = []

      if (modifications.templates !== quota.templatesLimit) {
        updates.push(
          fetch("/api/master/modify-quota", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              organizationId: orgId,
              fieldName: "template_limit",
              newValue: modifications.templates,
              reason: "Master admin quota adjustment",
            }),
          }),
        )
      }

      if (modifications.teamMembers !== quota.teamMembersLimit) {
        updates.push(
          fetch("/api/master/modify-quota", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              organizationId: orgId,
              fieldName: "team_limit",
              newValue: modifications.teamMembers,
              reason: "Master admin quota adjustment",
            }),
          }),
        )
      }

      if (modifications.managers !== quota.managersLimit) {
        updates.push(
          fetch("/api/master/modify-quota", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              organizationId: orgId,
              fieldName: "manager_limit",
              newValue: modifications.managers,
              reason: "Master admin quota adjustment",
            }),
          }),
        )
      }

      // Handle monthly submissions carefully, only if it's not null for the plan
      if (
        quota.monthlySubmissionsLimit !== null &&
        modifications.monthlySubmissions !== quota.monthlySubmissionsLimit
      ) {
        updates.push(
          fetch("/api/master/modify-quota", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              organizationId: orgId,
              fieldName: "monthly_submissions",
              newValue: modifications.monthlySubmissions,
              reason: "Master admin quota adjustment",
            }),
          }),
        )
      }

      if (updates.length > 0) {
        const results = await Promise.all(updates)
        const allSucceeded = results.every((res) => res.ok)

        if (allSucceeded) {
          await fetchQuotaData(orgId) // Re-fetch to get updated limits
          onRefresh()
          toast({
            title: "Success",
            description: "Quota modifications saved successfully",
          })
          setQuotaPanelOpen((prev) => {
            const newPanels = new Set(prev)
            newPanels.delete(orgId)
            return newPanels
          })
          // Removed password clearing after saving
        } else {
          toast({
            title: "Error",
            description: "Some quota modifications failed. Please try again.",
            variant: "destructive",
          })
        }
      } else {
        toast({
          title: "No changes",
          description: "No quota modifications to save",
        })
        // Close panel even if no changes
        setQuotaPanelOpen((prev) => {
          const newPanels = new Set(prev)
          newPanels.delete(orgId)
          return newPanels
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save quota modifications",
        variant: "destructive",
      })
    } finally {
      setSavingQuota((prev) => {
        const newSet = new Set(prev)
        newSet.delete(orgId)
        return newSet
      })
    }
  }

  const getProgressColor = (used: number, limit: number) => {
    if (limit === 0) return "bg-gray-300" // Handle division by zero
    const percentage = (used / limit) * 100
    if (percentage >= 90) return "bg-red-500"
    if (percentage >= 75) return "bg-yellow-500"
    return "bg-green-500"
  }

  const handleEmailReports = async (orgId: string) => {
    try {
      const response = await fetch("/api/master/email-org-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: orgId }),
      })

      if (response.ok) {
        const data = await response.json()
        toast({
          title: "Reports Sent",
          description: `Sent ${data.emailsSent} report summary email(s) to admins/managers`,
        })
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to send reports",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send reports",
        variant: "destructive",
      })
    }
  }

  const handleSearchChange = (term: string) => {
    onSearchChange(term)
    setCurrentPage(1)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 mb-6">
        <Input
          type="text"
          placeholder="Search by organization name, ID, or email..."
          value={searchTerm}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="flex-1"
        />
        <Button onClick={onRefresh} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="space-y-4">
        {paginatedOrgs.map((org) => {
          const isExpanded = expandedOrgs.has(org.organization_id)
          const quota = quotaData[org.organization_id]
          const isLoading = loadingQuota.has(org.organization_id)
          const isPanelOpen = quotaPanelOpen.has(org.organization_id)
          const mods = quotaModifications[org.organization_id]
          const isSaving = savingQuota.has(org.organization_id)

          return (
            <Card key={org.organization_id} className="border-2 hover:border-gray-300 transition-colors">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <CardTitle className="text-base sm:text-lg">{org.organization_name}</CardTitle>
                      <Badge variant="outline" className="capitalize text-xs">
                        {org.plan_name || "Starter"}
                      </Badge>
                      {org.is_masteradmin_trial && (
                        <div className="flex flex-wrap gap-1">
                          <Badge className="bg-emerald-600 text-xs">Complimentary Trial</Badge>
                          <Badge variant="outline" className="text-xs">
                            No Payment
                          </Badge>
                        </div>
                      )}
                      {org.is_trial && !org.is_masteradmin_trial && (
                        <div className="flex flex-wrap gap-1">
                          <Badge className="bg-emerald-600 text-xs">Paid Trial</Badge>
                          <Badge variant="outline" className="text-xs">
                            Stripe
                          </Badge>
                        </div>
                      )}
                    </div>
                    <CardDescription>
                      <div className="flex flex-col gap-1 text-xs sm:text-sm">
                        <span className="break-all">ID: {org.organization_id}</span>
                        <span>Created: {new Date(org.created_at).toLocaleDateString()}</span>
                        {org.user_count !== undefined && <span>Users: {org.user_count}</span>}
                      </div>
                    </CardDescription>
                  </div>

                  <div className="flex gap-2 self-end sm:self-start">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleExpand(org.organization_id)}
                      className="w-full sm:w-auto"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="space-y-4 border-t pt-4">
                  {isLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto" />
                      <p className="text-sm text-gray-500 mt-2">Loading organization details...</p>
                    </div>
                  ) : quota ? (
                    <>
                      {/* Admin & Staff Details Section */}
                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 space-y-3">
                        <h4 className="font-semibold text-sm">Admin & Staff Details</h4>

                        {quota.admins && quota.admins.length > 0 && (
                          <div>
                            <p className="text-xs text-gray-600 mb-2">Admins/Managers ({quota.admins.length})</p>
                            <div className="space-y-1 max-h-40 overflow-y-auto">
                              {quota.admins.map((admin, idx) => (
                                <div
                                  key={idx}
                                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm bg-white p-2 rounded"
                                >
                                  <span className="font-medium text-sm">{admin.full_name}</span>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <Badge variant="outline" className="text-xs capitalize">
                                      {admin.role}
                                    </Badge>
                                    <span className="text-xs text-gray-500 break-all">{admin.email}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {quota.staff && quota.staff.length > 0 && (
                          <div>
                            <p className="text-xs text-gray-600 mb-2">Staff Members ({quota.staff.length})</p>
                            <div className="space-y-1 max-h-40 overflow-y-auto">
                              {quota.staff.slice(0, 5).map((member, idx) => (
                                <div
                                  key={idx}
                                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm bg-white p-2 rounded"
                                >
                                  <span className="text-sm">{member.full_name}</span>
                                  <span className="text-xs text-gray-500 break-all">{member.email}</span>
                                </div>
                              ))}
                              {quota.staff.length > 5 && (
                                <p className="text-xs text-gray-500 text-center pt-1">
                                  +{quota.staff.length - 5} more staff members
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Subscription & Report Retention Section */}
                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 space-y-2">
                        <h4 className="font-semibold text-sm">Subscription Details</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-xs text-gray-600">Plan</p>
                            <Badge variant="outline" className="capitalize mt-1">
                              {quota.plan_name || org.plan_name || "Starter"}
                            </Badge>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Report Retention</p>
                            <p className="font-semibold mt-1">
                              {quota.reportRetentionDays ||
                                ((org.plan_name || "starter").toLowerCase() === "starter" ? 30 : 90)}{" "}
                              days
                            </p>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 pt-2 border-t">
                          Reports older than the retention period are automatically removed from the system.
                        </p>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold">Quota Management</h4>
                        </div>

                        {/* Templates Quota */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">Templates</span>
                              {quota.isCustomTemplates && (
                                <Badge variant="secondary" className="text-xs">
                                  Custom
                                </Badge>
                              )}
                            </div>
                            <span className="text-sm">
                              {quota.templatesUsed} / {quota.templatesLimit}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${getProgressColor(quota.templatesUsed, quota.templatesLimit)}`}
                              style={{ width: `${Math.min((quota.templatesUsed / quota.templatesLimit) * 100, 100)}%` }}
                            />
                          </div>
                        </div>

                        {/* Team Members Quota */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">Team Members</span>
                              {quota.isCustomTeamMembers && (
                                <Badge variant="secondary" className="text-xs">
                                  Custom
                                </Badge>
                              )}
                            </div>
                            <span className="text-sm">
                              {quota.teamMembersUsed} / {mods?.teamMembers || quota.teamMembersLimit || 0}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${getProgressColor(quota.teamMembersUsed, quota.teamMembersLimit || 0)}`}
                              style={{
                                width: `${Math.min((quota.teamMembersUsed / (quota.teamMembersLimit || 0)) * 100, 100)}%`,
                              }}
                            />
                          </div>
                        </div>

                        {/* Managers Quota */}
                        {(quota.plan_name || "starter").toLowerCase() !== "starter" && (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">Managers/Admins</span>
                                {quota.isCustomManagers && (
                                  <Badge variant="secondary" className="text-xs">
                                    Custom
                                  </Badge>
                                )}
                              </div>
                              <span className="text-sm">
                                {quota.managersUsed} / {mods?.managers || quota.managersLimit || 0}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${getProgressColor(quota.managersUsed, quota.managersLimit || 0)}`}
                                style={{
                                  width: `${Math.min((quota.managersUsed / (quota.managersLimit || 0)) * 100, 100)}%`,
                                }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Monthly Submissions (Starter only) */}
                        {(quota.plan_name || "starter").toLowerCase() === "starter" &&
                          quota.monthlySubmissionsLimit !== null && (
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">Monthly Reports</span>
                                  {quota.isCustomMonthlySubmissions && (
                                    <Badge variant="secondary" className="text-xs">
                                      Custom
                                    </Badge>
                                  )}
                                </div>
                                <span className="text-sm">
                                  {quota.monthlySubmissionsUsed} / {quota.monthlySubmissionsLimit}
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${getProgressColor(quota.monthlySubmissionsUsed, quota.monthlySubmissionsLimit)}`}
                                  style={{
                                    width: `${Math.min((quota.monthlySubmissionsUsed / quota.monthlySubmissionsLimit) * 100, 100)}%`,
                                  }}
                                />
                              </div>
                              {quota.submissionPeriodReset && (
                                <p className="text-xs text-gray-500 mt-1">Resets: {quota.submissionPeriodReset}</p>
                              )}
                            </div>
                          )}

                        <div className="flex items-center gap-2 text-sm text-gray-600 pt-2 border-t">
                          {quota.isCustomTemplates ||
                          quota.isCustomTeamMembers ||
                          quota.isCustomManagers ||
                          quota.isCustomMonthlySubmissions ? (
                            <>
                              <AlertCircle className="w-4 h-4 text-yellow-600" />
                              <span>This organization has custom limits applied</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <span>Using default {quota.plan_name || "Starter"} plan limits</span>
                            </>
                          )}
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleQuotaPanel(org.organization_id)}
                        className="w-full mt-2"
                        disabled={isSaving}
                      >
                        {isPanelOpen ? "Hide" : "Modify"} Quota Limits
                      </Button>

                      {/* Quota Modification Panel */}
                      {isPanelOpen && (
                        <div className="mt-4 p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg space-y-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-sm">Modify Quota Limits</h4>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleResetToDefaults(org.organization_id, org.plan_name || "Starter")}
                              className="text-xs"
                              disabled={isSaving}
                            >
                              <RotateCw className="h-3 w-3 mr-1" />
                              Reset to Plan Defaults
                            </Button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Templates Modification */}
                            <div>
                              <Label className="text-xs">Templates</Label>
                              <div className="flex items-center gap-2 mt-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => modifyQuotaValue(org.organization_id, "templates", -1)}
                                  disabled={!mods || mods.templates <= 1 || isSaving}
                                  className="h-8 w-8 p-0"
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <Input
                                  type="number"
                                  value={mods?.templates ?? quota.templatesLimit} // Use nullish coalescing for default
                                  onChange={(e) => {
                                    const val = Number.parseInt(e.target.value) || 0
                                    setQuotaModifications((prev) => ({
                                      ...prev,
                                      [org.organization_id]: {
                                        ...prev[org.organization_id],
                                        templates: Math.max(0, val),
                                      },
                                    }))
                                  }}
                                  className="h-8 text-center text-sm"
                                />
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => modifyQuotaValue(org.organization_id, "templates", 1)}
                                  disabled={isSaving}
                                  className="h-8 w-8 p-0"
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>

                            {/* Team Members Modification */}
                            <div>
                              <Label className="text-xs">Team Members</Label>
                              <div className="flex items-center gap-2 mt-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => modifyQuotaValue(org.organization_id, "teamMembers", -1)}
                                  disabled={!mods || mods.teamMembers <= 1 || isSaving}
                                  className="h-8 w-8 p-0"
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <Input
                                  type="number"
                                  value={mods?.teamMembers ?? quota.teamMembersLimit} // Use nullish coalescing for default
                                  onChange={(e) => {
                                    const val = Number.parseInt(e.target.value) || 0
                                    setQuotaModifications((prev) => ({
                                      ...prev,
                                      [org.organization_id]: {
                                        ...prev[org.organization_id],
                                        teamMembers: Math.max(0, val),
                                      },
                                    }))
                                  }}
                                  className="h-8 text-center text-sm"
                                />
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => modifyQuotaValue(org.organization_id, "teamMembers", 1)}
                                  disabled={isSaving}
                                  className="h-8 w-8 p-0"
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>

                            {/* Managers Modification (Growth/Scale only) */}
                            {(org.plan_name || "starter").toLowerCase() !== "starter" && (
                              <div>
                                <Label className="text-xs">Managers</Label>
                                <div className="flex items-center gap-2 mt-1">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => modifyQuotaValue(org.organization_id, "managers", -1)}
                                    disabled={!mods || mods.managers <= 1 || isSaving}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  <Input
                                    type="number"
                                    value={mods?.managers ?? quota.managersLimit} // Use nullish coalescing for default
                                    onChange={(e) => {
                                      const val = Number.parseInt(e.target.value) || 0
                                      setQuotaModifications((prev) => ({
                                        ...prev,
                                        [org.organization_id]: {
                                          ...prev[org.organization_id],
                                          managers: Math.max(0, val),
                                        },
                                      }))
                                    }}
                                    className="h-8 text-center text-sm"
                                  />
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => modifyQuotaValue(org.organization_id, "managers", 1)}
                                    disabled={isSaving}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            )}

                            {/* Monthly Submissions (Starter only) */}
                            {(org.plan_name || "starter").toLowerCase() === "starter" &&
                              quota.monthlySubmissionsLimit !== null && (
                                <div>
                                  <Label className="text-xs">Monthly Reports</Label>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => modifyQuotaValue(org.organization_id, "monthlySubmissions", -10)}
                                      disabled={!mods || mods.monthlySubmissions <= 10 || isSaving}
                                      className="h-8 w-8 p-0"
                                    >
                                      <Minus className="h-3 w-3" />
                                    </Button>
                                    <Input
                                      type="number"
                                      value={mods?.monthlySubmissions ?? quota.monthlySubmissionsLimit ?? 50} // Use nullish coalescing for default
                                      onChange={(e) => {
                                        const val = Number.parseInt(e.target.value) || 0
                                        setQuotaModifications((prev) => ({
                                          ...prev,
                                          [org.organization_id]: {
                                            ...prev[org.organization_id],
                                            monthlySubmissions: Math.max(0, val),
                                          },
                                        }))
                                      }}
                                      className="h-8 text-center text-sm"
                                    />
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => modifyQuotaValue(org.organization_id, "monthlySubmissions", 10)}
                                      disabled={isSaving}
                                      className="h-8 w-8 p-0"
                                    >
                                      <Plus className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              )}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleModifyQuota(org.organization_id)}
                              className="flex-1 bg-yellow-600 hover:bg-yellow-700"
                              size="sm"
                              disabled={isSaving}
                            >
                              {isSaving ? "Saving..." : "Save Changes"}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setQuotaPanelOpen((prev) => {
                                  const newPanels = new Set(prev)
                                  newPanels.delete(org.organization_id)
                                  return newPanels
                                })
                                // Removed password clearing on cancel
                              }}
                              size="sm"
                              disabled={isSaving}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}

                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleEmailReports(org.organization_id)}
                        className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        Email Reports to Admins
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => onArchive(org)} className="w-full sm:w-auto">
                        <Archive className="w-4 h-4 mr-2" />
                        {org.is_archived ? "Unarchive" : "Archive"}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => onDelete(org)}
                        className="w-full sm:w-auto"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                    </>
                  ) : (
                    <div className="text-center py-4 text-gray-500">Failed to load quota data</div>
                  )}
                </CardContent>
              )}
            </Card>
          )
        })}

        {filteredOrgs.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              No organizations found matching your search
            </CardContent>
          </Card>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-sm text-gray-600">
            Showing {startIndex + 1}-{Math.min(endIndex, filteredOrgs.length)} of {filteredOrgs.length} organizations
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = i + 1
                return (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className="w-10"
                  >
                    {page}
                  </Button>
                )
              })}
              {totalPages > 5 && <span className="px-2">...</span>}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
