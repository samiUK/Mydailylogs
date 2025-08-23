"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, AlertTriangle, Users, CheckCircle, Clock, FileText } from "lucide-react"

interface Organization {
  id: string
  name: string
  logo_url?: string
  primary_color?: string
}

interface User {
  id: string
  email: string
  full_name: string
  role: string
  organization_id: string
  organizations: Organization
}

export default function ImpersonatedAdminDashboard() {
  const params = useParams()
  const router = useRouter()
  const userEmail = decodeURIComponent(params.userEmail as string)

  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalTemplates: 0,
    activeAssignments: 0,
    completedToday: 0,
    teamMembers: 0,
  })

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const supabase = createClient()

        // Fetch user data
        const { data: userData, error: userError } = await supabase
          .from("profiles")
          .select("*, organizations(*)")
          .eq("email", userEmail)
          .single()

        if (userError || !userData) {
          alert("User not found")
          return
        }

        setUser(userData)

        // Fetch dashboard stats for this organization
        const [templatesRes, assignmentsRes, completedRes, teamRes] = await Promise.all([
          supabase.from("checklist_templates").select("id").eq("organization_id", userData.organization_id),
          supabase
            .from("template_assignments")
            .select("id")
            .eq("organization_id", userData.organization_id)
            .eq("status", "pending"),
          supabase
            .from("template_assignments")
            .select("id")
            .eq("organization_id", userData.organization_id)
            .eq("status", "completed")
            .gte("completed_at", new Date().toISOString().split("T")[0]),
          supabase.from("profiles").select("id").eq("organization_id", userData.organization_id),
        ])

        setStats({
          totalTemplates: templatesRes.data?.length || 0,
          activeAssignments: assignmentsRes.data?.length || 0,
          completedToday: completedRes.data?.length || 0,
          teamMembers: teamRes.data?.length || 0,
        })
      } catch (error) {
        console.error("Error fetching user data:", error)
        alert("Failed to load user dashboard")
      } finally {
        setLoading(false)
      }
    }

    if (userEmail) {
      fetchUserData()
    }
  }, [userEmail])

  const exitImpersonation = () => {
    window.close()
    // If window.close() doesn't work (some browsers block it), redirect to master dashboard
    setTimeout(() => {
      window.location.href = "/masterdashboard"
    }, 100)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p>Loading user dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold mb-2">User Not Found</h1>
          <p className="text-gray-600 mb-4">The user {userEmail} could not be found.</p>
          <Button onClick={exitImpersonation}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Master Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Impersonation Banner */}
      <div className="bg-orange-500 text-white px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-medium">
              IMPERSONATING: {user.full_name} ({user.email}) - {user.organizations.name}
            </span>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={exitImpersonation}
            className="bg-white text-orange-600 hover:bg-gray-100"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Exit Impersonation
          </Button>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{user.organizations.name} - Admin Dashboard</h1>
          <p className="text-gray-600">
            Viewing as: {user.full_name} ({user.email})
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Templates</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTemplates}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Assignments</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeAssignments}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completedToday}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Team Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.teamMembers}</div>
            </CardContent>
          </Card>
        </div>

        {/* Organization Info */}
        <Card>
          <CardHeader>
            <CardTitle>Organization Details</CardTitle>
            <CardDescription>Information about this organization as seen by the admin user</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              {user.organizations.logo_url && (
                <img
                  src={user.organizations.logo_url || "/placeholder.svg"}
                  alt="Organization Logo"
                  className="w-12 h-12 rounded-lg object-cover"
                />
              )}
              <div>
                <h3 className="font-semibold text-lg">{user.organizations.name}</h3>
                <p className="text-gray-600">Organization ID: {user.organizations.id}</p>
              </div>
            </div>

            {user.organizations.primary_color && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Brand Color:</span>
                <div
                  className="w-6 h-6 rounded border"
                  style={{ backgroundColor: user.organizations.primary_color }}
                ></div>
                <span className="text-sm text-gray-600">{user.organizations.primary_color}</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Admin User:</span>
              <Badge variant="secondary">{user.role}</Badge>
              <span className="text-sm text-gray-600">{user.full_name}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
