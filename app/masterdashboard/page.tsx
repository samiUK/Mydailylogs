"use client"

import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Users,
  Building2,
  TrendingUp,
  CheckCircle,
  Key,
  CreditCard,
  RefreshCw,
  Plus,
  Trash2,
  AlertTriangle,
  User,
  LogIn,
  Mail,
  Eye,
  Activity,
  Reply,
  X,
  Search,
  Calendar,
  FileText,
  Shield,
  Edit,
  LogOut,
} from "lucide-react"
import { useEffect, useState } from "react"
import { ReportDirectoryContent } from "./report-directory-content"

interface Organization {
  id: string
  name: string
  logo_url: string | null
  created_at: string
  profiles?: { count: number; role: string }[]
  subscriptions?: { plan_name: string; status: string }[]
}

interface UserProfile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: string
  created_at: string
  organizations?: { name: string; logo_url: string | null }
  last_sign_in_at?: string | null
}

interface Subscription {
  id: string
  plan_name: string
  status: string
  current_period_end: string
  created_at: string
  organizations?: { name: string; logo_url: string | null }
}

interface Payment {
  id: string
  amount: string
  status: string
  created_at: string
  subscriptions?: {
    plan_name: string
    organizations?: { name: string }
  }
}

interface Feedback {
  id: string
  name: string
  email: string
  subject: string
  message: string
  attachments?: any[]
  status: string
  created_at: string
  updated_at?: string
  page_url?: string // Added page_url field
}

interface Superuser {
  id: string
  email: string
  created_at: string
}

