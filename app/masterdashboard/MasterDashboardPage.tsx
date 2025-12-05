"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuthAndData } from "./useAuthAndData"
import { ConfirmDialog } from "./ConfirmDialog"
import { UserList } from "./UserList"
import { OrganizationList } from "./OrganizationList"
import { SubscriptionList } from "./SubscriptionList"
import { PaymentList } from "./PaymentList"
import { FeedbackList } from "./FeedbackList"
import { FeedbackResponseModal } from "./FeedbackResponseModal"
import { SuperuserToolsSection } from "./SuperuserToolsSection"
import { OverviewTab } from "./components/OverviewTab"
import type { ConfirmDialogState, Feedback, Organization, Subscription } from "./types"
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
  const { isLoading: loading, data, notification, showNotification, refreshData, userRole } = useAuthAndData()
  console.log("[v0] useAuthAndData hook returned:", { loading, hasData: !!data, notification })

  const calculateStats = () => {
    if (!data) {
      return {
        totalOrganizations: 0,
        totalUsers: 0,
        activeSubscriptions: 0,
        totalRevenue: 0,
        newSignupsThisMonth: 0,
        conversionRate: 0,
        paidCustomers: 0,
        complimentaryCustomers: 0,
        totalReports: 0,
        totalTemplates: 0,
        totalChecklists: 0,
      }
    }

    const paidSubs =
      data.subscriptions?.filter((s: any) => s.status === "active" && s.stripe_subscription_id && !s.is_trial) || []

    const trialSubs =
      data.subscriptions?.filter((s: any) => s.status === "active" && (s.is_trial || s.is_masteradmin_trial)) || []

    const totalRevenue =
      data.payments
        ?.filter((p: any) => p.status === "succeeded")
        .reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0

    return {
      totalOrganizations: data.organizations?.length || 0,
      totalUsers: data.profiles?.length || 0,
      activeSubscriptions: data.subscriptions?.filter((s: any) => s.status === "active").length || 0,
      totalRevenue: totalRevenue / 100, // Convert cents to pounds
      newSignupsThisMonth: data.stats?.newSignupsThisMonth || 0,
      conversionRate: data.stats?.conversionRate || 0,
      paidCustomers: paidSubs.length,
      complimentaryCustomers: trialSubs.length,
      totalReports: 0, // TODO: Add when reports data is available
      totalTemplates: data.stats?.totalTemplates || 0,
      totalChecklists: data.stats?.totalChecklists || 0,
    }
  }

  const calculateDatabaseStats = () => {
    if (!data) {
      return {
        checklists: { total: 0, completed: 0, pending: 0 },
        templates: { total: 0, active: 0, inactive: 0 },
      }
    }

    return {
      checklists: {
        total: data.stats?.totalChecklists || 0,
        completed: 0,
        pending: 0,
      },
      templates: {
        total: data.stats?.totalTemplates || 0,
        active: data.stats?.totalTemplates || 0,
        inactive: 0,
      },
    }
  }

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
          vercel: {
            functionExecutionHours: apiData.vercel.functionExecutionHours,
            buildMinutes: apiData.vercel.buildMinutes,
          },
          resend: {
            sentToday: apiData.resend.sentToday,
            sentThisMonth: apiData.resend.sentThisMonth,
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
    if (!confirm(`Are you sure you want to ${org.is_archived ? "unarchive" : "archive"} ${org.organization_name}?`)) {
      return
    }

    try {
      const response = await fetch("/api/master/archive-organization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: org.organization_id, archive: !org.is_archived }),
      })

      if (response.ok) {
        showNotification(`Organization ${org.is_archived ? "unarchived" : "archived"} successfully`, "success")
        refreshData()
      } else {
        const data = await response.json()
        showNotification(data.error || "Failed to archive organization", "error")
      }
    } catch (error) {
      showNotification("Error archiving organization", "error")
    }
  }

  const handleDeleteOrg = async (org: Organization) => {
    if (
      !confirm(
        `⚠️ WARNING: Are you sure you want to DELETE ${org.organization_name}? This action is IRREVERSIBLE and will delete all data including users, templates, and reports!`,
      )
    ) {
      return
    }

    const confirmText = prompt('Type "DELETE" to confirm permanent deletion:')
    if (confirmText !== "DELETE") {
      showNotification("Deletion cancelled", "info")
      return
    }

    try {
      const response = await fetch("/api/master/delete-organization", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: org.organization_id }),
      })

      if (response.ok) {
        showNotification("Organization deleted successfully", "success")
        refreshData()
      } else {
        const data = await response.json()
        showNotification(data.error || "Failed to delete organization", "error")
      }
    } catch (error) {
      showNotification("Error deleting organization", "error")
    }
  }

  const handleManageSubscription = (sub: Subscription) => {
    showNotification("Subscription management coming soon", "info")
  }

  const handleRefund = async (refundData: { id: string; amount?: number; reason: string }) => {
    try {
      const response = await fetch("/api/master/refund-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId: refundData.id,
          amount: refundData.amount,
          reason: refundData.reason,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to process refund")
      }

      showNotification(
        `${result.refundType === "full" ? "Full" : "Partial"} refund of $${result.refundAmount.toFixed(2)} processed successfully`,
        "success",
      )
      refreshData()
    } catch (error: any) {
      showNotification(error.message || "Failed to process refund", "error")
      throw error
    }
  }

  const handleForceSync = async (organizationId: string, userEmail: string) => {
    console.log("[v0] Forcing subscription sync for:", { organizationId, userEmail })

    try {
      const response = await fetch("/api/admin/force-sync-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId, userEmail }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Sync failed")
      }

      showNotification(result.message || "Subscription synced successfully from Stripe!", "success")
      refreshData()
    } catch (error: any) {
      console.error("[v0] Force sync error:", error)
      showNotification(error.message || "Failed to sync subscription", "error")
    }
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

  const handleEmailReports = async (organizationId: string) => {
    if (!confirm("Send all organization reports to all admins via email?")) {
      return
    }

    try {
      const response = await fetch("/api/master/email-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId }),
      })

      if (response.ok) {
        showNotification("Reports sent successfully to all admins", "success")
      } else {
        const data = await response.json()
        showNotification(data.error || "Failed to send reports", "error")
      }
    } catch (error) {
      showNotification("Error sending reports", "error")
    }
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
        onEmailReports={handleEmailReports}
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
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Master Admin Dashboard</h1>
        <p className="text-gray-600">Manage all organizations, users, and subscriptions</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-7 lg:grid-cols-7">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="organizations">Organizations</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
          <TabsTrigger value="superusers">Superusers</TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="overview">
            <OverviewTab
              stats={calculateStats()}
              databaseStats={calculateDatabaseStats()}
              usageMetrics={usageMetrics}
              metricsLastRefreshed={metricsLastRefreshed}
              refreshUsageMetrics={refreshUsageMetrics}
            />
          </TabsContent>

          <TabsContent value="organizations">{renderOrganizations()}</TabsContent>

          <TabsContent value="users">
            <UserList users={data?.profiles || []} onNotification={refreshData} />
          </TabsContent>

          <TabsContent value="subscriptions">
            <SubscriptionList
              subscriptions={data?.subscriptions || []}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              onManage={handleManageSubscription}
              onRefresh={refreshData}
              onForceSync={handleForceSync}
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
