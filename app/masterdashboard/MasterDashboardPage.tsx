"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuthAndData } from "./useAuthAndData"
import { ConfirmDialog } from "./ConfirmDialog"
import { UserList } from "./UserList"
import { OrganizationList } from "./OrganizationList"
import { SubscriptionList } from "./SubscriptionList"
import { PaymentList } from "./PaymentList"
import { FeedbackList } from "./FeedbackList"
import { FeedbackResponseModal } from "./FeedbackResponseModal"
import { ReportDirectorySection } from "./ReportDirectorySection"
import { SuperuserToolsSection } from "./SuperuserToolsSection"
import type { ConfirmDialogState, Feedback, Organization, Subscription, Payment } from "./types"
import {
  UsersIcon,
  RefreshCw,
  Database,
  HardDrive,
  Building2,
  UserPlus,
  TrendingUp,
  CheckSquare,
  FileCheck,
  Activity,
} from "lucide-react"
import { useRouter } from "next/navigation"

export default function MasterDashboardPage() {
  console.log("[v0] MasterDashboardPage component initializing")
  const router = useRouter()

  const [activeTab, setActiveTab] = useState("overview")
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    show: false,
    title: "",
    message: "",
    onConfirm: () => {},
  })
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [orgSearchTerm, setOrgSearchTerm] = useState("")

  const [usageMetrics, setUsageMetrics] = useState<any>(null)
  const [isRefreshingMetrics, setIsRefreshingMetrics] = useState(false)
  const [metricsLastRefreshed, setMetricsLastRefreshed] = useState<string | null>(null)

  console.log("[v0] About to call useAuthAndData hook")
  const { isLoading: loading, data, notification, showNotification, refreshData } = useAuthAndData()
  console.log("[v0] useAuthAndData hook returned:", { loading, hasData: !!data, notification })

  useEffect(() => {
    console.log("[v0] useEffect for metrics cache running")
    try {
      const cached = localStorage.getItem("mydaylogs_usage_metrics")
      const timestamp = localStorage.getItem("mydaylogs_usage_metrics_timestamp")

      if (cached && timestamp) {
        const cacheAge = Date.now() - new Date(timestamp).getTime()
        const oneHour = 60 * 60 * 1000

        if (cacheAge < oneHour) {
          setUsageMetrics(JSON.parse(cached))
          const cacheDate = new Date(timestamp)
          setMetricsLastRefreshed(`${cacheDate.getHours()}:${cacheDate.getMinutes().toString().padStart(2, "0")}`)
        }
      }
    } catch (err) {
      // Silent fail
    }
  }, [])

  const refreshUsageMetrics = async () => {
    setIsRefreshingMetrics(true)
    try {
      const response = await fetch("/api/master/usage-metrics", { cache: "no-store" })
      const apiData = await response.json()

      if (response.ok && apiData?.supabase) {
        const metricsData = {
          storage: {
            database: apiData.supabase.database.usedMB * 1024 * 1024, // Convert MB to bytes
            storage: apiData.supabase.storage.usedMB * 1024 * 1024, // Convert MB to bytes
          },
          counts: {
            authUsers: apiData.counts.authUsers,
            activeUsersThisMonth: apiData.counts.activeUsersThisMonth,
            totalRows: apiData.counts.totalRows,
            profiles: apiData.counts.profiles,
            organizations: apiData.counts.organizations,
          },
          bandwidth: {
            egress: apiData.vercel.bandwidth.usedGB * 1024 * 1024 * 1024, // Convert GB to bytes
          },
        }

        setUsageMetrics(metricsData)
        const now = new Date()
        const timeStr = `${now.getHours()}:${now.getMinutes().toString().padStart(2, "0")}`
        setMetricsLastRefreshed(timeStr)

        localStorage.setItem("mydaylogs_usage_metrics", JSON.stringify(metricsData))
        localStorage.setItem("mydaylogs_usage_metrics_timestamp", now.toISOString())
      }
    } catch (err) {
      console.error("[v0] Failed to fetch usage metrics:", err)
    } finally {
      setIsRefreshingMetrics(false)
    }
  }

  const handleSignOut = async () => {
    const res = await fetch("/api/master/signout", { method: "POST" })
    if (res.ok) {
      refreshData()
      router.push("/masterlogin")
    }
  }

  const handleArchiveOrg = async (org: Organization) => {
    showNotification("Archive functionality coming soon", "info")
  }

  const handleDeleteOrg = async (org: Organization) => {
    showNotification("Delete functionality coming soon", "info")
  }

  const handleManageSubscription = (sub: Subscription) => {
    showNotification("Subscription management coming soon", "info")
  }

  const handleRefund = (payment: Payment) => {
    setConfirmDialog({
      show: true,
      title: "Issue Refund",
      message: `Issue refund of $${(payment.amount / 100).toFixed(2)} for ${payment.organization_name}?`,
      onConfirm: async () => {
        showNotification("Refund issued successfully", "success")
        refreshData()
      },
      type: "warning",
    })
  }

  const handleRespondToFeedback = async (feedbackId: string, response: string) => {
    const res = await fetch("/api/admin/respond-to-feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feedbackId, response }),
    })
    if (res.ok) {
      showNotification("Response sent successfully", "success")
      setSelectedFeedback(null)
      refreshData()
    } else {
      showNotification("Failed to send response", "error")
    }
  }

  const handleAddSuperuser = async (email: string, password: string) => {
    const res = await fetch("/api/master/add-superuser", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })
    if (res.ok) {
      showNotification("Superuser added successfully", "success")
      refreshData()
    } else {
      const data = await res.json()
      showNotification(data.error || "Failed to add superuser", "error")
    }
  }

  const handleRemoveSuperuser = async (id: string) => {
    const res = await fetch("/api/master/remove-superuser", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ superuserId: id }),
    })
    if (res.ok) {
      showNotification("Superuser removed successfully", "success")
      refreshData()
    } else {
      const data = await res.json()
      showNotification(data.error || "Failed to remove superuser", "error")
    }
  }

  const handleUpdateSuperuser = async (id: string, password: string) => {
    const res = await fetch("/api/master/update-superuser", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ superuserId: id, newPassword: password }),
    })
    if (res.ok) {
      showNotification("Superuser updated successfully", "success")
      refreshData()
    } else {
      const data = await res.json()
      showNotification(data.error || "Failed to update superuser", "error")
    }
  }

  const renderOverview = () => {
    if (!data?.stats) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-500">Loading dashboard data...</p>
        </div>
      )
    }

    const stats = {
      totalOrganizations: data.stats.totalOrgs || 0,
      totalUsers: data.stats.totalUsers || 0,
      newSignupsThisMonth: data.stats.newSignupsThisMonth || 0,
      conversionRate: data.stats.conversionRate || 0,
      totalTemplates: data.stats.totalTemplates || 0,
      totalChecklists: data.stats.totalChecklists || 0,
    }

    const formatBytes = (bytes: number) => {
      if (bytes === 0) return "0 B"
      const k = 1024
      const sizes = ["B", "KB", "MB", "GB"]
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
    }

    const getPercentage = (used: number, limit: number) => {
      if (limit === 0) return 0
      return Math.min(Math.round((used / limit) * 100), 100)
    }

    const getStatusColor = (percentage: number) => {
      if (percentage >= 90) return "text-red-600"
      if (percentage >= 70) return "text-yellow-600"
      return "text-green-600"
    }

    return (
      <div className="space-y-6">
        {/* Server Management - Single source of truth */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg">Server Management</CardTitle>
                <CardDescription>
                  Monitor free tier usage limits
                  {metricsLastRefreshed && ` • Last updated: ${metricsLastRefreshed}`}
                </CardDescription>
              </div>
              <Button onClick={refreshUsageMetrics} disabled={isRefreshingMetrics} variant="outline" size="sm">
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshingMetrics ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!usageMetrics ? (
              <div className="text-center py-8 text-gray-500">
                <Database className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm mb-2">No usage metrics loaded</p>
                <p className="text-xs text-gray-400">Click Refresh to fetch real-time metrics</p>
              </div>
            ) : (
              <div>
                {/* Database Records Breakdown */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-sm font-semibold mb-3 text-gray-700">Database Records Breakdown</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 text-xs">
                    <div>
                      <span className="text-gray-600">Auth Users:</span>
                      <span className="ml-2 font-medium">{usageMetrics.counts?.authUsers || 0}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Active This Month:</span>
                      <span className="ml-2 font-medium">{usageMetrics.counts?.activeUsersThisMonth || 0}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Total Rows:</span>
                      <span className="ml-2 font-medium">{(usageMetrics.counts?.totalRows || 0).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Profiles:</span>
                      <span className="ml-2 font-medium">{usageMetrics.counts?.profiles || 0}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Organizations:</span>
                      <span className="ml-2 font-medium">{usageMetrics.counts?.organizations || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Supabase & Vercel Metrics */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold mb-3 text-gray-700">Service Usage Metrics</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Database */}
                      <div className="border rounded-lg p-4 bg-white">
                        <div className="flex items-start justify-between mb-2">
                          <Database className="h-5 w-5 text-blue-600" />
                          <span className="text-xs font-medium text-gray-500">500MB limit</span>
                        </div>
                        <h4 className="font-medium text-sm mb-1">Supabase Database</h4>
                        <div className="text-2xl font-bold mb-1">
                          {formatBytes(usageMetrics.storage?.database || 0)}
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{
                              width: `${getPercentage(usageMetrics.storage?.database || 0, 500 * 1024 * 1024)}%`,
                            }}
                          />
                        </div>
                        <p
                          className={`text-xs font-medium ${getStatusColor(getPercentage(usageMetrics.storage?.database || 0, 500 * 1024 * 1024))}`}
                        >
                          {getPercentage(usageMetrics.storage?.database || 0, 500 * 1024 * 1024)}% used
                        </p>
                      </div>

                      {/* Storage */}
                      <div className="border rounded-lg p-4 bg-white">
                        <div className="flex items-start justify-between mb-2">
                          <HardDrive className="h-5 w-5 text-green-600" />
                          <span className="text-xs font-medium text-gray-500">1GB limit</span>
                        </div>
                        <h4 className="font-medium text-sm mb-1">File Storage</h4>
                        <div className="text-2xl font-bold mb-1">{formatBytes(usageMetrics.storage?.storage || 0)}</div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                          <div
                            className="bg-green-600 h-2 rounded-full transition-all"
                            style={{
                              width: `${getPercentage(usageMetrics.storage?.storage || 0, 1024 * 1024 * 1024)}%`,
                            }}
                          />
                        </div>
                        <p
                          className={`text-xs font-medium ${getStatusColor(getPercentage(usageMetrics.storage?.storage || 0, 1024 * 1024 * 1024))}`}
                        >
                          {getPercentage(usageMetrics.storage?.storage || 0, 1024 * 1024 * 1024)}% used
                        </p>
                      </div>

                      {/* Bandwidth (Egress) */}
                      <div className="border rounded-lg p-4 bg-white">
                        <div className="flex items-start justify-between mb-2">
                          <Activity className="h-5 w-5 text-purple-600" />
                          <span className="text-xs font-medium text-gray-500">5GB/mo limit</span>
                        </div>
                        <h4 className="font-medium text-sm mb-1">Bandwidth (Egress)</h4>
                        <div className="text-2xl font-bold mb-1">
                          {formatBytes(usageMetrics.bandwidth?.egress || 0)}
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                          <div
                            className="bg-purple-600 h-2 rounded-full transition-all"
                            style={{
                              width: `${getPercentage(usageMetrics.bandwidth?.egress || 0, 5 * 1024 * 1024 * 1024)}%`,
                            }}
                          />
                        </div>
                        <p
                          className={`text-xs font-medium ${getStatusColor(getPercentage(usageMetrics.bandwidth?.egress || 0, 5 * 1024 * 1024 * 1024))}`}
                        >
                          {getPercentage(usageMetrics.bandwidth?.egress || 0, 5 * 1024 * 1024 * 1024)}% used
                        </p>
                      </div>

                      {/* Monthly Active Users */}
                      <div className="border rounded-lg p-4 bg-white">
                        <div className="flex items-start justify-between mb-2">
                          <UsersIcon className="h-5 w-5 text-orange-600" />
                          <span className="text-xs font-medium text-gray-500">50K/mo limit</span>
                        </div>
                        <h4 className="font-medium text-sm mb-1">Monthly Active Users</h4>
                        <div className="text-2xl font-bold mb-1">{usageMetrics.counts?.activeUsersThisMonth || 0}</div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                          <div
                            className="bg-orange-600 h-2 rounded-full transition-all"
                            style={{
                              width: `${getPercentage(usageMetrics.counts?.activeUsersThisMonth || 0, 50000)}%`,
                            }}
                          />
                        </div>
                        <p
                          className={`text-xs font-medium ${getStatusColor(getPercentage(usageMetrics.counts?.activeUsersThisMonth || 0, 50000))}`}
                        >
                          {getPercentage(usageMetrics.counts?.activeUsersThisMonth || 0, 50000)}% used
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Essential Stats - Simplified to 6 cards */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">New Signups</CardTitle>
              <UserPlus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.newSignupsThisMonth}</div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Paid Conversion Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.conversionRate}%</div>
              <p className="text-xs text-muted-foreground">To paid plans</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Templates</CardTitle>
              <CheckSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTemplates}</div>
              <p className="text-xs text-muted-foreground">In system</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Assignments</CardTitle>
              <FileCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalChecklists}</div>
              <p className="text-xs text-muted-foreground">Total assigned</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Organizations</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalOrganizations}</div>
              <p className="text-xs text-muted-foreground">Active</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <UsersIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">All roles</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const renderOrganizations = () => {
    if (loading) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Organizations</CardTitle>
            <CardDescription>Loading organizations...</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
            </div>
          </CardContent>
        </Card>
      )
    }

    return (
      <OrganizationList
        organizations={data?.organizations || []}
        searchTerm={orgSearchTerm}
        onSearchChange={setOrgSearchTerm}
        onArchive={handleArchiveOrg}
        onDelete={handleDeleteOrg}
        onRefresh={refreshData}
      />
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
          <p className="text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center text-white">
              <UsersIcon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">System Dashboard</h1>
              <p className="text-sm sm:text-base text-gray-500 mt-1">Master admin control panel</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={refreshData} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Comprehensive Sync
            </Button>
            <Badge className="bg-red-600">Master Admin</Badge>
            <Button onClick={handleSignOut} variant="ghost" size="sm">
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      <div className="px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="mb-6 overflow-x-auto">
            <TabsList className="inline-flex w-auto min-w-full">
              <TabsTrigger value="overview" className="whitespace-nowrap">
                Overview
              </TabsTrigger>
              <TabsTrigger value="users" className="whitespace-nowrap">
                Users ({data?.profiles?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="organizations" className="whitespace-nowrap">
                Orgs ({data?.organizations?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="subscriptions" className="whitespace-nowrap">
                Subs ({data?.subscriptions?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="payments" className="whitespace-nowrap">
                Payments ({data?.payments?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="feedback" className="whitespace-nowrap">
                Feedback ({data?.feedback?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="reports" className="whitespace-nowrap">
                Report Directory
              </TabsTrigger>
              <TabsTrigger value="superusers" className="whitespace-nowrap">
                Superusers
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="bg-green-50 rounded-lg p-6 min-h-[600px]">
            <TabsContent value="overview">{renderOverview()}</TabsContent>

            <TabsContent value="users">
              <UserList users={data?.profiles || []} onNotification={refreshData} />
            </TabsContent>

            <TabsContent value="organizations">{renderOrganizations()}</TabsContent>

            <TabsContent value="subscriptions">
              <SubscriptionList
                subscriptions={data?.subscriptions || []}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                onManage={handleManageSubscription}
                onRefresh={refreshData}
              />
            </TabsContent>

            <TabsContent value="payments">
              <PaymentList
                payments={data?.payments || []}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                onRefund={handleRefund}
                onRefresh={refreshData}
              />
            </TabsContent>

            <TabsContent value="feedback">
              <FeedbackList
                feedback={data?.feedback}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                onRespond={setSelectedFeedback}
                onRefresh={refreshData}
              />
            </TabsContent>

            <TabsContent value="reports">
              <ReportDirectorySection />
            </TabsContent>

            <TabsContent value="superusers">
              <SuperuserToolsSection
                superusers={data?.superusers || []}
                onAddSuperuser={handleAddSuperuser}
                onRemoveSuperuser={handleRemoveSuperuser}
                onUpdateSuperuser={handleUpdateSuperuser}
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Notification Component */}
      {/* Notifications now handled by Sonner toast via showNotification utility */}

      <ConfirmDialog dialog={confirmDialog} onClose={() => setConfirmDialog({ ...confirmDialog, show: false })} />
      <FeedbackResponseModal
        feedback={selectedFeedback}
        onClose={() => setSelectedFeedback(null)}
        onSubmit={handleRespondToFeedback}
      />
    </div>
  )
}
