"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, AlertTriangle, CheckCircle, Clock, Calendar } from "lucide-react"

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

interface Assignment {
  id: string
  status: string
  assigned_at: string
  due_date?: string
  checklist_templates: {
    name: string
    description: string
  }
}

export default function ImpersonatedStaffDashboard() {
  const params = useParams()
  const router = useRouter()
  const userEmail = decodeURIComponent(params.userEmail as string)

  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [assignments, setAssignments] = useState<Assignment[]>([])

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

        // Fetch assignments for this staff member
        const { data: assignmentsData, error: assignmentsError } = await supabase
          .from("template_assignments")
          .select(`
            *,
            checklist_templates (
              name,
              description
            )
          `)
          .eq("assigned_to", userData.id)
          .order("assigned_at", { ascending: false })

        if (!assignmentsError && assignmentsData) {
          setAssignments(assignmentsData)
        }
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

  const pendingAssignments = assignments.filter((a) => a.status === "pending")
  const completedAssignments = assignments.filter((a) => a.status === "completed")

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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Staff Dashboard - {user.organizations.name}</h1>
          <p className="text-gray-600">
            Viewing as: {user.full_name} ({user.email})
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingAssignments.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Tasks</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedAssignments.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Assignments</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{assignments.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Assignments */}
        <div className="space-y-6">
          {pendingAssignments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Pending Assignments</CardTitle>
                <CardDescription>Tasks currently assigned to this staff member</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pendingAssignments.map((assignment) => (
                    <div key={assignment.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h3 className="font-medium">{assignment.checklist_templates.name}</h3>
                        <p className="text-sm text-gray-600">{assignment.checklist_templates.description}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Assigned: {new Date(assignment.assigned_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-orange-600 border-orange-600">
                        Pending
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {completedAssignments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Completed Tasks</CardTitle>
                <CardDescription>Recently completed assignments by this staff member</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {completedAssignments.slice(0, 5).map((assignment) => (
                    <div key={assignment.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h3 className="font-medium">{assignment.checklist_templates.name}</h3>
                        <p className="text-sm text-gray-600">{assignment.checklist_templates.description}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Assigned: {new Date(assignment.assigned_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        Completed
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {assignments.length === 0 && (
            <Card>
              <CardContent className="text-center py-8">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Assignments</h3>
                <p className="text-gray-600">This staff member has no assignments yet.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
