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
  CheckCircle,
  Key,
  CreditCard,
  RefreshCw,
  Trash2,
  AlertTriangle,
  User,
  LogIn,
  X,
  Search,
  Calendar,
  Shield,
  DollarSign,
  Edit2,
  Archive,
  ArrowDown,
  ArrowUp,
  AlertCircle,
  Info,
  Activity,
} from "lucide-react"
import { useEffect, useState } from "react"
import { ReportDirectoryContent } from "./report-directory-content"
import { toast } from "sonner" // Import toast

interface Organization {
  organization_id: string
  organization_name: string
  logo_url: string | null
  primary_color: string | null
  created_at: string
  profiles?: { count: number; role: string }[]
  subscriptions?: { plan_name: string; status: string }[]
  updated_at?: string
  templateCount?: number
  slug?: string | null // Added slug field
}

interface UserProfile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: string
  created_at: string
  organizations?: { name: string; logo_url: string | null; slug: string } // Added slug
  last_sign_in_at?: string | null
  organization_id?: string
  organization_name?: string
  updated_at?: string
}

interface Subscription {
  id: string
  plan_name: string
  status: string
  current_period_end: string
  created_at: string
  organizations?: { name: string; logo_url: string | null; slug: string } // Added slug
  organization_id?: string // Added to link subscription to organization
}

