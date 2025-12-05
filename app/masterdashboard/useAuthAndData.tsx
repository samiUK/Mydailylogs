"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import type { DashboardData, NotificationState } from "./types"

export function useAuthAndData() {
  console.log("[v0] useAuthAndData hook starting")
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [data, setData] = useState<DashboardData>({
    organizations: [],
    profiles: [],
    subscriptions: [],
    payments: [],
    feedback: [],
    superusers: [],
    stats: {},
    checklistsData: {},
    counts: {
      organizations: 0,
      profiles: 0,
      subscriptions: 0,
      payments: 0,
      feedback: 0,
    },
    timestamp: "",
  })

  const [notification, setNotification] = useState<NotificationState>({
    show: false,
    message: "",
    type: "info",
  })

  const showNotification = (message: string, type: "success" | "error" | "info" = "info") => {
    setNotification({ show: true, message, type })
    setTimeout(() => setNotification({ show: false, message: "", type: "info" }), 3000)
  }

  useEffect(() => {
    console.log("[v0] useAuthAndData useEffect starting")
    const checkAuthAndLoadData = async () => {
      try {
        console.log("[v0] Checking auth...")
        const authRes = await fetch("/api/admin/check-master-auth")

        if (!authRes.ok) {
          console.log("[v0] Auth check failed, redirecting to login")
          setIsLoading(false)
          router.push("/masterlogin")
          return
        }

        const authData = await authRes.json()

        if (!authData.authenticated) {
          setIsLoading(false)
          router.push("/masterlogin")
          return
        }

        setIsAuthenticated(true)

        console.log("[v0] Auth check passed, fetching dashboard data...")
        const dataRes = await fetch("/api/master/dashboard-data")

        if (dataRes.ok) {
          const dashboardData = await dataRes.json()
          console.log("[v0] Dashboard data received:", {
            orgs: dashboardData.organizations?.length,
            profiles: dashboardData.profiles?.length,
            subs: dashboardData.subscriptions?.length,
          })

          const mappedData: DashboardData = {
            organizations: dashboardData.organizations || [],
            profiles: dashboardData.profiles || [],
            subscriptions: dashboardData.subscriptions || [],
            payments: dashboardData.payments || [],
            feedback: dashboardData.feedback || [],
            superusers: dashboardData.superusers || [],
            stats: dashboardData.stats,
            checklistsData: dashboardData.checklistsData,
            counts: dashboardData.counts || {
              organizations: 0,
              profiles: 0,
              subscriptions: 0,
              payments: 0,
              feedback: 0,
            },
            timestamp: dashboardData.timestamp,
          }

          setData(mappedData)
        } else {
          const errorData = await dataRes.json()
          showNotification("Failed to load dashboard data: " + (errorData.error || "Unknown error"), "error")
        }
      } catch (error) {
        showNotification("Failed to load dashboard data", "error")
        router.push("/masterlogin")
      } finally {
        setIsLoading(false)
      }
    }

    checkAuthAndLoadData()
  }, [router])

  return {
    isLoading,
    isAuthenticated,
    data,
    setData,
    notification,
    showNotification,
    loading: isLoading, // Alias for backward compatibility
    error: null, // Error field
    refreshData: async () => {
      // RefreshData function
      setIsLoading(true)
      try {
        const dataRes = await fetch("/api/master/dashboard-data")
        if (dataRes.ok) {
          const dashboardData = await dataRes.json()
          console.log("[v0] Dashboard data received:", {
            orgs: dashboardData.organizations?.length,
            profiles: dashboardData.profiles?.length,
            subs: dashboardData.subscriptions?.length,
          })
          const mappedData: DashboardData = {
            organizations: dashboardData.organizations || [],
            profiles: dashboardData.profiles || [],
            subscriptions: dashboardData.subscriptions || [],
            payments: dashboardData.payments || [],
            feedback: dashboardData.feedback || [],
            superusers: dashboardData.superusers || [],
            stats: dashboardData.stats,
            checklistsData: dashboardData.checklistsData,
            counts: dashboardData.counts || {
              organizations: 0,
              profiles: 0,
              subscriptions: 0,
              payments: 0,
              feedback: 0,
            },
            timestamp: dashboardData.timestamp,
          }
          setData(mappedData)
        }
      } catch (error) {
        showNotification("Failed to refresh data", "error")
      } finally {
        setIsLoading(false)
      }
    },
  }
}
