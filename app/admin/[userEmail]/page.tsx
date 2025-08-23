"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { ArrowLeft, AlertTriangle } from "lucide-react"

import AdminDashboard from "../page"

interface User {
  id: string
  email: string
  full_name: string
  role: string
  organization_id: string
}

export default function ImpersonatedAdminDashboard() {
  const params = useParams()
  const router = useRouter()
  const userEmail = decodeURIComponent(params.userEmail as string)

  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const supabase = createClient()

        const { data: userData, error: userError } = await supabase
          .from("profiles")
          .select("*, organizations(*)")
          .eq("email", userEmail)
          .single()

        if (userError || !userData) {
          setError("User not found")
          return
        }

        setUser(userData)

        const mockUser = {
          id: userData.id,
          email: userData.email,
          user_metadata: {
            full_name: userData.full_name,
            first_name: userData.first_name,
            last_name: userData.last_name,
          },
        }

        sessionStorage.setItem("impersonated_user", JSON.stringify(mockUser))
        sessionStorage.setItem("impersonated_profile", JSON.stringify(userData))
        sessionStorage.setItem("is_impersonating", "true")
      } catch (error) {
        console.error("Error fetching user data:", error)
        setError("Failed to load user dashboard")
      } finally {
        setLoading(false)
      }
    }

    if (userEmail) {
      fetchUserData()
    }
  }, [userEmail])

  const exitImpersonation = () => {
    sessionStorage.removeItem("impersonated_user")
    sessionStorage.removeItem("impersonated_profile")
    sessionStorage.removeItem("is_impersonating")

    window.close()
    // If window.close() doesn't work, redirect to master dashboard
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

  if (error || !user) {
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
    <div className="min-h-screen bg-background">
      <div className="bg-orange-500 text-white px-4 py-3 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-medium">
              IMPERSONATING: {user.full_name} ({user.email}) - Admin Dashboard
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

      <div className="p-6">
        <AdminDashboard />
      </div>
    </div>
  )
}
