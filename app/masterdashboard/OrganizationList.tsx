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
}: OrganizationListProps) {
  const [expandedOrgs, setExpandedOrgs] = useState<Set<string>>(new Set())
  const [quotaData, setQuotaData] = useState<Record<string, QuotaData>>({})
  const [loadingQuota, setLoadingQuota] = useState<Set<string>>(new Set())
  const [quotaPanelOpen, setQuotaPanelOpen] = useState<Record<string, boolean>>({})
  const [quotaModifications, setQuotaModifications] = useState<
    Record<
      string,
      {
        templates: number
        teamMembers: number
        managers: number
        monthlySubmissions: number
      }
    >
  >({})
  const [masterPassword, setMasterPassword] = useState("")
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
    setQuotaPanelOpen((prev) => ({ ...prev, [orgId]: !prev[orgId] }))
    if (!quotaModifications[orgId] && quotaData[orgId]) {
      // Initialize with current values
      setQuotaModifications((prev) => ({
        ...prev,
        [orgId]: {
          templates: quotaData[orgId].templatesLimit,
          teamMembers: quotaData[orgId].teamMembersLimit,
          managers: quotaData[orgId].managersLimit,
          monthlySubmissions: quotaData[orgId].monthlySubmissionsLimit || 50,
        },
      }))
    }
  }

  const modifyQuotaValue = (
    orgId: string,
    field: "templates" | "teamMembers" | "managers" | "monthlySubmissions",
    delta: number,
  ) => {
    setQuotaModifications((prev) => {
      const current = prev[orgId] || {
        templates: quotaData[orgId]?.templatesLimit || 0,
        teamMembers: quotaData[orgId]?.teamMembersLimit || 0,
        managers: quotaData[orgId]?.managersLimit || 0,
        monthlySubmissions: quotaData[orgId]?.monthlySubmissionsLimit || 50,
      }
      return {
        ...prev,
        [orgId]: {
          ...current,
          [field]: Math.max(0, current[field] + delta),
        },
      }
    })
  }

  const handleResetToDefaults = (orgId: string) => {
    const quota = quotaData[orgId]
    if (!quota) return

    // Plan defaults based on plan name
    const defaults = {
      starter: { templates: 3, teamMembers: 5, managers: 1, monthlySubmissions: 50 },
      growth: { templates: 10, teamMembers: 25, managers: 3, monthlySubmissions: null },
      scale: { templates: 20, teamMembers: 75, managers: 7, monthlySubmissions: null },
    }

    const planKey = (quota.plan_name || "starter").toLowerCase()
    const planDefaults = defaults[planKey as keyof typeof defaults] || defaults.starter

    setQuotaModifications((prev) => ({
      ...prev,
      [orgId]: {
        templates: planDefaults.templates,
        teamMembers: planDefaults.teamMembers,
        managers: planDefaults.managers,
        monthlySubmissions: planDefaults.monthlySubmissions || 50,
      },
    }))

    toast({
      title: "Reset to Defaults",
      description: `Quota values reset to ${quota.plan_name || "Starter"} plan defaults. Click Save to apply.`,
    })
  }

  const saveQuotaModifications = async (orgId: string) => {
    if (!masterPassword) {
      toast({
        title: "Password Required",
        description: "Please enter master admin password to modify quotas",
        variant: "destructive",
      })
      return
    }

    setSavingQuota((prev) => new Set(prev).add(orgId))

    try {
      const modifications = quotaModifications[orgId]
      const quota = quotaData[orgId]

      const updates = []

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
              masterAdminPassword: masterPassword,
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
              masterAdminPassword: masterPassword,
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
              masterAdminPassword: masterPassword,
            }),
          }),
        )
      }

      if (quota.monthlySubmissionsLimit && modifications.monthlySubmissions !== quota.monthlySubmissionsLimit) {
        updates.push(
          fetch("/api/master/modify-quota", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              organizationId: orgId,
              fieldName: "monthly_submissions",
              newValue: modifications.monthlySubmissions,
              reason: "Master admin quota adjustment",
              masterAdminPassword: masterPassword,
            }),
          }),
        )
      }

      if (updates.length > 0) {
        const results = await Promise.all(updates)
        const allSucceeded = results.every((res) => res.ok)

        if (allSucceeded) {
          await fetchQuotaData(orgId)
          onRefresh()
          toast({
            title: "Success",
            description: "Quota modifications saved successfully",
          })
          setQuotaPanelOpen((prev) => {
            const newSet = new Set(prev)
            newSet.delete(orgId)
            return newSet
          })
        } else {
          toast({
            title: "Error",
            description: "Some quota modifications failed. Please check password and try again.",
            variant: "destructive",
          })
        }
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
          const isPanelOpen = quotaPanelOpen[org.organization_id]
          const isSaving = savingQuota.has(org.organization_id)
          const mods = quotaModifications[org.organization_id]

          return (
            <Card key={org.organization_id} className="border-2 hover:border-gray-300 transition-colors">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <CardTitle className="text-base sm:text-lg">{org.organization_name}</CardTitle>
                      {org.staff_reports_page_enabled && (
                        <Badge variant="secondary" className="text-xs">
                          Staff Reports
                        </Badge>
                      )}
                      <Badge variant="outline" className="capitalize text-xs">
                        {org.plan_name || "Starter"}
                      </Badge>
                      {org.is_masteradmin_trial && (
                        <div className="flex flex-wrap gap-1">
                          <Badge className="bg-purple-600 text-xs">Complimentary Trial</Badge>
                          <Badge variant="outline" className="text-xs">
                            No Payment
                          </Badge>
                        </div>
                      )}
                      {org.is_trial && !org.is_masteradmin_trial && (
                        <div className="flex flex-wrap gap-1">
                          <Badge className="bg-blue-600 text-xs">Paid Trial</Badge>
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
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
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
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-2">
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

                      {/* Quota Modification Panel */}
                      {isPanelOpen && (
                        <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4 space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-yellow-800">Modify Quotas (Master Admin)</h4>
                            <Button variant="ghost" size="sm" onClick={() => toggleQuotaPanel(org.organization_id)}>
                              Close
                            </Button>
                          </div>

                          {/* Templates Modification */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs">Templates</Label>
                              <div className="flex items-center gap-2 mt-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => modifyQuotaValue(org.organization_id, "templates", -1)}
                                  disabled={!mods || mods.templates <= 1}
                                  className="h-8 w-8 p-0"
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <Input
                                  type="number"
                                  value={mods?.templates || quota.templatesLimit}
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
                                  disabled={!mods || mods.teamMembers <= 1}
                                  className="h-8 w-8 p-0"
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <Input
                                  type="number"
                                  value={mods?.teamMembers || quota.teamMembersLimit}
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
                                  className="h-8 w-8 p-0"
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>

                            {/* Managers Modification */}
                            {mods && quota.plan_name && (quota.plan_name || "starter").toLowerCase() !== "starter" && (
                              <div>
                                <Label className="text-xs">Managers</Label>
                                <div className="flex items-center gap-2 mt-1">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => modifyQuotaValue(org.organization_id, "managers", -1)}
                                    disabled={!mods || mods.managers <= 1}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  <Input
                                    type="number"
                                    value={mods?.managers || quota.managersLimit}
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
                                    className="h-8 w-8 p-0"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            )}

                            {/* Monthly Submissions Modification */}
                            {mods && quota.plan_name && (quota.plan_name || "starter").toLowerCase() === "starter" && (
                              <div>
                                <Label className="text-xs">Monthly Submissions</Label>
                                <div className="flex items-center gap-2 mt-1">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => modifyQuotaValue(org.organization_id, "monthlySubmissions", -5)}
                                    disabled={!mods || mods.monthlySubmissions <= 5}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  <Input
                                    type="number"
                                    value={mods?.monthlySubmissions || quota.monthlySubmissionsLimit || 50}
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
                                    onClick={() => modifyQuotaValue(org.organization_id, "monthlySubmissions", 5)}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            )}

                            {/* Password Input */}
                            <div className="col-span-2 border-t pt-4 space-y-2">
                              <Label htmlFor={`password-${org.organization_id}`} className="text-sm">
                                Master Admin Password
                              </Label>
                              <Input
                                id={`password-${org.organization_id}`}
                                type="password"
                                placeholder="Required to save changes"
                                value={masterPassword}
                                onChange={(e) => setMasterPassword(e.target.value)}
                                className="text-sm"
                              />
                            </div>

                            {/* Save Button */}
                            <div className="col-span-2 flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleResetToDefaults(org.organization_id)}
                                disabled={isSaving}
                                className="flex items-center gap-2"
                              >
                                <RotateCw className="w-4 h-4" />
                                Reset to Plan Defaults
                              </Button>
                              <Button
                                onClick={() => saveQuotaModifications(org.organization_id)}
                                disabled={!masterPassword || isSaving}
                                className="flex-1"
                              >
                                {isSaving ? "Saving..." : "Save Quota Changes"}
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setQuotaPanelOpen((prev) => ({ ...prev, [org.organization_id]: false }))
                                  setMasterPassword("")
                                }}
                                disabled={isSaving}
                              >
                                Cancel
                              </Button>
                            </div>

                            <p className="col-span-2 text-xs text-gray-600 text-center">
                              Changes will override subscription limits across the entire system
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Email Reports Button */}
                      <div className="flex items-center gap-2 pt-4 border-t">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleEmailReports(org.organization_id)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                            />
                          </svg>
                          Email Reports to Admins
                        </Button>
                        <Button
                          variant={org.is_archived ? "outline" : "destructive"}
                          size="sm"
                          onClick={() => onArchive(org)}
                        >
                          <Archive className="w-4 h-4 mr-2" />
                          {org.is_archived ? "Unarchive" : "Archive"}
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => onDelete(org)}>
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      </div>
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
