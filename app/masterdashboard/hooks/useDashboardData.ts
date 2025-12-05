"use client"

import { useState, useEffect } from "react"

export function useDashboardData() {
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/master/dashboard-data")

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const result = await response.json()
      console.log("[v0] Dashboard data loaded:", result)

      // Transform data to match OverviewTab expectations
      const transformedData = {
        stats: {
          totalOrganizations: result.stats?.totalOrgs || 0,
          totalUsers: result.stats?.totalUsers || 0,
          activeSubscriptions: result.subscriptions?.length || 0,
          totalRevenue: result.stats?.totalRevenue || 0,
          newSignupsThisMonth: result.stats?.newSignupsThisMonth || 0,
          conversionRate: result.stats?.conversionRate || 0,
          paidCustomers: result.stats?.paidCustomers || 0,
          complimentaryCustomers: 0,
          totalReports: result.stats?.totalReports || 0,
          totalTemplates: result.stats?.totalTemplates || 0,
          totalChecklists: result.stats?.totalChecklists || 0,
        },
        databaseStats: {
          checklists: {
            total: result.checklistsData?.totalAssignments || 0,
            completed: result.checklistsData?.completed || 0,
            pending: result.checklistsData?.pending || 0,
          },
          templates: {
            total: result.stats?.totalTemplates || 0,
            active: result.checklistsData?.activeTemplates || 0,
            inactive: 0,
          },
        },
      }

      setData(transformedData)
    } catch (err) {
      console.error("[v0] Error loading dashboard data:", err)
      setError(err instanceof Error ? err.message : "Failed to load data")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  return { data, isLoading, error, refresh: loadData }
}
