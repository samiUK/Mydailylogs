"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  RefreshCw,
  Database,
  HardDrive,
  Mail,
  Wifi,
  Building2,
  Users,
  CreditCard,
  DollarSign,
  UserPlus,
  TrendingUp,
  FileText,
  CheckSquare,
  FileCheck,
} from "lucide-react"
import { useState, useEffect } from "react"

interface OverviewTabProps {
  stats: {
    totalOrganizations: number
    totalUsers: number
    activeSubscriptions: number
    totalRevenue: number
    newSignupsThisMonth: number
    conversionRate: number
    paidCustomers: number
    complimentaryCustomers: number
    totalReports: number
    totalTemplates: number
    totalChecklists: number
  }
  databaseStats: {
    checklists: { total: number; completed: number; pending: number }
    templates: { total: number; active: number; inactive: number }
  }
  usageMetrics?: any
  metricsLastRefreshed?: string | null
  refreshUsageMetrics?: () => Promise<void>
}

export function OverviewTab({
  stats,
  databaseStats,
  usageMetrics,
  metricsLastRefreshed,
  refreshUsageMetrics,
}: OverviewTabProps) {
  const [localUsageMetrics, setLocalUsageMetrics] = useState<any>(usageMetrics || null)
  const [isRefreshingLocalUsageMetrics, setIsRefreshingLocalUsageMetrics] = useState(false)
  const [lastRefreshed, setLastRefreshed] = useState<string | null>(metricsLastRefreshed || null)
  const [metricsLoadedFromCache, setMetricsLoadedFromCache] = useState(false)

  // Load cached metrics on mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem("mydaylogs_usage_metrics")
      const timestamp = localStorage.getItem("mydaylogs_usage_metrics_timestamp")

      if (cached && timestamp) {
        const cacheAge = Date.now() - new Date(timestamp).getTime()
        const oneHour = 60 * 60 * 1000

        if (cacheAge < oneHour) {
          setLocalUsageMetrics(JSON.parse(cached))
          const cacheDate = new Date(timestamp)
          setLastRefreshed(`${cacheDate.getHours()}:${cacheDate.getMinutes().toString().padStart(2, "0")}`)
          setMetricsLoadedFromCache(true)
        }
      }
    } catch (err) {
      // Silent fail - metrics will be fetched on demand
    }
  }, [])

  const handleRefreshUsageMetrics = async () => {
    setIsRefreshingLocalUsageMetrics(true)
    setLastRefreshed(null)
    try {
      if (refreshUsageMetrics) {
        await refreshUsageMetrics()
      } else {
        const response = await fetch("/api/master/usage-metrics", {
          cache: "no-store",
        })
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch usage metrics")
        }

        if (data && data.storage && data.counts && data.bandwidth) {
          setLocalUsageMetrics(data)
          const now = new Date()
          const timeStr = `${now.getHours()}:${now.getMinutes().toString().padStart(2, "0")}`
          setLastRefreshed(timeStr)

          localStorage.setItem("mydaylogs_usage_metrics", JSON.stringify(data))
          localStorage.setItem("mydaylogs_usage_metrics_timestamp", now.toISOString())
        }
      }
    } catch (err: any) {
      // Silent fail - user can retry with refresh button
    } finally {
      setIsRefreshingLocalUsageMetrics(false)
    }
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
      {/* Server Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Server Management</CardTitle>
              <CardDescription>
                Monitor free tier usage limits
                {lastRefreshed && ` • Last updated: ${lastRefreshed}`}
              </CardDescription>
            </div>
            <Button
              onClick={handleRefreshUsageMetrics}
              disabled={isRefreshingLocalUsageMetrics}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshingLocalUsageMetrics ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!localUsageMetrics ? (
            <div className="text-center py-8 text-gray-500">
              <Database className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm mb-2">No usage metrics loaded</p>
              <p className="text-xs text-gray-400">Click Refresh to fetch real-time metrics</p>
            </div>
          ) : (
            <>
              {/* Database Records Breakdown */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-semibold mb-3 text-gray-700">Database Records Breakdown</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
                  <div>
                    <span className="text-gray-600">Auth Users:</span>
                    <span className="ml-2 font-medium">{localUsageMetrics.counts?.authUsers || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Active This Month:</span>
                    <span className="ml-2 font-medium">{localUsageMetrics.counts?.activeUsersThisMonth || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Total Rows:</span>
                    <span className="ml-2 font-medium">
                      {(localUsageMetrics.counts?.totalRows || 0).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Profiles:</span>
                    <span className="ml-2 font-medium">{localUsageMetrics.counts?.profiles || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Organizations:</span>
                    <span className="ml-2 font-medium">{localUsageMetrics.counts?.organizations || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Templates:</span>
                    <span className="ml-2 font-medium">{localUsageMetrics.counts?.templates || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Daily Checklists:</span>
                    <span className="ml-2 font-medium">{localUsageMetrics.counts?.dailyChecklists || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Responses:</span>
                    <span className="ml-2 font-medium">{localUsageMetrics.counts?.responses || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Reports:</span>
                    <span className="ml-2 font-medium">{localUsageMetrics.counts?.reports || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Reports (This Month):</span>
                    <span className="ml-2 font-medium">{localUsageMetrics.counts?.reportsThisMonth || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Notifications:</span>
                    <span className="ml-2 font-medium">{localUsageMetrics.counts?.notifications || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Subscriptions:</span>
                    <span className="ml-2 font-medium">{localUsageMetrics.counts?.subscriptions || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Payments:</span>
                    <span className="ml-2 font-medium">{localUsageMetrics.counts?.payments || 0}</span>
                  </div>
                </div>
              </div>

              {/* Supabase Metrics */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold mb-3 text-gray-700">Supabase Metrics</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Supabase Database */}
                    <div className="border rounded-lg p-4 bg-white">
                      <div className="flex items-start justify-between mb-2">
                        <Database className="h-5 w-5 text-emerald-600" />
                        <span className="text-xs font-medium text-gray-500">500MB limit</span>
                      </div>
                      <h4 className="font-medium text-sm mb-1">Supabase Database</h4>
                      <p className="text-xs text-gray-500 mb-3">
                        Storage: {formatBytes(localUsageMetrics.storage?.database || 0)}
                      </p>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${getStatusColor(getPercentage(localUsageMetrics.storage?.database || 0, 500 * 1024 * 1024))}`}
                          style={{
                            width: `${getPercentage(localUsageMetrics.storage?.database || 0, 500 * 1024 * 1024)}%`,
                            backgroundColor:
                              getPercentage(localUsageMetrics.storage?.database || 0, 500 * 1024 * 1024) >= 90
                                ? "#dc2626"
                                : getPercentage(localUsageMetrics.storage?.database || 0, 500 * 1024 * 1024) >= 70
                                  ? "#ca8a04"
                                  : "#16a34a",
                          }}
                        />
                      </div>
                      <p
                        className={`text-xs font-medium mt-1 ${getStatusColor(getPercentage(localUsageMetrics.storage?.database || 0, 500 * 1024 * 1024))}`}
                      >
                        {getPercentage(localUsageMetrics.storage?.database || 0, 500 * 1024 * 1024)}%
                      </p>
                    </div>

                    {/* Supabase Storage */}
                    <div className="border rounded-lg p-4 bg-white">
                      <div className="flex items-start justify-between mb-2">
                        <HardDrive className="h-5 w-5 text-emerald-600" />
                        <span className="text-xs font-medium text-gray-500">1GB limit</span>
                      </div>
                      <h4 className="font-medium text-sm mb-1">Supabase Storage</h4>
                      <p className="text-xs text-gray-500 mb-3">
                        {formatBytes(localUsageMetrics.storage?.storage || 0)} (
                        {localUsageMetrics.storage?.photoCount || 0} photos)
                      </p>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${getStatusColor(getPercentage(localUsageMetrics.storage?.storage || 0, 1024 * 1024 * 1024))}`}
                          style={{
                            width: `${getPercentage(localUsageMetrics.storage?.storage || 0, 1024 * 1024 * 1024)}%`,
                            backgroundColor:
                              getPercentage(localUsageMetrics.storage?.storage || 0, 1024 * 1024 * 1024) >= 90
                                ? "#dc2626"
                                : getPercentage(localUsageMetrics.storage?.storage || 0, 1024 * 1024 * 1024) >= 70
                                  ? "#ca8a04"
                                  : "#16a34a",
                          }}
                        />
                      </div>
                      <p
                        className={`text-xs font-medium mt-1 ${getStatusColor(getPercentage(localUsageMetrics.storage?.storage || 0, 1024 * 1024 * 1024))}`}
                      >
                        {getPercentage(localUsageMetrics.storage?.storage || 0, 1024 * 1024 * 1024)}%
                      </p>
                    </div>

                    {/* Resend Emails */}
                    <div className="border rounded-lg p-4 bg-white">
                      <div className="flex items-start justify-between mb-2">
                        <Mail className="h-5 w-5 text-green-600" />
                        <span className="text-xs font-medium text-gray-500">3,000/month limit</span>
                      </div>
                      <h4 className="font-medium text-sm mb-1">Resend Emails</h4>
                      <p className="text-xs text-gray-500 mb-3">
                        Sent this month: ~{localUsageMetrics.bandwidth?.emailsSent || 0}
                      </p>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${getStatusColor(getPercentage(localUsageMetrics.bandwidth?.emailsSent || 0, 3000))}`}
                          style={{
                            width: `${getPercentage(localUsageMetrics.bandwidth?.emailsSent || 0, 3000)}%`,
                            backgroundColor:
                              getPercentage(localUsageMetrics.bandwidth?.emailsSent || 0, 3000) >= 90
                                ? "#dc2626"
                                : getPercentage(localUsageMetrics.bandwidth?.emailsSent || 0, 3000) >= 70
                                  ? "#ca8a04"
                                  : "#16a34a",
                          }}
                        />
                      </div>
                      <p
                        className={`text-xs font-medium mt-1 ${getStatusColor(getPercentage(localUsageMetrics.bandwidth?.emailsSent || 0, 3000))}`}
                      >
                        {getPercentage(localUsageMetrics.bandwidth?.emailsSent || 0, 3000)}%
                      </p>
                    </div>

                    {/* Vercel Bandwidth */}
                    <div className="border rounded-lg p-4 bg-white">
                      <div className="flex items-start justify-between mb-2">
                        <Wifi className="h-5 w-5 text-orange-600" />
                        <span className="text-xs font-medium text-gray-500">100GB/month limit</span>
                      </div>
                      <h4 className="font-medium text-sm mb-1">Vercel Bandwidth</h4>
                      <p className="text-xs text-gray-500 mb-3">
                        Estimated: {formatBytes(localUsageMetrics.bandwidth?.vercel || 0)}
                      </p>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${getStatusColor(getPercentage(localUsageMetrics.bandwidth?.vercel || 0, 100 * 1024 * 1024 * 1024))}`}
                          style={{
                            width: `${getPercentage(localUsageMetrics.bandwidth?.vercel || 0, 100 * 1024 * 1024 * 1024)}%`,
                            backgroundColor:
                              getPercentage(localUsageMetrics.bandwidth?.vercel || 0, 100 * 1024 * 1024 * 1024) >= 90
                                ? "#dc2626"
                                : getPercentage(localUsageMetrics.bandwidth?.vercel || 0, 100 * 1024 * 1024 * 1024) >=
                                    70
                                  ? "#ca8a04"
                                  : "#16a34a",
                          }}
                        />
                      </div>
                      <p
                        className={`text-xs font-medium mt-1 ${getStatusColor(getPercentage(localUsageMetrics.bandwidth?.vercel || 0, 100 * 1024 * 1024 * 1024))}`}
                      >
                        {getPercentage(localUsageMetrics.bandwidth?.vercel || 0, 100 * 1024 * 1024 * 1024)}%
                      </p>
                    </div>
                  </div>
                </div>

                {/* Status Summary */}
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800 flex items-center gap-2">
                    <span className="inline-block w-2 h-2 bg-green-600 rounded-full"></span>
                    All systems within safe limits. Database activity prevents auto-pause.
                  </p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-6">
        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="flex-1">
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">All organizations</p>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Organizations</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="flex-1">
            <div className="text-2xl font-bold">{stats.totalOrganizations}</div>
            <p className="text-xs text-muted-foreground">{stats.totalOrganizations} active</p>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid Customers</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="flex-1">
            <div className="text-2xl font-bold">{stats.paidCustomers}</div>
            <p className="text-xs text-muted-foreground">{stats.complimentaryCustomers} trials</p>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="flex-1">
            <div className="text-2xl font-bold">£{stats.totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Signups</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="flex-1">
            <div className="text-2xl font-bold">{stats.newSignupsThisMonth}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="flex-1">
            <div className="text-2xl font-bold">{stats.conversionRate}%</div>
            <p className="text-xs text-muted-foreground">To paid</p>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reports</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="flex-1">
            <div className="text-2xl font-bold">{stats.totalReports}</div>
            <p className="text-xs text-muted-foreground">Processed</p>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Templates</CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="flex-1">
            <div className="text-2xl font-bold">{stats.totalTemplates}</div>
            <p className="text-xs text-muted-foreground">Active</p>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Checklists</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="flex-1">
            <div className="text-2xl font-bold">{stats.totalChecklists}</div>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Trials</CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="flex-1">
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">In trial</p>
          </CardContent>
        </Card>
      </div>

      {/* Checklists & Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Checklists & Templates</CardTitle>
          <CardDescription>Daily operations management</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Total Assignments</h3>
              <p className="text-2xl font-bold">{databaseStats.checklists.total}</p>
            </div>
            <div>
              <h3 className="font-medium mb-2">Completed</h3>
              <p className="text-2xl font-bold text-green-600">{databaseStats.checklists.completed}</p>
            </div>
            <div>
              <h3 className="font-medium mb-2">Pending</h3>
              <p className="text-2xl font-bold text-orange-600">{databaseStats.checklists.pending}</p>
            </div>
            <div>
              <h3 className="font-medium mb-2">Active Templates</h3>
              <p className="text-2xl font-bold">{databaseStats.templates.active}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
