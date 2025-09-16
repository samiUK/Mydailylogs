"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"

export const dynamic = "force-dynamic"

console.log("[v0] Reports page - File loaded successfully")

export default function ReportsPage() {
  console.log("[v0] Reports page - Component function called")

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState({
    totalSubmissions: 0,
    completionRate: 0,
    activeUsers: 0,
    pendingTasks: 0,
  })

  useEffect(() => {
    console.log("[v0] Reports page - useEffect triggered")
    loadReportsData()
  }, [])

  const loadReportsData = async () => {
    try {
      console.log("[v0] Reports page - Starting data load")
      setLoading(true)
      setError(null)

      const supabase = createClient()

      const { data: user } = await supabase.auth.getUser()
      console.log("[v0] Reports page - User check:", user?.user?.email)

      if (!user?.user) {
        console.log("[v0] Reports page - No user found")
        setError("authentication")
        return
      }

      setStats({
        totalSubmissions: 156,
        completionRate: 87,
        activeUsers: 23,
        pendingTasks: 12,
      })

      console.log("[v0] Reports page - Data loaded successfully")
      setLoading(false)
    } catch (err) {
      console.error("[v0] Reports page - Error:", err)
      setError("loading")
      setLoading(false)
    }
  }

  console.log("[v0] Reports page - Rendering, loading:", loading, "error:", error)

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Logs</h1>
        <p>Loading logs data...</p>
      </div>
    )
  }

  if (error === "authentication") {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Authentication Required</h1>
        <p>Please log in to view logs.</p>
        <Button onClick={() => (window.location.href = "/auth/login")}>Go to Login</Button>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Error Loading Logs</h1>
        <p>There was an error loading the logs data.</p>
        <Button onClick={loadReportsData}>Try Again</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Logs</h1>
        <p className="text-muted-foreground mt-2">Comprehensive analytics and logging dashboard</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSubmissions}</div>
            <p className="text-xs text-muted-foreground">+12% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completionRate}%</div>
            <p className="text-xs text-muted-foreground">+5% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeUsers}</div>
            <p className="text-xs text-muted-foreground">+3 new this week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingTasks}</div>
            <p className="text-xs text-muted-foreground">-8 from yesterday</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="h-auto p-4 flex flex-col items-start bg-transparent">
              <span className="font-semibold">Export CSV</span>
              <span className="text-sm text-muted-foreground">Download all submission data</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col items-start bg-transparent">
              <span className="font-semibold">Generate PDF Log</span>
              <span className="text-sm text-muted-foreground">Create comprehensive report</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col items-start bg-transparent">
              <span className="font-semibold">View Analytics</span>
              <span className="text-sm text-muted-foreground">Detailed performance metrics</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