export default function MasterDashboardPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [allUsers, setAllUsers] = useState<UserProfile[]>([])
  const [allSubscriptions, setAllSubscriptions] = useState<Subscription[]>([])
  const [allPayments, setAllPayments] = useState<Payment[]>([])
  const [feedback, setFeedback] = useState<Feedback[]>([])
  const [unreadFeedbackCount, setUnreadFeedbackCount] = useState(0)
  const [responseModal, setResponseModal] = useState<{ isOpen: boolean; feedback: Feedback | null }>({
    isOpen: false,
    feedback: null,
  })
  const [responseSubject, setResponseSubject] = useState("")
  const [responseMessage, setResponseMessage] = useState("")
  const [isResponding, setIsResponding] = useState(false)

  const [searchTerm, setSearchTerm] = useState("")
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null)
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null)
  const [newPassword, setNewPassword] = useState("")
  const [refundAmount, setRefundAmount] = useState("")
  const [newSubscriptionPlan, setNewSubscriptionPlan] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [impersonatedUser, setImpersonatedUser] = useState<any>(null)
  const [impersonatedUserData, setImpersonatedUserData] = useState<any>(null)
  const [activeTab, setActiveTab] = useState("overview")
  const [userSearchTerm, setUserSearchTerm] = useState("")
  const [resetPasswordEmail, setResetPasswordEmail] = useState("") // Added state for reset password email
  const [organizationSearchTerm, setOrganizationSearchTerm] = useState("")
  const [organizationStats, setOrganizationStats] = useState({
    total: 0,
    active: 0,
    withSubscriptions: 0,
    totalUsers: 0,
    totalAdmins: 0,
    totalStaff: 0,
  })

  const [totalSubmittedReports, setTotalSubmittedReports] = useState(0)

  // Superuser Management State
  const [superusers, setSuperusers] = useState<Superuser[]>([])
  const [newSuperuserEmail, setNewSuperuserEmail] = useState("")
  const [newSuperuserPassword, setNewSuperuserPassword] = useState("")
  const [editingSuperuser, setEditingSuperuser] = useState<Superuser | null>(null)
  const [userType, setUserType] = useState<string>("Master Admin")

  const [impersonatedOrgBranding, setImpersonatedOrgBranding] = useState<{
    name: string
    logoUrl: string | null
    primaryColor: string
  } | null>(null)

  const loginAsUser = async (userEmail: string, userRole: string) => {
    if (!userEmail.trim()) {
      alert("Please enter a valid email address")
      return
    }

    try {
      console.log("[v0] Starting master admin impersonation for:", userEmail, "Role:", userRole)

      const supabase = createClient()
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select(`
          organization_name,
          organizations!inner(
            name,
            logo_url,
            primary_color
          )
        `)
        .eq("email", userEmail.trim())
        .single()

      if (profileData?.organizations) {
        setImpersonatedOrgBranding({
          name: profileData.organizations.name || profileData.organization_name || "Organization",
          logoUrl: profileData.organizations.logo_url,
          primaryColor: profileData.organizations.primary_color || "#dc2626",
        })
      }

      // Set cookies for middleware to detect impersonation with consistent 24-hour expiry
      document.cookie = `masterAdminImpersonation=true; path=/; max-age=86400; SameSite=Lax`
      document.cookie = `impersonatedUserEmail=${userEmail.trim()}; path=/; max-age=86400; SameSite=Lax`
      document.cookie = `impersonatedUserRole=${userRole}; path=/; max-age=86400; SameSite=Lax`
      document.cookie = `masterAdminEmail=${localStorage.getItem("masterAdminEmail") || "arsami.uk@gmail.com"}; path=/; max-age=86400; SameSite=Lax`
      console.log("[v0] Set impersonation cookies with 24-hour expiry")

      setTimeout(() => {
        const targetUrl = userRole === "admin" ? `/admin` : `/staff`
        console.log("[v0] Redirecting to:", targetUrl)
        console.log("[v0] Current cookies:", document.cookie)
        window.location.href = targetUrl
      }, 500)
    } catch (error) {
      console.error("Error setting up impersonation:", error)
      alert("Failed to login as user")
    }
  }

  const exitImpersonation = () => {
    // Clear local state
    setImpersonatedUser(null)
    setImpersonatedUserData(null)
    setImpersonatedOrgBranding(null) // Clear organization branding
    setActiveTab("overview")

    // Clear all impersonation cookies
    document.cookie = "masterAdminImpersonation=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
    document.cookie = "impersonatedUserEmail=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
    document.cookie = "impersonatedUserRole=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"

    console.log("[v0] Cleared all impersonation cookies")

    // Refresh the page to ensure clean state
    window.location.reload()
  }

  const cancelSubscription = async (subscriptionId: string) => {
    setIsProcessing(true)
    try {
      const supabase = createClient()

      const { error } = await supabase
        .from("subscriptions")
        .update({
          status: "cancelled",
          cancelled_at: new Date().toISOString(),
        })
        .eq("id", subscriptionId)

      if (error) throw error

      // Refresh data
      await checkAuthAndLoadData()
      alert("Subscription cancelled successfully")
      setSelectedSubscription(null)
    } catch (error) {
      console.error("Error cancelling subscription:", error)
      alert("Failed to cancel subscription")
    } finally {
      setIsProcessing(false)
    }
  }

  const addSubscription = async (organizationId: string, planName: string) => {
    setIsProcessing(true)
    try {
      const supabase = createClient()

      const { error } = await supabase.from("subscriptions").insert({
        organization_id: organizationId,
        plan_name: planName,
        status: "active",
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
      })

      if (error) throw error

      // Refresh data
      await checkAuthAndLoadData()
      alert(`${planName} subscription added successfully`)
      setNewSubscriptionPlan("")
    } catch (error) {
      console.error("Error adding subscription:", error)
      alert("Failed to add subscription")
    } finally {
      setIsProcessing(false)
    }
  }

  const processRefund = async (paymentId: string, amount: string) => {
    setIsProcessing(true)
    try {
      const supabase = createClient()

      // Create refund record
      const { error } = await supabase.from("payments").insert({
        amount: `-${amount}`,
        status: "refunded",
        payment_method: "refund",
        created_at: new Date().toISOString(),
      })

      if (error) throw error

      // Update original payment status
      await supabase.from("payments").update({ status: "refunded" }).eq("id", paymentId)

      // Refresh data
      await checkAuthAndLoadData()
      alert(`Refund of £${amount} processed successfully`)
      setRefundAmount("")
    } catch (error) {
      console.error("Error processing refund:", error)
      alert("Failed to process refund")
    } finally {
      setIsProcessing(false)
    }
  }

  const deleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) return

    setIsProcessing(true)
    try {
      const supabase = createClient()

      // Delete user from auth
      const { error: authError } = await supabase.auth.admin.deleteUser(userId)
      if (authError) throw authError

      // Delete user profile
      const { error: profileError } = await supabase.from("profiles").delete().eq("id", userId)

      if (profileError) throw profileError

      // Refresh data
      await checkAuthAndLoadData()
      alert("User deleted successfully")
    } catch (error) {
      console.error("Error deleting user:", error)
      alert("Failed to delete user")
    } finally {
      setIsProcessing(false)
    }
  }

  const checkAuthAndLoadData = async () => {
    const masterAdminCookie =
      document.cookie
        .split("; ")
        .find((row) => row.startsWith("masterAdminImpersonation="))
        ?.split("=")[1] === "true"

    const isAuthenticated = masterAdminCookie || localStorage.getItem("masterAdminAuth")
    const adminEmail =
      document.cookie
        .split("; ")
        .find((row) => row.startsWith("masterAdminEmail="))
        ?.split("=")[1] || localStorage.getItem("masterAdminEmail")

    const isMasterAdmin = adminEmail === "arsami.uk@gmail.com"
    const isSuperuser = !isMasterAdmin && isAuthenticated

    if (!isAuthenticated || (!isMasterAdmin && !isSuperuser)) {
      router.push("/masterlogin")
      return
    }

    setUserType(isMasterAdmin ? "Master Admin" : "Super User")

    const supabase = createClient()

    try {
      console.log("[v0] Fetching organizations and other data...")

      const [
        organizationsResponse,
        profilesResponse,
        subscriptionsResponse,
        paymentsResponse,
        feedbackResponse,
        completedAssignmentsResponse,
        externalSubmissionsResponse,
      ] = await Promise.all([
        (await supabase).from("organizations").select(`
          *,
          profiles!inner(
            id,
            email,
            full_name,
            role,
            created_at
          )
        `),
        (await supabase).from("profiles").select("*").order("created_at", { ascending: false }),
        (await supabase).from("subscriptions").select("*").order("created_at", { ascending: false }),
        (await supabase)
          .from("payments")
          .select(`
          *,
          subscriptions(plan_name)
        `)
          .order("created_at", { ascending: false }),
        (await supabase).from("feedback").select("*").order("created_at", { ascending: false }),
        (await supabase).from("template_assignments").select("*").eq("status", "completed"),
        (await supabase).from("external_submissions").select("*").not("submitted_at", "is", null),
      ])

      console.log("[v0] Organizations response:", organizationsResponse)
      console.log("[v0] Organizations data:", organizationsResponse.data)
      console.log("[v0] Organizations error:", organizationsResponse.error)
      if (organizationsResponse.error) {
        console.error("[v0] Organizations query failed:", organizationsResponse.error.message)
      }

      console.log("[v0] Feedback response:", feedbackResponse)
      console.log("[v0] Feedback data:", feedbackResponse.data)
      console.log("[v0] Feedback error:", feedbackResponse.error)
      console.log("[v0] Number of feedback items found:", feedbackResponse.data?.length || 0)
      if (feedbackResponse.data && feedbackResponse.data.length > 0) {
        console.log("[v0] Sample feedback item:", feedbackResponse.data[0])
      }

      setOrganizations(organizationsResponse.data || [])
      setAllUsers(profilesResponse.data || [])
      setAllSubscriptions(subscriptionsResponse.data || [])
      setAllPayments(paymentsResponse.data || [])
      setFeedback(feedbackResponse.data || [])
      setUnreadFeedbackCount(feedbackResponse.data?.filter((f) => f.status === "unread").length || 0)

      const internalReportsCount = completedAssignmentsResponse.data?.length || 0
      const externalReportsCount = externalSubmissionsResponse.data?.length || 0
      const totalReports = internalReportsCount + externalReportsCount

      console.log("[v0] Internal reports count:", internalReportsCount)
      console.log("[v0] External reports count:", externalReportsCount)
      console.log("[v0] Total submitted reports:", totalReports)

      setTotalSubmittedReports(totalReports)

      // Load superusers
      const { data: superusersData, error: superusersError } = await supabase
        .from("superusers")
        .select("*")
        .order("created_at", { ascending: false })

      if (superusersError) {
        console.error("Error fetching superusers:", superusersError)
      } else {
        setSuperusers(superusersData || [])
      }
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      const supabase = createClient()
      try {
        console.log("[v0] Fetching organizations and other data...")

        const [
          orgsResponse,
          usersResponse,
          subscriptionsResponse,
          paymentsResponse,
          feedbackResponse,
          internalReportsResponse,
          externalReportsResponse,
          superusersResponse,
        ] = await Promise.all([
          supabase.from("organizations").select(`
            *,
            profiles(
              id,
              email,
              full_name,
              role,
              created_at
            )
          `),
          supabase.from("profiles").select("*").order("created_at", { ascending: false }),
          supabase.from("subscriptions").select("*"),
          supabase.from("payments").select("*"),
          supabase.from("feedback").select("*").order("created_at", { ascending: false }),
          supabase.from("template_assignments").select("*").eq("status", "completed"),
          supabase.from("external_submissions").select("*").not("submitted_at", "is", null),
          supabase.from("superusers").select("*").order("created_at", { ascending: false }),
        ])

        console.log("[v0] Organizations response:", orgsResponse)
        console.log("[v0] Organizations data:", orgsResponse.data)
        console.log("[v0] Organizations error:", orgsResponse.error)
        console.log("[v0] Number of organizations found:", orgsResponse.data?.length || 0)

        console.log("[v0] Feedback response:", feedbackResponse)
        console.log("[v0] Feedback data:", feedbackResponse.data)
        console.log("[v0] Feedback error:", feedbackResponse.error)
        console.log("[v0] Number of feedback items found:", feedbackResponse.data?.length || 0)
        console.log("[v0] Sample feedback item:", feedbackResponse.data?.[0]?.message)

        setOrganizations(orgsResponse.data || [])
        setAllUsers(usersResponse.data || [])
        setAllSubscriptions(subscriptionsResponse.data || [])
        setAllPayments(paymentsResponse.data || [])
        setFeedback(feedbackResponse.data || [])
        setUnreadFeedbackCount(feedbackResponse.data?.filter((f) => f.status === "unread").length || 0)

        const internalReportsCount = internalReportsResponse.data?.length || 0
        const externalReportsCount = externalReportsResponse.data?.length || 0
        const totalReports = internalReportsCount + externalReportsCount

        console.log("[v0] Internal reports count:", internalReportsCount)
        console.log("[v0] External reports count:", externalReportsCount)
        console.log("[v0] Total submitted reports:", totalReports)

        setTotalSubmittedReports(totalReports)

        // Load superusers
        setSuperusers(superusersResponse.data || [])
      } catch (error) {
        console.error("Error loading data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleSignOut = async () => {
    document.cookie = "masterAdminImpersonation=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
    document.cookie = "masterAdminEmail=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
    document.cookie = "userType=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
    document.cookie = "masterAdminType=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
    document.cookie = "impersonatedUserEmail=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
    document.cookie = "impersonatedUserRole=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"

    localStorage.removeItem("masterAdminAuth")
    localStorage.removeItem("masterAdminEmail")
    router.push("/masterlogin")
  }

  const testApiRoute = async () => {
    try {
      console.log("[v0] Testing API route connectivity")
      const response = await fetch("/api/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      console.log("[v0] Test API response status:", response.status)
      const data = await response.json()
      console.log("[v0] Test API response data:", data)
      alert("API test result: " + JSON.stringify(data))
    } catch (error) {
      console.error("[v0] Test API error:", error)
      alert("Test API failed: " + error.message)
    }
  }

  const resetUserPassword = async (userEmail: string) => {
    if (!userEmail) {
      alert("Please enter a user email")
      return
    }

    try {
      console.log("[v0] Starting password reset for:", userEmail)

      const baseUrl = window.location.origin
      const apiUrl = `${baseUrl}/api/admin/reset-password`
      console.log("[v0] Making fetch request to:", apiUrl)

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userEmail }),
      })

      console.log("[v0] Fetch response status:", response.status)
      console.log("[v0] Fetch response ok:", response.ok)

      const responseText = await response.text()
      console.log("[v0] Raw response text:", responseText)

      if (!response.ok) {
        console.log("[v0] Error response text:", responseText)
        alert("Failed to reset password. Status: " + response.status)
        return
      }

      let data
      try {
        data = JSON.parse(responseText)
        console.log("[v0] Parsed response data:", data)
      } catch (jsonError) {
        console.error("[v0] JSON parsing error:", jsonError)
        console.log("[v0] Response was not valid JSON:", responseText)
        alert("Server returned invalid response format")
        return
      }

      // Show the temporary password to master admin
      alert(
        `Password reset successful!\n\nUser: ${data.userEmail}\nTemporary Password: ${data.tempPassword}\n\nPlease provide this to the user and ask them to change it immediately.`,
      )
    } catch (error) {
      console.error("[v0] Password reset error:", error)
      alert("Failed to reset password: " + error.message)
    }
  }

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`Delete user ${userEmail}? This action cannot be undone.`)) return

    try {
      const response = await fetch("/api/admin/delete-user", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      })

      const data = await response.json()

      if (!response.ok) {
        alert("Failed to delete user: " + data.error)
        return
      }

      // Refresh data
      await checkAuthAndLoadData()
      alert("User deleted successfully")
    } catch (error) {
      console.error("Error deleting user:", error)
      alert("Failed to delete user")
    }
  }

  const markFeedbackAsRead = async (feedbackId: string) => {
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from("feedback")
        .update({ status: "read", updated_at: new Date().toISOString() })
        .eq("id", feedbackId)

      if (error) throw error

      setFeedback((prev) => prev.map((f) => (f.id === feedbackId ? { ...f, status: "read" } : f)))
      setUnreadFeedbackCount((prev) => Math.max(0, prev - 1))
    } catch (error) {
      console.error("Error marking feedback as read:", error)
    }
  }

  const deleteFeedback = async (feedbackId: string) => {
    try {
      const supabase = createClient()
      const { error } = await supabase.from("feedback").delete().eq("id", feedbackId)

      if (error) throw error

      const deletedFeedback = feedback.find((f) => f.id === feedbackId)
      setFeedback((prev) => prev.filter((f) => f.id !== feedbackId))
      if (deletedFeedback?.status === "unread") {
        setUnreadFeedbackCount((prev) => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error("Error deleting feedback:", error)
    }
  }

  const openResponseModal = (feedbackItem: Feedback) => {
    setResponseModal({ isOpen: true, feedback: feedbackItem })
    setResponseSubject(`Re: ${feedbackItem.subject}`)
    setResponseMessage(`Hi ${feedbackItem.name},\n\nThank you for your feedback. `)
  }

  const closeResponseModal = () => {
    setResponseModal({ isOpen: false, feedback: null })
    setResponseSubject("")
    setResponseMessage("")
    setIsResponding(false)
  }

  const sendResponse = async () => {
    if (!responseModal.feedback) return

    setIsResponding(true)
    try {
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "response",
          to: responseModal.feedback.email,
          subject: responseSubject,
          data: {
            name: responseModal.feedback.name,
            originalSubject: responseModal.feedback.subject,
            originalMessage: responseModal.feedback.message,
            responseMessage: responseMessage,
          },
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to send response")
      }

      // Mark feedback as read after responding
      await markFeedbackAsRead(responseModal.feedback.id)
      closeResponseModal()
      alert("Response sent successfully!")
    } catch (error) {
      console.error("Error sending response:", error)
      alert("Failed to send response. Please try again.")
    } finally {
      setIsResponding(false)
    }
  }

  const filteredUsers = allUsers.filter(
    (user) =>
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.organizations?.name.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const filteredOrganizations = organizations.filter((org) =>
    org.name.toLowerCase().includes(organizationSearchTerm.toLowerCase()),
  )

  const filteredUsersNew = allUsers.filter(
    (user) =>
      user.email.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      user.organizations?.name.toLowerCase().includes(userSearchTerm.toLowerCase()),
  )

  useEffect(() => {
    const stats = {
      total: organizations.length,
      active: organizations.filter((org) => org.subscriptions?.some((sub) => sub.status === "active")).length,
      withSubscriptions: organizations.filter((org) => org.subscriptions && org.subscriptions.length > 0).length,
      totalUsers: organizations.reduce((sum, org) => sum + (org.profiles?.[0]?.count || 0), 0),
      totalAdmins: organizations.reduce(
        (sum, org) => sum + (org.profiles?.filter((p) => p.role === "admin").length || 0),
        0,
      ),
      totalStaff: organizations.reduce(
        (sum, org) => sum + (org.profiles?.filter((p) => p.role === "staff").length || 0),
        0,
      ),
    }
    setOrganizationStats(stats)
  }, [organizations])

  // Superuser Management Functions
  const addSuperuser = async () => {
    if (!newSuperuserEmail || !newSuperuserPassword) {
      alert("Please enter both email and password")
      return
    }

    try {
      const response = await fetch("/api/admin/add-superuser", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: newSuperuserEmail, password: newSuperuserPassword }),
      })

      const data = await response.json()

      if (!response.ok) {
        alert("Failed to add superuser: " + data.error)
        return
      }

      // Refresh superusers list
      await checkAuthAndLoadData()
      setNewSuperuserEmail("")
      setNewSuperuserPassword("")
      alert("Superuser added successfully")
    } catch (error) {
      console.error("Error adding superuser:", error)
      alert("Failed to add superuser")
    }
  }

  const removeSuperuser = async (superuserId: string) => {
    if (!confirm("Are you sure you want to remove this superuser?")) return

    try {
      const response = await fetch("/api/admin/remove-superuser", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ superuserId }),
      })

      const data = await response.json()

      if (!response.ok) {
        alert("Failed to remove superuser: " + data.error)
        return
      }

      // Refresh superusers list
      await checkAuthAndLoadData()
      alert("Superuser removed successfully")
    } catch (error) {
      console.error("Error removing superuser:", error)
      alert("Failed to remove superuser")
    }
  }

  const updateSuperuser = async () => {
    if (!editingSuperuser) return
    if (!newSuperuserPassword) {
      alert("Please enter a new password")
      return
    }

    try {
      const response = await fetch("/api/admin/update-superuser", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ superuserId: editingSuperuser.id, newPassword: newSuperuserPassword }),
      })

      const data = await response.json()

      if (!response.ok) {
        alert("Failed to update superuser: " + data.error)
        return
      }

      // Refresh superusers list
      await checkAuthAndLoadData()
      setEditingSuperuser(null)
      setNewSuperuserPassword("")
      alert("Superuser updated successfully")
    } catch (error) {
      console.error("Error updating superuser:", error)
      alert("Failed to update superuser")
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {impersonatedOrgBranding ? (
              <>
                {impersonatedOrgBranding.logoUrl ? (
                  <div className="w-8 h-8 rounded-lg overflow-hidden bg-white flex items-center justify-center shadow-sm">
                    <img
                      src={impersonatedOrgBranding.logoUrl || "/placeholder.svg"}
                      alt="Organization Logo"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                ) : (
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: impersonatedOrgBranding.primaryColor }}
                  >
                    <Users className="w-5 h-5 text-white" />
                  </div>
                )}
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">{impersonatedOrgBranding.name}</h1>
                  <p className="text-sm text-gray-500">Impersonating organization view</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">System Dashboard</h1>
                  <p className="text-sm text-gray-500">Master admin control panel</p>
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="destructive">Master Admin</Badge>
            <Button variant="outline" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="p-6 space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="organizations">Organizations</TabsTrigger>
            <TabsTrigger value="feedback" className="relative">
              Feedback
              {unreadFeedbackCount > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 text-xs">
                  {unreadFeedbackCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="reports">Report Directory</TabsTrigger>
            {userType === "Master Admin" && (
              <TabsTrigger
                value="login-as"
                className="text-red-600 border-red-200 data-[state=active]:bg-red-50 data-[state=active]:text-red-700"
              >
                Superuser Tools
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{allUsers.length}</div>
                  <p className="text-xs text-muted-foreground">Across all organizations</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Currently Online</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {
                      allUsers.filter((user) => {
                        const lastSeen = new Date(user.last_sign_in_at || user.created_at)
                        const now = new Date()
                        const diffMinutes = (now.getTime() - lastSeen.getTime()) / (1000 * 60)
                        return diffMinutes <= 30 // Consider online if active within 30 minutes
                      }).length
                    }
                  </div>
                  <p className="text-xs text-muted-foreground">Active in last 30 min</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Organizations</CardTitle>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{organizations.length}</div>
                  <p className="text-xs text-muted-foreground">All organizations</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Submitted Reports</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalSubmittedReports}</div>
                  <p className="text-xs text-muted-foreground">Team members + External users</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Active Subscriptions</CardTitle>
                  <CardDescription>Currently active</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {allSubscriptions.filter((sub) => sub.status === "active").length}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Total Revenue</CardTitle>
                  <CardDescription>Completed payments</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    £
                    {allPayments
                      .filter((payment) => payment.status === "completed")
                      .reduce((sum, payment) => sum + Number.parseFloat(payment.amount), 0)
                      .toFixed(2)}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recent Users</CardTitle>
                <CardDescription>Latest user registrations across all organizations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {allUsers.slice(0, 10).map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {user.avatar_url ? (
                          <img
                            src={user.avatar_url || "/placeholder.svg"}
                            alt={user.full_name || user.email}
                            className="w-8 h-8 rounded-full"
                          />
                        ) : (
                          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                            <Users className="w-4 h-4 text-gray-500" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{user.full_name || user.email}</p>
                          <p className="text-sm text-gray-500">
                            {user.email} • {user.role}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{user.organizations?.name}</p>
                        <p className="text-xs text-gray-500">{new Date(user.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Active Subscriptions</CardTitle>
                  <CardDescription>Current subscription status</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {allSubscriptions
                      .filter((sub) => sub.status === "active")
                      .slice(0, 5)
                      .map((subscription) => (
                        <div key={subscription.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{subscription.organizations?.name}</p>
                            <p className="text-sm text-gray-500">
                              {subscription.plan_name} • Expires{" "}
                              {new Date(subscription.current_period_end).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge variant="default">{subscription.status}</Badge>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Payments</CardTitle>
                  <CardDescription>Latest payment transactions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {allPayments.slice(0, 5).map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{payment.subscriptions?.organizations?.name}</p>
                          <p className="text-sm text-gray-500">
                            {payment.subscriptions?.plan_name} • {new Date(payment.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">£{Number.parseFloat(payment.amount).toFixed(2)}</p>
                          <Badge variant={payment.status === "completed" ? "default" : "secondary"}>
                            {payment.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex-1"></div>
                <div className="flex-shrink-0">
                  <Input
                    placeholder="Search users..."
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    className="w-full sm:w-64"
                  />
                </div>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>All Users ({filteredUsersNew.length})</CardTitle>
                  <CardDescription>Complete list of all registered users</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {filteredUsersNew.map((user) => (
                      <div
                        key={user.id}
                        className="flex flex-col lg:flex-row lg:items-center lg:justify-between p-4 border rounded-lg gap-4"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <User className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-medium truncate">{user.full_name || user.email}</h3>
                            <p className="text-sm text-gray-500 truncate">{user.email}</p>
                            <p className="text-xs text-gray-400 truncate">
                              {user.role} • {user.organizations?.name || "No Organization"}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => loginAsUser(user.email, user.role)}
                            className="text-blue-600 border-blue-200 hover:bg-blue-50 text-xs px-2 py-1"
                          >
                            <LogIn className="w-3 h-3 mr-1" />
                            Login
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => resetUserPassword(user.email)}
                            className="text-orange-600 border-orange-200 hover:bg-orange-50 text-xs px-2 py-1"
                          >
                            <Key className="w-3 h-3 mr-1" />
                            Reset
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteUser(user.id, user.email)}
                            className="text-red-600 border-red-200 hover:bg-red-50 text-xs px-2 py-1"
                            disabled={isProcessing}
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="organizations" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Organizations</p>
                      <p className="text-2xl font-bold">{organizationStats.total}</p>
                    </div>
                    <Building2 className="w-8 h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Admins</p>
                      <p className="text-2xl font-bold">{organizationStats.totalAdmins || 0}</p>
                    </div>
                    <Shield className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Staff</p>
                      <p className="text-2xl font-bold">{organizationStats.totalStaff || 0}</p>
                    </div>
                    <Users className="w-8 h-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Organization Hierarchy</CardTitle>
                    <CardDescription>View all organizations with their admin and staff members</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="Search organizations..."
                        value={organizationSearchTerm}
                        onChange={(e) => setOrganizationSearchTerm(e.target.value)}
                        className="pl-10 w-64"
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {filteredOrganizations.length === 0 ? (
                    <div className="text-center py-12">
                      <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Organizations Found</h3>
                      <p className="text-gray-500 mb-4">
                        Organizations will appear here once users sign up and create profiles.
                      </p>
                      {organizationSearchTerm && (
                        <p className="text-sm text-gray-400">Try adjusting your search terms</p>
                      )}
                    </div>
                  ) : (
                    filteredOrganizations.map((org) => (
                      <div
                        key={org.id}
                        className="border rounded-xl p-6 bg-white shadow-sm hover:shadow-md transition-all"
                      >
                        {/* Organization Header */}
                        <div className="flex items-start justify-between mb-6">
                          <div className="flex items-center gap-4">
                            {org.logo_url ? (
                              <img
                                src={org.logo_url || "/placeholder.svg"}
                                alt={org.name}
                                className="w-16 h-16 rounded-xl object-cover border-2 border-gray-100"
                              />
                            ) : (
                              <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center border-2 border-gray-100">
                                <Building2 className="w-8 h-8 text-blue-600" />
                              </div>
                            )}
                            <div className="space-y-2">
                              <h3 className="text-xl font-bold text-gray-900">{org.name}</h3>
                              <div className="flex items-center gap-4 text-sm text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  Created {new Date(org.created_at).toLocaleDateString()}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Building2 className="w-4 h-4" />
                                  ID: {org.id.slice(0, 8)}...
                                </span>
                              </div>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-sm px-3 py-1">
                            Active Organization
                          </Badge>
                        </div>

                        {/* Organization Members Hierarchy */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Admins Section */}
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                              <Shield className="w-5 h-5 text-green-600" />
                              <h4 className="font-semibold text-gray-900">Administrators</h4>
                              <Badge variant="secondary" className="text-xs">
                                {org.profiles?.filter((p) => p.role === "admin").length || 0}
                              </Badge>
                            </div>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {org.profiles?.filter((p) => p.role === "admin").length > 0 ? (
                                org.profiles
                                  .filter((p) => p.role === "admin")
                                  .map((admin) => (
                                    <div
                                      key={admin.id}
                                      className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-100"
                                    >
                                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                        <Shield className="w-4 h-4 text-green-600" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-900 truncate">{admin.full_name}</p>
                                        <p className="text-sm text-gray-500 truncate">{admin.email}</p>
                                      </div>
                                    </div>
                                  ))
                              ) : (
                                <div className="text-center py-4 text-gray-500">
                                  <Shield className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                  <p className="text-sm">No administrators</p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Staff Section */}
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                              <Users className="w-5 h-5 text-blue-600" />
                              <h4 className="font-semibold text-gray-900">Staff Members</h4>
                              <Badge variant="secondary" className="text-xs">
                                {org.profiles?.filter((p) => p.role === "staff").length || 0}
                              </Badge>
                            </div>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {org.profiles?.filter((p) => p.role === "staff").length > 0 ? (
                                org.profiles
                                  .filter((p) => p.role === "staff")
                                  .map((staff) => (
                                    <div
                                      key={staff.id}
                                      className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100"
                                    >
                                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                        <Users className="w-4 h-4 text-blue-600" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-900 truncate">{staff.full_name}</p>
                                        <p className="text-sm text-gray-500 truncate">{staff.email}</p>
                                      </div>
                                    </div>
                                  ))
                              ) : (
                                <div className="text-center py-4 text-gray-500">
                                  <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                  <p className="text-sm">No staff members</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Organization Summary */}
                        <div className="mt-6 pt-4 border-t border-gray-100">
                          <div className="flex items-center justify-between text-sm text-gray-600">
                            <span>Total Members: {org.profiles?.length || 0}</span>
                            <span>
                              Admins: {org.profiles?.filter((p) => p.role === "admin").length || 0} | Staff:{" "}
                              {org.profiles?.filter((p) => p.role === "staff").length || 0}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subscriptions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Subscription Management</CardTitle>
                <CardDescription>Manage all active and inactive subscriptions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {allSubscriptions.map((subscription) => (
                    <div key={subscription.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{subscription.organizations?.name}</p>
                        <p className="text-sm text-gray-500">
                          {subscription.plan_name} • Started {new Date(subscription.created_at).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-gray-500">
                          Expires {new Date(subscription.current_period_end).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={subscription.status === "active" ? "default" : "secondary"}>
                          {subscription.status}
                        </Badge>
                        {subscription.status === "active" && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => cancelSubscription(subscription.id)}
                            disabled={isProcessing}
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Cancel
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Payment Management</CardTitle>
                <CardDescription>View and manage all payment transactions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {allPayments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{payment.subscriptions?.organizations?.name}</p>
                        <p className="text-sm text-gray-500">
                          {payment.subscriptions?.plan_name} • {new Date(payment.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="font-medium">£{Number.parseFloat(payment.amount).toFixed(2)}</p>
                          <Badge variant={payment.status === "completed" ? "default" : "secondary"}>
                            {payment.status}
                          </Badge>
                        </div>
                        {payment.status === "completed" && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <RefreshCw className="w-4 h-4 mr-1" />
                                Refund
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Process Refund</DialogTitle>
                                <DialogDescription>Process a refund for this payment</DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="refundAmount">Refund Amount (£)</Label>
                                  <Input
                                    id="refundAmount"
                                    type="number"
                                    step="0.01"
                                    value={refundAmount}
                                    onChange={(e) => setRefundAmount(e.target.value)}
                                    placeholder="Enter refund amount"
                                    max={payment.amount}
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button
                                  onClick={() => processRefund(payment.id, refundAmount)}
                                  disabled={!refundAmount || isProcessing}
                                  variant="destructive"
                                >
                                  {isProcessing ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null}
                                  Process Refund
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="feedback" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  Feedback Mailbox
                  {unreadFeedbackCount > 0 && <Badge variant="destructive">{unreadFeedbackCount} unread</Badge>}
                </CardTitle>
                <CardDescription>Monitor and manage user feedback and suggestions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {feedback.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No feedback received yet</p>
                    </div>
                  ) : (
                    feedback.map((item) => (
                      <div
                        key={item.id}
                        className={`p-4 border rounded-lg ${
                          item.status === "unread" ? "bg-blue-50 border-blue-200" : "bg-white"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant={item.status === "unread" ? "default" : "secondary"}>{item.status}</Badge>
                              <span className="text-sm text-gray-500">
                                {new Date(item.created_at).toLocaleDateString()} at{" "}
                                {new Date(item.created_at).toLocaleTimeString()}
                              </span>
                            </div>
                            <h3 className="font-medium text-lg mb-1">{item.subject}</h3>
                            <p className="text-sm text-gray-600 mb-2">
                              From: <strong>{item.name}</strong> ({item.email})
                            </p>
                            {item.page_url && (
                              <p className="text-sm text-gray-500 mb-2">
                                Page:{" "}
                                <a
                                  href={item.page_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline"
                                >
                                  {item.page_url}
                                </a>
                              </p>
                            )}
                            <p className="text-gray-800 whitespace-pre-wrap">{item.message}</p>
                            {item.attachments && item.attachments.length > 0 && (
                              <div className="mt-2">
                                <p className="text-sm font-medium text-gray-600 mb-1">Attachments:</p>
                                <div className="flex flex-wrap gap-2">
                                  {item.attachments.map((attachment: any, index: number) => (
                                    <Badge key={index} variant="outline" className="text-xs">
                                      📎 {attachment.name}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <Button variant="outline" size="sm" onClick={() => openResponseModal(item)}>
                              <Reply className="w-4 h-4 mr-1" />
                              Reply
                            </Button>
                            {item.status === "unread" && (
                              <Button variant="outline" size="sm" onClick={() => markFeedbackAsRead(item.id)}>
                                <Eye className="w-4 h-4 mr-1" />
                                Mark Read
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteFeedback(item.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {responseModal.isOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold">Reply to Feedback</h2>
                  <Button variant="ghost" size="sm" onClick={closeResponseModal}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">To:</label>
                    <p className="text-sm text-gray-600">{responseModal.feedback?.email}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Subject:</label>
                    <input
                      type="text"
                      value={responseSubject}
                      onChange={(e) => setResponseSubject(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Original Message:</label>
                    <div className="p-3 bg-gray-50 rounded-md text-sm">
                      <p className="font-medium">{responseModal.feedback?.subject}</p>
                      <p className="mt-1">{responseModal.feedback?.message}</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Your Response:</label>
                    <textarea
                      value={responseMessage}
                      onChange={(e) => setResponseMessage(e.target.value)}
                      rows={6}
                      className="w-full p-2 border border-gray-300 rounded-md"
                      placeholder="Type your response here..."
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={closeResponseModal}>
                      Cancel
                    </Button>
                    <Button onClick={sendResponse} disabled={isResponding || !responseMessage.trim()}>
                      {isResponding ? "Sending..." : "Send Response"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {userType === "Master Admin" && (
            <TabsContent value="login-as" className="space-y-6">
              <div className="space-y-6">
                <Tabs defaultValue="password-reset" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="password-reset">Password Reset</TabsTrigger>
                    <TabsTrigger value="add-superusers">Add Superusers</TabsTrigger>
                  </TabsList>

                  <TabsContent value="password-reset" className="mt-6">
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <AlertTriangle className="w-6 h-6 text-orange-600" />
                        <h2 className="text-xl font-semibold text-orange-800">Password Reset Tool</h2>
                      </div>
                      <p className="text-orange-700 mb-4">
                        For security and data protection compliance, we've replaced the "Login As" feature with a secure
                        password reset tool. This approach maintains GDPR/CCPA compliance while allowing you to help
                        users access their accounts.
                      </p>

                      <div className="space-y-4">
                        <div className="flex gap-2">
                          <Input
                            type="email"
                            placeholder="Enter user email to reset password"
                            value={resetPasswordEmail}
                            onChange={(e) => setResetPasswordEmail(e.target.value)}
                            className="flex-1"
                          />
                          <Button onClick={() => resetUserPassword(resetPasswordEmail)} variant="destructive">
                            Reset Password
                          </Button>
                        </div>
                        <Button onClick={testApiRoute} variant="outline" className="w-full bg-transparent">
                          Test API Connection
                        </Button>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="add-superusers" className="mt-6">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <Shield className="w-6 h-6 text-blue-600" />
                        <h2 className="text-xl font-semibold text-blue-800">Superuser Management</h2>
                      </div>
                      <p className="text-blue-700 mb-6">
                        Manage CS agents and superusers who can access the Master Admin Dashboard. These users will have
                        full administrative privileges.
                      </p>

                      {/* Add New Superuser Form */}
                      <div className="space-y-4 mb-8">
                        <h3 className="text-lg font-medium text-blue-800">Add New Superuser</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Input
                            type="email"
                            placeholder="Superuser email"
                            value={newSuperuserEmail}
                            onChange={(e) => setNewSuperuserEmail(e.target.value)}
                          />
                          <Input
                            type="password"
                            placeholder="Superuser password"
                            value={newSuperuserPassword}
                            onChange={(e) => setNewSuperuserPassword(e.target.value)}
                          />
                        </div>
                        <Button onClick={addSuperuser} className="w-full md:w-auto">
                          <Plus className="w-4 h-4 mr-2" />
                          Add Superuser
                        </Button>
                      </div>

                      {/* Existing Superusers List */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium text-blue-800">Existing Superusers</h3>
                        <div className="space-y-3">
                          {superusers.map((superuser) => (
                            <div
                              key={superuser.id}
                              className="flex items-center justify-between p-4 bg-white rounded-lg border"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                  <User className="w-4 h-4 text-blue-600" />
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">{superuser.email}</p>
                                  <p className="text-sm text-gray-500">
                                    Added {new Date(superuser.created_at).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setEditingSuperuser(superuser)
                                    setNewSuperuserPassword("")
                                  }}
                                >
                                  <Edit className="w-4 h-4 mr-1" />
                                  Edit
                                </Button>
                                <Button variant="destructive" size="sm" onClick={() => removeSuperuser(superuser.id)}>
                                  <Trash2 className="w-4 h-4 mr-1" />
                                  Remove
                                </Button>
                              </div>
                            </div>
                          ))}
                          {superusers.length === 0 && (
                            <div className="text-center p-8 text-gray-500">
                              <Shield className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                              <p>No superusers added yet</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Edit Superuser Modal */}
                      {editingSuperuser && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                          <div className="bg-white rounded-lg p-6 w-full max-w-md">
                            <h3 className="text-lg font-medium mb-4">Edit Superuser</h3>
                            <div className="space-y-4">
                              <Input type="email" value={editingSuperuser.email} disabled className="bg-gray-50" />
                              <Input
                                type="password"
                                placeholder="New password (leave blank to keep current)"
                                value={newSuperuserPassword}
                                onChange={(e) => setNewSuperuserPassword(e.target.value)}
                              />
                            </div>
                            <div className="flex gap-2 mt-6">
                              <Button onClick={updateSuperuser} className="flex-1">
                                Update
                              </Button>
                              <Button variant="outline" onClick={() => setEditingSuperuser(null)} className="flex-1">
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </TabsContent>
          )}

          <TabsContent value="tools" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Tools</CardTitle>
                <CardDescription>Additional tools for platform management</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Button variant="outline" className="h-20 flex flex-col gap-2 bg-transparent">
                    <Users className="w-6 h-6" />
                    <span>Bulk User Operations</span>
                  </Button>
                  <Button variant="outline" className="h-20 flex flex-col gap-2 bg-transparent">
                    <CreditCard className="w-6 h-6" />
                    <span>Payment Analytics</span>
                  </Button>
                  <Button variant="outline" className="h-20 flex flex-col gap-2 bg-transparent">
                    <Building2 className="w-6 h-6" />
                    <span>Organization Reports</span>
                  </Button>
                  <Button variant="outline" className="h-20 flex flex-col gap-2 bg-transparent">
                    <TrendingUp className="w-6 h-6" />
                    <span>Revenue Analytics</span>
                  </Button>
                  <Button variant="outline" className="h-20 flex flex-col gap-2 bg-transparent">
                    <CheckCircle className="w-6 h-6" />
                    <span>System Health</span>
                  </Button>
                  <Button variant="outline" className="h-20 flex flex-col gap-2 bg-transparent">
                    <RefreshCw className="w-6 h-6" />
                    <span>Data Backup</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="reports" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Report Directory</CardTitle>
                <CardDescription>
                  Manage deleted reports - view, restore, or permanently delete reports within 30 days
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ReportDirectoryContent />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <footer className="bg-white border-t border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">© {new Date().getFullYear()} MyDayLogs. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Signed in as {userType}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                handleSignOut()
              }}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </footer>
    </div>
  )
}