interface Payment {
  id: string
  amount: string
  status: string
  created_at: string
  subscriptions?: {
    plan_name: string
    organizations?: { name: string; slug: string } // Added slug
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
  is_active?: boolean // Added is_active field
  role?: "masteradmin" | "support"
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
  const [currentUserRole, setCurrentUserRole] = useState<"masteradmin" | "support">("support")

  const [impersonatedOrgBranding, setImpersonatedOrgBranding] = useState<{
    name: string
    logoUrl: string | null
    primaryColor: string
  } | null>(null)

  const [databaseStats, setDatabaseStats] = useState({
    checklists: { total: 0, completed: 0, pending: 0 },
    templates: { total: 0, active: 0, inactive: 0 },
    notifications: { total: 0, unread: 0 },
    holidays: { total: 0, upcoming: 0 },
    staffUnavailability: { total: 0, current: 0 },
    auditLogs: { total: 0, today: 0 },
    backups: { total: 0, thisWeek: 0 },
  })

  // New state and modal control for impersonation link
  const [showImpersonationModal, setShowImpersonationModal] = useState(false)
  const [impersonationUrl, setImpersonationUrl] = useState("")

  const [activityLogs, setActivityLogs] = useState<any[]>([])
  const [activityLogsLoading, setActivityLogsLoading] = useState(false)

  const getCookie = (name: string) => {
    const value = `; ${document.cookie}`
    const parts = value.split(`; ${name}=`)
    if (parts.length === 2) return parts.pop()?.split(";").shift()
  }

  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [admins, setAdmins] = useState<any[]>([])
  const [staff, setStaff] = useState<any[]>([])

  const [editingOrg, setEditingOrg] = useState<{ id: string; name: string } | null>(null)
  const [editOrgName, setEditOrgName] = useState("")

  const [notification, setNotification] = useState<{
    type: "success" | "error" | "warning" | "info"
    message: string
    show: boolean
  }>({
    type: "info",
    message: "",
    show: false,
  })

  const [confirmDialog, setConfirmDialog] = useState<{
    show: boolean
    title: string
    message: string
    onConfirm: () => void
    onCancel: () => void
    type: "warning" | "danger"
  }>({
    show: false,
    title: "",
    message: "",
    onConfirm: () => {},
    onCancel: () => {},
    type: "warning",
  })

  const showConfirmDialog = (
    title: string,
    message: string,
    onConfirm: () => void,
    type: "warning" | "danger" = "warning",
  ) => {
    setConfirmDialog({
      show: true,
      title,
      message,
      onConfirm,
      onCancel: () => setConfirmDialog((prev) => ({ ...prev, show: false })),
      type,
    })
  }

  const showNotification = (type: "success" | "error" | "warning" | "info", message: string) => {
    setNotification({ type, message, show: true })
    setTimeout(() => {
      setNotification((prev) => ({ ...prev, show: false }))
    }, 5000)
  }

  // Function to fetch all payments (to be called after refund)
  const loadAllPayments = async () => {
    try {
      const { data, error } = await createClient().from("payments").select(`*, subscriptions(*, organizations(*))`)
      if (error) throw error
      setAllPayments(data || [])
    } catch (error) {
      console.error("Error fetching payments:", error)
      toast.error("Failed to load payment data")
    }
  }

  const syncData = async () => {
    setIsProcessing(true)
    try {
      console.log("[v0] Starting comprehensive sync...")

      const response = await fetch("/api/admin/comprehensive-sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      console.log("[v0] Sync response status:", response.status)

      if (!response.ok) {
        const errorData = await response.json()
        console.log("[v0] Sync error response:", errorData)
        throw new Error(errorData.error || "Sync failed")
      }

      const result = await response.json()
      console.log("[v0] Comprehensive sync result:", result.message)

      if (result.totalActions > 0) {
        showNotification(
          "success",
          `Comprehensive sync completed successfully! ${result.totalActions} actions performed across all data structures.`,
        )
      }

      console.log("[v0] Refreshing all UI data after comprehensive sync...")
      setIsLoading(true)

      // Clear current state
      setOrganizations([])
      setAllUsers([])

      // Reload all data with fresh queries
      await checkAuthAndLoadData()
    } catch (error) {
      console.error("[v0] Sync error:", error)
      showNotification("error", `Sync failed: ${error.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const archiveOrganization = async (orgId: string, orgName: string) => {
    showConfirmDialog(
      "Archive Organization",
      `Are you sure you want to archive "${orgName}"? This will hide the organization and all its users from active lists.`,
      async () => {
        try {
          console.log("[v0] Attempting to archive organization:", orgId)
          const response = await fetch("/api/admin/archive-organization", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ organization_id: orgId }),
          })

          if (response.ok) {
            showNotification("success", `Organization "${orgName}" has been archived successfully.`)
            await checkAuthAndLoadData() // Refresh data
          } else {
            const error = await response.text()
            showNotification("error", `Failed to archive organization: ${error}`)
          }
        } catch (error) {
          console.error("Archive organization error:", error)
          showNotification("error", "Failed to archive organization. Please try again.")
        } finally {
          setConfirmDialog((prev) => ({ ...prev, show: false }))
        }
      },
      () => setConfirmDialog((prev) => ({ ...prev, show: false })),
    )
  }

  const deleteOrganization = async (orgId: string, orgName: string) => {
    showConfirmDialog(
      "⚠️ DANGER: Permanent Deletion",
      `Are you sure you want to PERMANENTLY DELETE "${orgName}"? This action cannot be undone and will remove all associated data including users, reports, and settings.`,
      () => {
        // Second confirmation
        showConfirmDialog(
          "⚠️ FINAL WARNING",
          `This will PERMANENTLY DELETE "${orgName}" and ALL its data. This action is irreversible.`,
          async () => {
            try {
              console.log("[v0] Attempting to delete organization:", orgId)
              const response = await fetch("/api/admin/delete-organization", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ organization_id: orgId }),
              })

              const responseText = await response.text()
              console.log("[v0] Delete response:", response.status, responseText)

              if (response.ok) {
                // Remove from frontend state immediately
                setOrganizations((prev) => prev.filter((org) => org.organization_id !== orgId))
                setAllUsers((prev) => prev.filter((user) => user.organization_id !== orgId))
                showNotification("success", `Organization "${orgName}" has been permanently deleted.`)
              } else {
                showNotification("error", `Failed to delete organization: ${responseText}`)
              }
            } catch (error) {
              console.error("Delete organization error:", error)
              showNotification("error", "Failed to delete organization. Please try again.")
            }
          },
        )
      },
      "danger",
    )
  }

  const checkAuthAndLoadData = async () => {
    try {
      console.log("[v0] Starting master admin authentication check...")

      await new Promise((resolve) => setTimeout(resolve, 500))

      let masterAdminAuth = localStorage.getItem("masterAdminAuth")
      let masterAdminEmail = localStorage.getItem("masterAdminEmail")

      // If localStorage is not available, try cookies
      if (!masterAdminAuth || !masterAdminEmail) {
        masterAdminEmail = getCookie("masterAdminEmail")
        const cookieAuth = getCookie("masterAdminImpersonation")
        if (cookieAuth === "true" && masterAdminEmail) {
          masterAdminAuth = "true"
          // Set localStorage from cookies for future use
          localStorage.setItem("masterAdminAuth", "true")
          localStorage.setItem("masterAdminEmail", masterAdminEmail)
        }
      }

      console.log("[v0] Auth check results:", { masterAdminAuth, masterAdminEmail })

      if (masterAdminAuth !== "true" || !masterAdminEmail) {
        console.log("[v0] Master admin not authenticated, redirecting to masterlogin")
        router.push("/masterlogin")
        return
      }

      console.log(`[v0] Master admin authenticated: ${masterAdminEmail}`)
      setIsAuthenticated(true)

      // Don't set role here - it will be fetched in fetchCurrentUserRole()

      const loadEssentialData = async () => {
        try {
          const timestamp = Date.now()
          console.log("[v0] Loading fresh data with timestamp:", timestamp)

          const [
            { data: organizationsData, error: orgError },
            { data: profilesData, error: profileError },
            { data: superusersData, error: superusersError },
            { data: templatesData, error: templatesError },
            { data: subscriptionsData, error: subscriptionsError }, // Fetch subscriptions
            { data: paymentsData, error: paymentsError }, // Fetch payments
            { data: feedbackData, error: feedbackError }, // Fetch feedback
            { data: reportsData, error: reportsError }, // Fetch reports
          ] = await Promise.all([
            createClient().from("organizations").select("*"),
            createClient().from("profiles").select("*"),
            createClient().from("superusers").select("*"),
            createClient().from("checklist_templates").select("id, name, organization_id, is_active").limit(100),
            createClient()
              .from("subscriptions")
              .select(`*, organizations(organization_id, organization_name, logo_url, primary_color, slug)`), // Select organization details for subscriptions
            createClient()
              .from("payments")
              .select(`*, subscriptions(*, organizations(*))`), // Select subscription and organization details for payments
            createClient()
              .from("feedback")
              .select("*"), // Fetch feedback
            createClient()
              .from("submitted_reports")
              .select("*"), // Fetch submitted reports
          ])

          console.log("[v0] Data fetch results:", {
            organizations: { error: orgError, count: organizationsData?.length },
            profiles: { error: profileError, count: profilesData?.length },
            superusers: { error: superusersError, count: superusersData?.length },
            templates: { error: templatesError, count: templatesData?.length },
            subscriptions: { error: subscriptionsError, count: subscriptionsData?.length },
            payments: { error: paymentsError, count: paymentsData?.length },
            feedback: { error: feedbackError, count: feedbackData?.length },
            reports: { error: reportsError, count: reportsData?.length },
          })

          if (profileError) {
            console.error("[v0] Profile fetch error:", profileError)
          }

          if (orgError) {
            console.error("[v0] Organization fetch error:", orgError)
          }

          if (superusersError) {
            console.error("[v0] Superusers fetch error:", superusersError)
            setSuperusers([])
          } else if (superusersData) {
            setSuperusers(superusersData)
          }

          if (subscriptionsError) {
            console.error("[v0] Subscriptions fetch error:", subscriptionsError)
            setAllSubscriptions([])
          } else {
            // Ensure organization_id is present in subscriptions data
            const enrichedSubscriptions = (subscriptionsData || []).map((sub) => {
              const org = organizationsData?.find((org) => org.organization_id === sub.organization_id)
              return {
                ...sub,
                organizations: org
                  ? {
                      organization_id: org.organization_id,
                      organization_name: org.organization_name,
                      logo_url: org.logo_url,
                      slug: org.slug,
                    }
                  : null,
              }
            })
            setAllSubscriptions(enrichedSubscriptions)
          }

          if (paymentsError) {
            console.error("[v0] Payments fetch error:", paymentsError)
            setAllPayments([])
          } else {
            setAllPayments(paymentsData || [])
          }

          if (feedbackError) {
            console.error("[v0] Feedback fetch error:", feedbackError)
            setFeedback([])
          } else {
            setFeedback(feedbackData || [])
            setUnreadFeedbackCount(feedbackData?.filter((f) => f.status === "unread").length || 0)
          }

          if (reportsError) {
            console.error("[v0] Reports fetch error:", reportsError)
            setTotalSubmittedReports(0)
          } else {
            setTotalSubmittedReports(reportsData?.length || 0)
          }

          // Create organization map with profiles
          const organizationMap = new Map()

          // Initialize organizations from organizations table
          if (organizationsData) {
            organizationsData.forEach((org) => {
              organizationMap.set(org.organization_id, {
                ...org,
                profiles: [],
                templateCount: templatesData?.filter((t) => t.organization_id === org.organization_id)?.length || 0,
              })
            })
          }

          // Add profiles to their respective organizations
          if (profilesData) {
            profilesData.forEach((profile) => {
              if (profile.organization_id) {
                const org = organizationMap.get(profile.organization_id)
                if (org) {
                  org.profiles.push(profile)
                } else {
                  // Create organization from profile data if not in organizations table
                  organizationMap.set(profile.organization_id, {
                    organization_id: profile.organization_id,
                    organization_name:
                      profile.organization_name || `Organization ${profile.organization_id.slice(0, 8)}`,
                    logo_url: null,
                    primary_color: null,
                    secondary_color: null,
                    slug: null,
                    created_at: profile.created_at || new Date().toISOString(),
                    updated_at: profile.updated_at || new Date().toISOString(),
                    profiles: [profile],
                    templateCount:
                      templatesData?.filter((t) => t.organization_id === profile.organization_id)?.length || 0,
                  })
                }
              }
            })
          }

          const allOrganizations = Array.from(organizationMap.values())

          setOrganizations(allOrganizations)
          setAllUsers(profilesData || [])

          console.log("[v0] Enhanced data loaded:", {
            organizations: allOrganizations.length,
            users: profilesData?.length || 0,
            superusers: superusersData?.length || 0,
            templates: templatesData?.length || 0,
            subscriptions: subscriptionsData?.length || 0,
            payments: paymentsData?.length || 0,
            feedback: feedbackData?.length || 0,
            reports: reportsData?.length || 0,
          })

          const admins = profilesData?.filter((user) => user.role === "admin") || []
          const staff = profilesData?.filter((user) => user.role === "staff") || []

          console.log("[v0] User roles:", { admins: admins.length, staff: staff.length })
          console.log("[v0] Essential data loaded successfully")

          setIsLoading(false)
        } catch (error) {
          console.error("[v0] Error loading essential data:", error)
          setIsLoading(false)
        }
      }

      loadEssentialData()
    } catch (error) {
      console.error("[v0] Auth and data loading error:", error)
      setIsLoading(false)
    }
  }

  // Fetch current user role from database
  useEffect(() => {
    const fetchCurrentUserRole = async () => {
      const masterAdminEmail = localStorage.getItem("masterAdminEmail") || getCookie("masterAdminEmail")
      // Check if masterAdminAuth is true and masterAdminEmail is available
      const masterAdminAuth =
        localStorage.getItem("masterAdminAuth") === "true" || getCookie("masterAdminImpersonation") === "true"

      if (!masterAdminAuth || !masterAdminEmail) {
        setCurrentUserRole("support")
        console.log("[v0] Master admin not authenticated or email missing, defaulting to support")
        return
      }

      if (masterAdminEmail === "arsami.uk@gmail.com") {
        setCurrentUserRole("masteradmin")
        console.log("[v0] Hardcoded master admin role for arsami.uk@gmail.com")
        return
      }

      try {
        const supabase = createClient()

        const { data, error } = await supabase
          .from("superusers")
          .select("role")
          .eq("email", masterAdminEmail)
          .eq("is_active", true)

        if (error) {
          console.error("[v0] Error fetching current user role:", error.message)
          setCurrentUserRole("support")
          console.log("[v0] Error fetching role, defaulting to support")
          return
        }

        if (data && data.length > 0 && data[0].role) {
          setCurrentUserRole(data[0].role)
          console.log("[v0] Current user role from database:", data[0].role)
        } else {
          setCurrentUserRole("support")
          console.log("[v0] No superuser record found, defaulting to support")
        }
      } catch (error) {
        console.error("[v0] Error in fetchCurrentUserRole:", error)
        setCurrentUserRole("support")
        console.log("[v0] Exception in role fetch, defaulting to support")
      }
    }

    fetchCurrentUserRole()
  }, []) // Removed getCookie, localStorage, createClient as dependencies

  useEffect(() => {
    checkAuthAndLoadData()

    // Cleanup function to prevent memory leaks
    return () => {
      setOrganizations([])
      setAllUsers([])
      setAllSubscriptions([])
      setAllPayments([])
      setFeedback([])
      setSuperusers([])
    }
  }, [])

  useEffect(() => {
    if (activeTab === "login-as" && currentUserRole === "masteradmin") {
      fetchActivityLogs()
    }
  }, [activeTab, currentUserRole])

  const loginAsUser = async (userEmail: string, userRole: string) => {
    try {
      console.log(`[v0] Starting master admin impersonation for: ${userEmail} Role: ${userRole}`)

      const supabase = createClient()
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*, organizations(organization_id, organization_name, logo_url, primary_color, secondary_color)")
        .eq("email", userEmail.trim())
        .single()

      if (profileError || !profileData) {
        console.error("[v0] Profile fetch error:", profileError)
        showNotification("error", "User profile not found.")
        return
      }

      console.log("[v0] Profile data fetched:", profileData)

      const response = await fetch("/api/impersonation/create-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: profileData.id,
          userEmail: userEmail.trim(),
          userRole: userRole,
          organizationId: profileData.organization_id || null,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to create impersonation token")
      }

      const { url, token, expiresAt } = await response.json()

      console.log("[v0] Generated short impersonation URL:", url)

      // Set the impersonation URL in state to show the modal
      setImpersonationUrl(url)
      setShowImpersonationModal(true)

      showNotification("success", `Impersonation link generated! Valid for 15 minutes.`)
    } catch (error) {
      console.error("[v0] Error setting up impersonation:", error)
      showNotification("error", "Failed to generate impersonation link")
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
    document.cookie = "impersonatedOrganizationId=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
    document.cookie = "impersonatedOrganizationSlug=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"

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
      checkAuthAndLoadData()
      showNotification("success", "Subscription cancelled successfully")
      setSelectedSubscription(null)
    } catch (error) {
      console.error("Error cancelling subscription:", error)
      showNotification("error", "Failed to cancel subscription")
    } finally {
      setIsProcessing(false)
    }
  }

  const downgradeSubscription = async (subscriptionId: string, organizationName: string) => {
    const confirmed = confirm(
      `Are you sure you want to downgrade ${organizationName} to the Starter plan?\n\n` +
        `This action should only be performed after verification and user request. ` +
        `The organization will lose access to premium features immediately.`,
    )

    if (!confirmed) return

    setIsProcessing(true)
    try {
      const supabase = createClient()

      const { error } = await supabase
        .from("subscriptions")
        .update({
          plan_name: "starter",
          status: "active",
          current_period_end: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString(), // 100 years for free plan
          updated_at: new Date().toISOString(),
        })
        .eq("id", subscriptionId)

      if (error) throw error

      // Refresh data
      await checkAuthAndLoadData()
      showNotification("success", `${organizationName} successfully downgraded to Starter plan`)
      setSelectedSubscription(null)
    } catch (error) {
      console.error("Error downgrading subscription:", error)
      showNotification("error", "Failed to downgrade subscription. Please try again.")
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
      checkAuthAndLoadData()
      showNotification("success", `${planName} subscription added successfully`)
      setNewSubscriptionPlan("")
    } catch (error) {
      console.error("Error adding subscription:", error)
      showNotification("error", "Failed to add subscription")
    } finally {
      setIsProcessing(false)
    }
  }

  // Original processRefund function (will be replaced by the updated one)
  const processRefundOriginal = async (paymentId: string, amount: string) => {
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
      checkAuthAndLoadData()
      alert(`Refund of £${amount} processed successfully`)
      setRefundAmount("")
    } catch (error) {
      console.error("Error processing refund:", error)
      alert("Failed to process refund")
    } finally {
      setIsProcessing(false)
    }
  }

  // Updated processRefund function
  async function processRefund(paymentId: string, amount: string) {
    if (!confirm(`Are you sure you want to process a refund of £${amount}?`)) return

    setIsProcessing(true)
    try {
      const response = await fetch("/api/admin/process-refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId,
          amount: Number.parseFloat(amount),
          reason: "requested_by_customer",
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to process refund")
      }

      const data = await response.json()
      console.log("[v0] Refund processed:", data)
      toast.success("Refund processed successfully")

      // Refresh payment data
      loadAllPayments()
    } catch (error: any) {
      console.error("[v0] Error processing refund:", error)
      toast.error(error.message || "Failed to process refund")
    } finally {
      setIsProcessing(false)
      setRefundAmount("")
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
      checkAuthAndLoadData()
      alert("User deleted successfully")
    } catch (error) {
      console.error("Error deleting user:", error)
      alert("Failed to delete user")
    } finally {
      setIsProcessing(false)
    }
  }

  useEffect(() => {}, [])

  useEffect(() => {
    if (activeTab === "login-as" && currentUserRole === "masteradmin") {
      fetchActivityLogs()
    }
  }, [activeTab, currentUserRole])

  useEffect(() => {
    console.log("[v0] Calculating stats - Organizations:", organizations.length, "Users:", allUsers.length)
    if (organizations.length === 0) {
      setOrganizationStats({
        total: 0,
        active: 0,
        withSubscriptions: 0,
        totalUsers: 0,
        totalAdmins: 0,
        totalStaff: 0,
      })
      return
    }

    const orgsWithSubs = new Set(allSubscriptions.map((sub) => sub.organization_id)).size

    const stats = {
      total: organizations.length,
      active: organizations.length, // Simplified calculation
      withSubscriptions: orgsWithSubs, // Count unique organizations with subscriptions
      totalUsers: allUsers.length,
      totalAdmins: allUsers.filter((user) => user.role === "admin").length,
      totalStaff: allUsers.filter((user) => user.role === "staff").length,
    }
    setOrganizationStats(stats)
  }, [organizations, allUsers, allSubscriptions]) // Added allSubscriptions dependency for accurate counts

  const handleSignOut = async () => {
    document.cookie = "masterAdminImpersonation=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
    document.cookie = "masterAdminEmail=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
    document.cookie = "userType=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
    document.cookie = "masterAdminType=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
    document.cookie = "impersonatedUserEmail=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
    document.cookie = "impersonatedUserRole=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
    document.cookie = "impersonatedOrganizationId=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
    document.cookie = "impersonatedOrganizationSlug=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"

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

      const message = [
        "Password reset successful!",
        "",
        `User: ${data.userEmail}`,
        `Temporary Password: ${data.tempPassword}`,
        "",
        "Please provide this to the user and ask them to change it immediately.",
      ].join("\n")

      alert(message)
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
      checkAuthAndLoadData()
      alert("User deleted successfully")
    } catch (error) {
      console.error("Error deleting user:", error)
      alert("Failed to delete user")
    } finally {
      setIsProcessing(false)
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
    org.organization_name.toLowerCase().includes(organizationSearchTerm.toLowerCase()),
  )

  const filteredUsersNew = allUsers.filter(
    (user) =>
      user.email.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      user.organizations?.name.toLowerCase().includes(userSearchTerm.toLowerCase()),
  )

  // Superuser Management Functions
  const addSuperuser = async () => {
    if (currentUserRole !== "masteradmin") {
      alert("Only master admins can add superusers")
      return
    }

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
      checkAuthAndLoadData()
      setNewSuperuserEmail("")
      setNewSuperuserPassword("")
      alert("Superuser added successfully")
    } catch (error) {
      console.error("Error adding superuser:", error)
      alert("Failed to add superuser")
    }
  }

  const removeSuperuser = async (superuserId: string) => {
    if (currentUserRole !== "masteradmin") {
      alert("Only master admins can remove superusers")
      return
    }

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
      checkAuthAndLoadData()
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
      checkAuthAndLoadData()
      setEditingSuperuser(null)
      setNewSuperuserPassword("")
      alert("Superuser updated successfully")
    } catch (error) {
      console.error("Error updating superuser:", error)
      alert("Failed to update superuser")
    }
  }

  const updateOrganizationName = async (organizationId: string, newName: string) => {
    try {
      console.log("[v0] Updating organization name in database:", organizationId, newName)

      const response = await fetch("/api/admin/update-organization", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          organization_id: organizationId,
          organization_name: newName,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        if (response.status === 409) {
          throw new Error(`The organization name "${newName}" is already taken. Please choose a different name.`)
        }
        throw new Error(errorData.error || "Failed to update organization")
      }

      console.log("[v0] Organization name updated successfully in database")
      showNotification("success", `Organization name updated to "${newName}"`)

      // Update local state
      setOrganizations((prev) =>
        prev.map((org) =>
          org.organization_id === organizationId
            ? { ...org, organization_name: newName, updated_at: new Date().toISOString() }
            : org,
        ),
      )
    } catch (error) {
      console.error("[v0] Error updating organization name:", error)
      showNotification("error", `Failed to update organization name: ${error.message}`)
    }
  }

  const fetchActivityLogs = async () => {
    setActivityLogsLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("impersonation_activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100)

      if (error) {
        if (error.message.includes("Could not find the table")) {
          console.log(
            "[v0] Activity logs table not created yet. Please run scripts/create-impersonation-activity-logs.sql",
          )
          setActivityLogs([])
        } else {
          console.error("[v0] Error fetching activity logs:", error)
          setActivityLogs([])
        }
      } else {
        setActivityLogs(data || [])
      }
    } catch (error) {
      console.error("[v0] Error fetching activity logs:", error)
      setActivityLogs([])
    } finally {
      setActivityLogsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading master dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {confirmDialog.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center mb-4">
              <AlertTriangle
                className={`w-6 h-6 mr-3 ${confirmDialog.type === "danger" ? "text-red-500" : "text-yellow-500"}`}
              />
              <h3 className="text-lg font-semibold text-gray-900">{confirmDialog.title}</h3>
            </div>
            <p className="text-gray-600 mb-6">{confirmDialog.message}</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={confirmDialog.onCancel}
                className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className={`px-4 py-2 text-white rounded-lg transition-colors ${
                  confirmDialog.type === "danger" ? "bg-red-600 hover:bg-red-700" : "bg-yellow-600 hover:bg-yellow-700"
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {notification.show && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg border-l-4 max-w-md ${
            notification.type === "success"
              ? "bg-green-50 border-green-500 text-green-800"
              : notification.type === "error"
                ? "bg-red-50 border-red-500 text-red-800"
                : notification.type === "warning"
                  ? "bg-yellow-50 border-yellow-500 text-yellow-800"
                  : "bg-blue-50 border-blue-500 text-blue-800"
          }`}
        >
          <div className="flex items-start">
            <div className="flex-shrink-0">
              {notification.type === "success" && <CheckCircle className="w-5 h-5 text-green-500" />}
              {notification.type === "error" && <AlertCircle className="w-5 h-5 text-red-500" />}
              {notification.type === "warning" && <AlertTriangle className="w-5 h-5 text-yellow-500" />}
              {notification.type === "info" && <Info className="w-5 h-5 text-blue-500" />}
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium">{notification.message}</p>
            </div>
            <button
              onClick={() => setNotification((prev) => ({ ...prev, show: false }))}
              className="ml-4 flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

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
            {/* Updated sync button with enhanced tooltip and status */}
            <Button
              variant="outline"
              size="sm"
              onClick={syncData}
              disabled={isProcessing}
              className="flex items-center gap-2 bg-transparent"
              title="Comprehensive sync: Organizations, Users, Roles, Templates, Checklists, and Data Consistency"
            >
              <RefreshCw className={`w-4 h-4 ${isProcessing ? "animate-spin" : ""}`} />
              {isProcessing ? "Syncing..." : "Comprehensive Sync"}
            </Button>
            <Badge variant={currentUserRole === "masteradmin" ? "destructive" : "secondary"}>
              {currentUserRole === "masteradmin" ? "Master Admin" : "Support"}
            </Badge>
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
            {/* Conditionally render Superuser Tools tab only if user is masteradmin */}
            {currentUserRole === "masteradmin" && (
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
                  <CardTitle className="text-sm font-medium">Paid Subscriptions</CardTitle>
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {
                      allSubscriptions.filter(
                        (sub) =>
                          sub.status === "active" &&
                          (sub.plan_name.toLowerCase() === "growth" || sub.plan_name.toLowerCase() === "scale"),
                      ).length
                    }
                  </div>
                  <p className="text-xs text-muted-foreground">Growth & Scale plans</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    £
                    {allPayments
                      .filter((payment) => payment.status === "completed")
                      .reduce((sum, payment) => sum + Number.parseFloat(payment.amount), 0)
                      .toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground">Completed payments</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Checklists & Templates</CardTitle>
                  <CardDescription>Daily operations management</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Checklists</span>
                    <span className="font-semibold">{databaseStats.checklists.total}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Completed</span>
                    <span className="font-semibold text-green-600">{databaseStats.checklists.completed}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Pending</span>
                    <span className="font-semibold text-orange-600">{databaseStats.checklists.pending}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Active Templates</span>
                    <span className="font-semibold">{databaseStats.templates.active}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Communications</CardTitle>
                  <CardDescription>Notifications and feedback</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Notifications</span>
                    <span className="font-semibold">{databaseStats.notifications.total}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Unread</span>
                    <span className="font-semibold text-red-600">{databaseStats.notifications.unread}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Feedback</span>
                    <span className="font-semibold">{feedback.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Unread Feedback</span>
                    <span className="font-semibold text-red-600">{unreadFeedbackCount}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Staff Management</CardTitle>
                  <CardDescription>Holidays and availability</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Holidays</span>
                    <span className="font-semibold">{databaseStats.holidays.total}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Upcoming</span>
                    <span className="font-semibold text-blue-600">{databaseStats.holidays.upcoming}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Staff Unavailable</span>
                    <span className="font-semibold text-orange-600">{databaseStats.staffUnavailability.current}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Reports</span>
                    <span className="font-semibold">{totalSubmittedReports}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">System Activity</CardTitle>
                  <CardDescription>Audit logs and backups</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Audit Logs</span>
                    <span className="font-semibold">{databaseStats.auditLogs.total}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Today's Activity</span>
                    <span className="font-semibold text-green-600">{databaseStats.auditLogs.today}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Backups</span>
                    <span className="font-semibold">{databaseStats.backups.total}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">This Week</span>
                    <span className="font-semibold text-blue-600">{databaseStats.backups.thisWeek}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">User Activity</CardTitle>
                  <CardDescription>Current user engagement</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Currently Online</span>
                    <span className="font-semibold text-green-600">
                      {
                        allUsers.filter((user) => {
                          const lastSeen = new Date(user.last_sign_in_at || user.created_at)
                          const now = new Date()
                          const diffMinutes = (now.getTime() - lastSeen.getTime()) / (1000 * 60)
                          return diffMinutes <= 30
                        }).length
                      }
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Admins</span>
                    <span className="font-semibold">{allUsers.filter((u) => u.role === "admin").length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Staff</span>
                    <span className="font-semibold">{allUsers.filter((u) => u.role === "staff").length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Superusers</span>
                    <span className="font-semibold text-purple-600">
                      {superusers.filter((s) => s.is_active).length}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Database Health</CardTitle>
                  <CardDescription>Overall system status</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Tables</span>
                    <span className="font-semibold">21</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Records</span>
                    <span className="font-semibold">
                      {allUsers.length +
                        organizations.length +
                        databaseStats.checklists.total +
                        databaseStats.templates.total +
                        databaseStats.notifications.total +
                        databaseStats.holidays.total +
                        databaseStats.auditLogs.total +
                        databaseStats.backups.total +
                        totalSubmittedReports +
                        feedback.length +
                        allSubscriptions.length +
                        allPayments.length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">System Status</span>
                    <span className="font-semibold text-green-600">Healthy</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Last Updated</span>
                    <span className="font-semibold text-xs">{new Date().toLocaleTimeString()}</span>
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
                              {subscription.plan_name} • Started{" "}
                              {new Date(subscription.created_at).toLocaleDateString("en-GB", {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              })}
                            </p>
                            <p className="text-sm text-gray-500">
                              Expires{" "}
                              {new Date(subscription.current_period_end).toLocaleDateString("en-GB", {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              })}
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
                        key={org.organization_id}
                        className="border rounded-xl p-6 bg-white shadow-sm hover:shadow-md transition-all"
                      >
                        {/* Organization Header */}
                        <div className="flex items-start justify-between mb-6">
                          <div className="flex items-center gap-4">
                            {org.logo_url ? (
                              <img
                                src={org.logo_url || "/placeholder.svg"}
                                alt={org.organization_name}
                                className="w-16 h-16 rounded-xl object-cover border-2 border-gray-100"
                              />
                            ) : (
                              <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center border-2 border-gray-100">
                                <Building2 className="w-8 h-8 text-blue-600" />
                              </div>
                            )}
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <h3 className="text-xl font-bold text-gray-900">{org.organization_name}</h3>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditingOrg({ id: org.organization_id, name: org.organization_name })
                                    setEditOrgName(org.organization_name)
                                  }}
                                  className="h-6 w-6 p-0 hover:bg-gray-100"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </Button>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  Created {new Date(org.created_at).toLocaleDateString()}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Building2 className="w-4 h-4" />
                                  ID: {org.organization_id.slice(0, 8)}...
                                </span>
                                <span className="flex items-center gap-1">
                                  <Building2 className="w-4 h-4" />
                                  Templates: {org.templateCount}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-sm px-3 py-1">
                              Active Organization
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => archiveOrganization(org.organization_id, org.organization_name)}
                              className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                              disabled={isProcessing}
                            >
                              <Archive className="w-4 h-4 mr-1" />
                              Archive
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteOrganization(org.organization_id, org.organization_name)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              disabled={isProcessing}
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Delete
                            </Button>
                          </div>
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
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          if (confirm(`Demote ${admin.full_name} to staff member?`)) {
                                            // TODO: Implement role change
                                            console.log("[v0] Demote admin to staff:", admin.id)
                                          }
                                        }}
                                        className="h-6 w-6 p-0 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                      >
                                        <ArrowDown className="w-3 h-3" />
                                      </Button>
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
                                      <div className="flex items-center gap-1">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            if (confirm(`Promote ${staff.full_name} to administrator?`)) {
                                              // TODO: Implement role change
                                              console.log("[v0] Promote staff to admin:", staff.id)
                                            }
                                          }}
                                          className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                                        >
                                          <ArrowUp className="w-3 h-3" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            if (confirm(`Remove ${staff.full_name} from this organization?`)) {
                                              // TODO: Implement staff removal
                                              console.log("[v0] Remove staff from organization:", staff.id)
                                            }
                                          }}
                                          className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                        >
                                          <X className="w-3 h-3" />
                                        </Button>
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Subscriptions</p>
                      <p className="text-2xl font-bold">{allSubscriptions.length}</p>
                    </div>
                    <CreditCard className="w-8 h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Active Plans</p>
                      <p className="text-2xl font-bold text-green-600">
                        {allSubscriptions.filter((sub) => sub.status === "active").length}
                      </p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Free Plans (Starter)</p>
                      <p className="text-2xl font-bold">
                        {allSubscriptions.filter((sub) => sub.plan_name?.toLowerCase() === "starter").length}
                      </p>
                    </div>
                    <Users className="w-8 h-8 text-gray-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Paid Plans</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {
                          allSubscriptions.filter(
                            (sub) => sub.plan_name?.toLowerCase() !== "starter" && sub.status === "active",
                          ).length
                        }
                      </p>
                    </div>
                    <DollarSign className="w-8 h-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Subscription Management</CardTitle>
                <CardDescription>Manage all active and inactive subscriptions across all organizations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {allSubscriptions.length === 0 ? (
                    <div className="text-center py-12">
                      <CreditCard className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Subscriptions Found</h3>
                      <p className="text-gray-500">
                        Subscriptions will appear here once organizations sign up to paid plans.
                      </p>
                    </div>
                  ) : (
                    allSubscriptions.map((subscription) => (
                      <div
                        key={subscription.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <p className="font-medium">
                              {subscription.organizations?.organization_name || "Unknown Organization"}
                            </p>
                            <Badge
                              variant={subscription.plan_name?.toLowerCase() === "starter" ? "secondary" : "default"}
                              className={
                                subscription.plan_name?.toLowerCase() === "scale" ? "bg-purple-100 text-purple-700" : ""
                              }
                            >
                              {subscription.plan_name}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-500">
                            Started{" "}
                            {new Date(subscription.created_at).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })}
                            {subscription.plan_name?.toLowerCase() !== "starter" &&
                              ` • Expires ${new Date(subscription.current_period_end).toLocaleDateString("en-GB", {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              })}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={subscription.status === "active" ? "default" : "secondary"}>
                            {subscription.status}
                          </Badge>
                          {subscription.status === "active" &&
                            subscription.plan_name?.toLowerCase() !== "starter" &&
                            currentUserRole === "masteradmin" && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    downgradeSubscription(
                                      subscription.id,
                                      subscription.organizations?.organization_name || "Organization",
                                    )
                                  }
                                  disabled={isProcessing}
                                >
                                  <ArrowDown className="w-4 h-4 mr-1" />
                                  Downgrade
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => cancelSubscription(subscription.id)}
                                  disabled={isProcessing}
                                >
                                  <Trash2 className="w-4 h-4 mr-1" />
                                  Cancel
                                </Button>
                              </>
                            )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                      <p className="text-2xl font-bold text-green-600">
                        £
                        {allPayments
                          .filter((payment) => payment.status === "completed" || payment.status === "succeeded")
                          .reduce((sum, payment) => sum + Number.parseFloat(payment.amount), 0)
                          .toFixed(2)}
                      </p>
                    </div>
                    <DollarSign className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Payments</p>
                      <p className="text-2xl font-bold">{allPayments.length}</p>
                    </div>
                    <CreditCard className="w-8 h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Successful</p>
                      <p className="text-2xl font-bold text-green-600">
                        {allPayments.filter((p) => p.status === "completed" || p.status === "succeeded").length}
                      </p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Failed/Pending</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {allPayments.filter((p) => p.status !== "completed" && p.status !== "succeeded").length}
                      </p>
                    </div>
                    <AlertCircle className="w-8 h-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Payment Management</CardTitle>
                <CardDescription>View and manage all payment transactions with refund capabilities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {allPayments.length === 0 ? (
                    <div className="text-center py-12">
                      <DollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Payments Found</h3>
                      <p className="text-gray-500">
                        Payment transactions will appear here once organizations sign up to paid plans.
                      </p>
                    </div>
                  ) : (
                    allPayments.map((payment) => (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <p className="font-medium">
                              {payment.subscriptions?.organizations?.organization_name || "Unknown Organization"}
                            </p>
                            <Badge variant="outline">{payment.subscriptions?.plan_name || "N/A"}</Badge>
                          </div>
                          <p className="text-sm text-gray-500">
                            {new Date(payment.created_at).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="font-medium text-lg">£{Number.parseFloat(payment.amount).toFixed(2)}</p>
                            <Badge
                              variant={
                                payment.status === "completed" || payment.status === "succeeded"
                                  ? "default"
                                  : payment.status === "refunded"
                                    ? "secondary"
                                    : "destructive"
                              }
                            >
                              {payment.status}
                            </Badge>
                          </div>
                          {(payment.status === "completed" || payment.status === "succeeded") &&
                            currentUserRole === "masteradmin" && (
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
                                    <DialogDescription>
                                      Process a full or partial refund for this payment
                                    </DialogDescription>
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
                                      <p className="text-sm text-muted-foreground mt-1">
                                        Maximum refund: £{Number.parseFloat(payment.amount).toFixed(2)}
                                      </p>
                                    </div>
                                  </div>
                                  <DialogFooter>
                                    <Button
                                      onClick={() => processRefund(payment.id, refundAmount)}
                                      disabled={
                                        !refundAmount ||
                                        isProcessing ||
                                        Number.parseFloat(refundAmount) > Number.parseFloat(payment.amount) ||
                                        Number.parseFloat(refundAmount) <= 0
                                      }
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
                    ))
                  )}
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

          {currentUserRole === "masteradmin" && (
            <TabsContent value="login-as" className="space-y-6">
              {/* Superuser Management Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Superuser Management
                  </CardTitle>
                  <CardDescription>
                    Add and manage support admin accounts. Only master admins can perform these actions.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Add New Superuser Form */}
                  <div className="border rounded-lg p-4 space-y-4">
                    <h3 className="font-semibold text-sm">Add New Support Admin</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="text-sm font-medium">Email Address</label>
                        <Input
                          type="email"
                          placeholder="support@mydaylogs.co.uk"
                          value={newSuperuserEmail}
                          onChange={(e) => setNewSuperuserEmail(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Password</label>
                        <Input
                          type="password"
                          placeholder="Secure password"
                          value={newSuperuserPassword}
                          onChange={(e) => setNewSuperuserPassword(e.target.value)}
                        />
                      </div>
                    </div>
                    <Button onClick={addSuperuser} disabled={!newSuperuserEmail || !newSuperuserPassword}>
                      Add Support Admin
                    </Button>
                  </div>

                  {/* Existing Superusers List */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm">Existing Support Admins</h3>
                    {superusers.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No support admins found.</p>
                    ) : (
                      <div className="space-y-2">
                        {superusers.map((superuser) => (
                          <div key={superuser.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{superuser.email}</p>
                              <p className="text-xs text-muted-foreground">
                                Added: {new Date(superuser.created_at).toLocaleDateString()}
                                {superuser.role === "masteradmin" && (
                                  <Badge variant="default" className="ml-2">
                                    Master Admin
                                  </Badge>
                                )}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingSuperuser(superuser)
                                  setNewSuperuserPassword("")
                                }}
                              >
                                Reset Password
                              </Button>
                              {superuser.email !== "arsami.uk@gmail.com" && (
                                <Button size="sm" variant="destructive" onClick={() => removeSuperuser(superuser.id)}>
                                  Remove
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Edit Superuser Modal */}
                  {editingSuperuser && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                      <Card className="w-full max-w-md">
                        <CardHeader>
                          <CardTitle>Reset Password</CardTitle>
                          <CardDescription>Enter a new password for {editingSuperuser.email}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <label className="text-sm font-medium">New Password</label>
                            <Input
                              type="password"
                              placeholder="New secure password"
                              value={newSuperuserPassword}
                              onChange={(e) => setNewSuperuserPassword(e.target.value)}
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button onClick={updateSuperuser} disabled={!newSuperuserPassword}>
                              Update Password
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setEditingSuperuser(null)
                                setNewSuperuserPassword("")
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Activity Logs Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Impersonation Activity Logs
                  </CardTitle>
                  <CardDescription>
                    Monitor all actions performed by master admin and support admins while impersonating users for
                    security and audit purposes.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={fetchActivityLogs} disabled={activityLogsLoading}>
                        {activityLogsLoading ? "Loading..." : "Refresh Logs"}
                      </Button>
                    </div>

                    {activityLogsLoading ? (
                      <div className="text-center py-8 text-muted-foreground">Loading activity logs...</div>
                    ) : activityLogs.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No activity logs found. Logs will appear here when admins perform actions while impersonating
                        users.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[500px] overflow-y-auto">
                        {activityLogs.map((log) => (
                          <div
                            key={log.id}
                            className={`border rounded-lg p-3 ${
                              log.risk_level === "high"
                                ? "border-red-300 bg-red-50"
                                : log.risk_level === "medium"
                                  ? "border-yellow-300 bg-yellow-50"
                                  : "border-gray-200"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge variant={log.admin_type === "masteradmin" ? "default" : "secondary"}>
                                    {log.admin_type === "masteradmin" ? "Master Admin" : "Support"}
                                  </Badge>
                                  <Badge
                                    variant={
                                      log.risk_level === "high"
                                        ? "destructive"
                                        : log.risk_level === "medium"
                                          ? "default"
                                          : "outline"
                                    }
                                  >
                                    {log.risk_level.toUpperCase()}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(log.created_at).toLocaleString()}
                                  </span>
                                </div>
                                <p className="text-sm font-medium">
                                  <span className="text-blue-600">{log.admin_email}</span> impersonated{" "}
                                  <span className="text-purple-600">{log.impersonated_user_email}</span>
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Action: <span className="font-medium">{log.action_type.replace(/_/g, " ")}</span>
                                </p>
                                {log.action_details && (
                                  <details className="text-xs">
                                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                                      View details
                                    </summary>
                                    <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                                      {JSON.stringify(log.action_details, null, 2)}
                                    </pre>
                                  </details>
                                )}
                                {log.ip_address && (
                                  <p className="text-xs text-muted-foreground">IP: {log.ip_address}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

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

      {/* Impersonation Modal */}
      {showImpersonationModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-5"
          onClick={() => setShowImpersonationModal(false)}
        >
          <div className="bg-white rounded-lg p-5 max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Impersonation Link Generated</h3>
            <p className="text-sm text-gray-600 mb-3">
              Copy this URL and paste it into an incognito/private window to impersonate the user:
            </p>
            <div className="bg-gray-100 p-3 rounded mb-4 break-all font-mono text-xs">{impersonationUrl}</div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(impersonationUrl)
                  showNotification("success", "Copied to clipboard!")
                }}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
              >
                Copy to Clipboard
              </button>
              <button
                onClick={() => window.open(impersonationUrl, "_blank")}
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
              >
                Open in New Tab
              </button>
              <button
                onClick={() => setShowImpersonationModal(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {editingOrg && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Edit Organization Name</h3>
            <input
              type="text"
              value={editOrgName}
              onChange={(e) => setEditOrgName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter organization name"
            />
            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setEditingOrg(null)
                  setEditOrgName("")
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (editOrgName.trim() && editOrgName !== editingOrg.name) {
                    console.log("[v0] Update organization name:", editingOrg.id, editOrgName.trim())
                    await updateOrganizationName(editingOrg.id, editOrgName.trim())
                  }
                  setEditingOrg(null)
                  setEditOrgName("")
                }}
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
