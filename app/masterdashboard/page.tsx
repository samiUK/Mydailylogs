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
  Mail,
  MessageSquare,
  User,
  Clock,
  UserPlus,
  TrendingUp,
  Crown,
  FileText,
  Layout,
  CheckSquare,
} from "lucide-react"
import { useEffect, useState } from "react"
import { ReportDirectoryContent } from "./report-directory-content"
import { toast } from "sonner" // Import toast
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import Link from "next/link" // Import Link

// All admin operations now use server-side API routes for security

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
  reportCount?: number // Added reportCount field
  subscription_tier?: string // Added subscription_tier field
  last_report_email_sent?: string // Added last_report_email_sent field
}

interface UserProfile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: string
  created_at: string
  organizations?: { name: string; logo_url: string | null; slug: string }
  last_sign_in_at?: string | null
  organization_id?: string
  organization_name?: string
  updated_at?: string
  email_confirmed_at?: string | null
  is_email_verified?: boolean // Add is_email_verified field
}

interface Subscription {
  id: string
  plan_name: string
  status: string
  current_period_end: string
  created_at: string
  organizations?: { organization_id: string; organization_name: string; logo_url: string | null; slug: string } // Added slug
  organization_id?: string // Added to link subscription to organization
  is_trial?: boolean // Added for trial status
  trial_ends_at?: string | null // Added for trial end date
  current_period_start?: string // Added for subscription start date
}

interface Payment {
  id: string
  amount: string
  status: string
  created_at: string
  subscriptions?: {
    plan_name: string
    organizations?: { organization_id: string; organization_name: string; slug: string } // Added slug
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
  const [error, setError] = useState<string | null>(null) // Added error state
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [allUsers, setAllUsers] = useState<UserProfile[]>([])
  const [authUserMap, setAuthUserMap] = useState<Map<string, any>>(new Map())
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
    // New state for server management
    totalSize: 0, // Supabase Database Storage in bytes
    totalBandwidth: 0, // Vercel Bandwidth in bytes
    sentEmails: 0, // Resend Emails sent
  })

  const [newSignupsThisMonth, setNewSignupsThisMonth] = useState(0)
  const [conversionRate, setConversionRate] = useState(0)
  const [databaseSize, setDatabaseSize] = useState("0 MB")

  const [isRefreshingServerStats, setIsRefreshingServerStats] = useState(false)
  const [lastRefreshed, setLastRefreshed] = useState<string | null>(null)

  // New state and modal control for impersonation link
  const [showImpersonationModal, setShowImpersonationModal] = useState(false)
  const [impersonationUrl, setImpersonationUrl] = useState("")

  const [activityLogs, setActivityLogs] = useState<any[]>([])
  const [activityLogsLoading, setActivityLogsLoading] = useState(false)

  const [subscriptionSearchTerm, setSubscriptionSearchTerm] = useState("")

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

          const authUsersResponse = await fetch("/api/admin/get-auth-users")
          const authUsersResult = await authUsersResponse.json()
          const verificationMap = authUsersResult.verificationMap || {}

          // Convert verificationMap to array format for compatibility
          const authUsers = Object.entries(verificationMap).map(([id, data]: [string, any]) => ({
            id,
            email: data.email,
            email_confirmed_at: data.email_confirmed_at,
            last_sign_in_at: data.last_sign_in_at || null,
            created_at: data.created_at || null, // Assuming created_at is available
            is_email_verified: data.email_confirmed_at !== null, // Added from map data
          }))

          const tempAuthUserMap = new Map()
          if (authUsers) {
            authUsers.forEach((user: any) => {
              tempAuthUserMap.set(user.id, user)
            })
          }
          setAuthUserMap(tempAuthUserMap)

          const adminClient = createClient() // Assuming adminClient is the same as createClient for this scope

          const [
            { data: organizationsData, error: orgError },
            { data: profilesData, error: profileError },
            { data: superusersData, error: superusersError },
            { data: templatesData, error: templatesError },
            { data: subscriptionsData, error: subscriptionsError },
            { data: paymentsData, error: paymentsError },
            { data: feedbackData, error: feedbackError },
            { data: reportsData, error: reportsError },
            { data: checklistsData, error: checklistsError },
            { data: notificationsData, error: notificationsError },
            { data: holidaysData, error: holidaysError },
            { data: staffUnavailabilityData, error: staffUnavailabilityError },
            { data: auditLogsData, error: auditLogsError },
            { data: backupsData, error: backupsError },
            // These will be added back via API routes later
          ] = await Promise.all([
            adminClient.from("organizations").select("*"),
            adminClient.from("profiles").select("*"),
            adminClient.from("superusers").select("*"),
            adminClient.from("checklist_templates").select("id, name, organization_id, is_active").limit(100),
            adminClient
              .from("subscriptions")
              .select(`*, organizations(organization_id, organization_name, logo_url, primary_color, slug)`),
            adminClient.from("payments").select(`*, subscriptions(*, organizations(*))`),
            adminClient.from("feedback").select("*"),
            adminClient.from("submitted_reports").select("*"),
            adminClient.from("daily_checklists").select("id, status"),
            adminClient.from("notifications").select("id, is_read"),
            adminClient.from("holidays").select("id, date"),
            adminClient.from("staff_unavailability").select("id, start_date, end_date"),
            adminClient.from("report_audit_logs").select("id, created_at"),
            adminClient
              .from("report_backups")
              .select("id, created_at"),
            // adminClient.rpc("get_database_size"),
            // adminClient.rpc("get_vercel_bandwidth"),
            // adminClient.rpc("get_resend_emails_sent"),
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
            checklists: { error: checklistsError, count: checklistsData?.length },
            notifications: { error: notificationsError, count: notificationsData?.length },
            holidays: { error: holidaysError, count: holidaysData?.length },
            staffUnavailability: { error: staffUnavailabilityError, count: staffUnavailabilityData?.length },
            auditLogs: { error: auditLogsError, count: auditLogsData?.length },
            backups: { error: backupsError, count: backupsData?.length },
          })

          console.log("[v0] Checklists data:", {
            count: checklistsData?.length || 0,
            error: checklistsError?.message,
            sample: checklistsData?.slice(0, 2),
          })
          console.log("[v0] Templates data:", {
            count: templatesData?.length || 0,
            error: templatesError?.message,
            sample: templatesData?.slice(0, 2),
          })

          // Handle errors gracefully
          if (orgError) {
            console.error("[v0] Organization fetch error:", orgError)
            setError("Failed to load organizations. Please try again later.")
          }
          if (profileError) {
            console.error("[v0] Profile fetch error:", profileError)
            setError("Failed to load user profiles. Please try again later.")
          }
          if (templatesError) console.error("[v0] Templates fetch error:", templatesError)
          if (subscriptionsError) console.error("[v0] Subscriptions fetch error:", subscriptionsError)
          if (paymentsError) console.error("[v0] Payments fetch error:", paymentsError)
          if (feedbackError) console.error("[v0] Feedback fetch error:", feedbackError)
          if (reportsError) console.error("[v0] Reports fetch error:", reportsError)
          if (checklistsError) console.error("[v0] Checklists fetch error:", checklistsError)
          if (notificationsError) console.error("[v0] Notifications fetch error:", notificationsError)
          if (holidaysError) console.error("[v0] Holidays fetch error:", holidaysError)
          if (staffUnavailabilityError)
            console.error("[v0] Staff Unavailability fetch error:", staffUnavailabilityError)
          if (auditLogsError) console.error("[v0] Audit Logs fetch error:", auditLogsError)
          if (backupsError) console.error("[v0] Backups fetch error:", backupsError)

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

          const today = new Date()
          today.setHours(0, 0, 0, 0)
          const oneWeekAgo = new Date(today)
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

          setDatabaseStats({
            checklists: {
              total: checklistsData?.length || 0,
              completed: checklistsData?.filter((c) => c.status === "completed").length || 0,
              pending: checklistsData?.filter((c) => c.status === "pending" || c.status === "in_progress").length || 0,
            },
            templates: {
              total: templatesData?.length || 0,
              active: templatesData?.filter((t) => t.is_active).length || 0,
              inactive: templatesData?.filter((t) => !t.is_active).length || 0,
            },
            notifications: {
              total: notificationsData?.length || 0,
              unread: notificationsData?.filter((n) => !n.is_read).length || 0,
            },
            holidays: {
              total: holidaysData?.length || 0,
              upcoming:
                holidaysData?.filter((h) => {
                  const holidayDate = new Date(h.date)
                  return holidayDate >= today
                }).length || 0,
            },
            staffUnavailability: {
              total: staffUnavailabilityData?.length || 0,
              current:
                staffUnavailabilityData?.filter((s) => {
                  const startDate = new Date(s.start_date)
                  const endDate = new Date(s.end_date)
                  return startDate <= today && endDate >= today
                }).length || 0,
            },
            auditLogs: {
              total: auditLogsData?.length || 0,
              today:
                auditLogsData?.filter((a) => {
                  const logDate = new Date(a.created_at)
                  logDate.setHours(0, 0, 0, 0)
                  return logDate.getTime() === today.getTime()
                }).length || 0,
            },
            backups: {
              total: backupsData?.length || 0,
              thisWeek:
                backupsData?.filter((b) => {
                  const backupDate = new Date(b.created_at)
                  return backupDate >= oneWeekAgo
                }).length || 0,
            },
            // Update server management stats - these will now be fetched via API routes if needed
            totalSize: 0, // Placeholder, as RPC is removed
            totalBandwidth: 0, // Placeholder, as RPC is removed
            sentEmails: 0, // Placeholder, as RPC is removed
          })

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
              // Enrich profile with email_confirmed_at status from auth users
              const confirmedAt = tempAuthUserMap.get(profile.id)?.email_confirmed_at || null
              const lastSignInAt = tempAuthUserMap.get(profile.id)?.last_sign_in_at || null
              const isVerified = tempAuthUserMap.get(profile.id)?.is_email_verified || false // Get verification status
              const enrichedProfile = {
                ...profile,
                email_confirmed_at: confirmedAt,
                last_sign_in_at: lastSignInAt,
                is_email_verified: isVerified,
              }

              if (enrichedProfile.organization_id) {
                const org = organizationMap.get(enrichedProfile.organization_id)
                if (org) {
                  org.profiles.push(enrichedProfile)
                } else {
                  // Create organization from profile data if not in organizations table
                  organizationMap.set(enrichedProfile.organization_id, {
                    organization_id: enrichedProfile.organization_id,
                    organization_name:
                      enrichedProfile.organization_name ||
                      `Organization ${enrichedProfile.organization_id.slice(0, 8)}`,
                    logo_url: null,
                    primary_color: null,
                    secondary_color: null,
                    slug: null,
                    created_at: enrichedProfile.created_at || new Date().toISOString(),
                    updated_at: enrichedProfile.updated_at || new Date().toISOString(),
                    profiles: [enrichedProfile],
                    templateCount:
                      templatesData?.filter((t) => t.organization_id === enrichedProfile.organization_id)?.length || 0,
                  })
                }
              }
            })
          }

          const allOrganizations = Array.from(organizationMap.values())

          // Add report count and subscription tier to organizations
          allOrganizations.forEach((org) => {
            const relatedSubscriptions = allSubscriptions.filter((sub) => sub.organization_id === org.organization_id)
            const activeSubscription = relatedSubscriptions.find((sub) => sub.status === "active")
            org.reportCount =
              reportsData?.filter((report) => report.organization_id === org.organization_id)?.length || 0
            org.subscription_tier = activeSubscription ? activeSubscription.plan_name.toLowerCase() : "starter"
            // Find the latest report email sent for this organization
            const lastSentReport = reportsData
              ?.filter((report) => report.organization_id === org.organization_id)
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
            org.last_report_email_sent = lastSentReport?.created_at // Assuming reports have a created_at field
          })

          setOrganizations(allOrganizations)
          setAllUsers(
            profilesData?.map((profile) => {
              // Ensure allUsers also gets email_confirmed_at and last_sign_in_at
              const confirmedAt = tempAuthUserMap.get(profile.id)?.email_confirmed_at || null
              const lastSignInAt = tempAuthUserMap.get(profile.id)?.last_sign_in_at || null
              const isVerified = tempAuthUserMap.get(profile.id)?.is_email_verified || false // Get verification status
              return {
                ...profile,
                email_confirmed_at: confirmedAt,
                last_sign_in_at: lastSignInAt,
                is_email_verified: isVerified,
              }
            }) || [],
          )

          console.log("[v0] Enhanced data loaded:", {
            organizations: allOrganizations.length,
            users: (
              profilesData?.map((profile) => {
                const confirmedAt = tempAuthUserMap.get(profile.id)?.email_confirmed_at || null
                const lastSignInAt = tempAuthUserMap.get(profile.id)?.last_sign_in_at || null
                const isVerified = tempAuthUserMap.get(profile.id)?.is_email_verified || false // Get verification status
                return {
                  ...profile,
                  email_confirmed_at: confirmedAt,
                  last_sign_in_at: lastSignInAt,
                  is_email_verified: isVerified,
                }
              }) || []
            ).length,
            superusers: superusersData?.length || 0,
            templates: templatesData?.length || 0,
            subscriptions: subscriptionsData?.length || 0,
            payments: paymentsData?.length || 0,
            feedback: feedbackData?.length || 0,
            reports: reportsData?.length || 0,
          })

          const admins = (
            profilesData?.map((profile) => {
              // Ensure admins also get email_confirmed_at and last_sign_in_at
              const confirmedAt = tempAuthUserMap.get(profile.id)?.email_confirmed_at || null
              const lastSignInAt = tempAuthUserMap.get(profile.id)?.last_sign_in_at || null
              const isVerified = tempAuthUserMap.get(profile.id)?.is_email_verified || false // Get verification status
              return {
                ...profile,
                email_confirmed_at: confirmedAt,
                last_sign_in_at: lastSignInAt,
                is_email_verified: isVerified,
              }
            }) || []
          ).filter((user) => user.role === "admin")
          const staff = (
            profilesData?.map((profile) => {
              // Ensure staff also get email_confirmed_at and last_sign_in_at
              const confirmedAt = tempAuthUserMap.get(profile.id)?.email_confirmed_at || null
              const lastSignInAt = tempAuthUserMap.get(profile.id)?.last_sign_in_at || null
              const isVerified = tempAuthUserMap.get(profile.id)?.is_email_verified || false // Get verification status
              return {
                ...profile,
                email_confirmed_at: confirmedAt,
                last_sign_in_at: lastSignInAt,
                is_email_verified: isVerified,
              }
            }) || []
          ).filter((user) => user.role === "staff")

          console.log("[v0] User roles:", { admins: admins.length, staff: staff.length })
          console.log("[v0] Essential data loaded successfully")

          const now = new Date()
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
          const signupsThisMonth = authUsers.filter((user) => {
            const createdAt = new Date(user.created_at)
            return createdAt >= startOfMonth
          })
          setNewSignupsThisMonth(signupsThisMonth.length)

          const totalOrgs = allOrganizations.length // Use the processed organizations list
          const paidOrgs = allSubscriptions.filter(
            (sub) =>
              sub.status === "active" &&
              (sub.plan_name.toLowerCase() === "growth" || sub.plan_name.toLowerCase() === "scale"),
          ).length
          const conversion = totalOrgs > 0 ? ((paidOrgs / totalOrgs) * 100).toFixed(1) : "0.0"
          setConversionRate(Number(conversion))

          // Calculate active trials
          const activeTrialsCount = allSubscriptions.filter(
            (sub) =>
              sub.is_trial && sub.status === "active" && sub.trial_ends_at && new Date(sub.trial_ends_at) > new Date(),
          ).length
          // Assuming 'activeTrials' state is intended for this count
          // You might need to add 'activeTrials' to your useState declarations at the top if it's not already there.
          // Example: const [activeTrials, setActiveTrials] = useState(0);
          // setActiveTrials(activeTrialsCount);
          // For now, let's assume you want to use this in calculations without explicit state if not defined.

          // Fetch database size and related stats via API route
          try {
            const response = await fetch("/api/admin/database-stats")
            const data = await response.json()
            if (!response.ok) {
              throw new Error(data.error || "Failed to fetch database stats")
            }
            setDatabaseSize(data.databaseSize || "0 MB") // Assuming API returns databaseSize
            setDatabaseStats((prevStats) => ({
              ...prevStats,
              totalSize: data.totalSizeBytes || 0,
              totalBandwidth: data.totalBandwidthBytes || 0,
              sentEmails: data.sentEmailsCount || 0,
            }))
          } catch (err: any) {
            console.error("[v0] Error fetching database stats via API:", err.message)
            // Fallback: estimate from record counts if API fails
            const estimatedSizeMB = (allUsers.length * 2 + (organizationsData?.length ?? 0) * 1) / 1024 // Rough estimate in MB
            setDatabaseSize(
              estimatedSizeMB > 1024 ? `${(estimatedSizeMB / 1024).toFixed(2)} GB` : `${estimatedSizeMB.toFixed(2)} MB`,
            )
            // Set placeholders for other stats if API fails
            setDatabaseStats((prevStats) => ({
              ...prevStats,
              totalSize: 0,
              totalBandwidth: 0,
              sentEmails: 0,
            }))
          }

          setIsLoading(false)
        } catch (error) {
          console.error("[v0] Error loading essential data:", error)
          setError("An error occurred while loading dashboard data. Please try refreshing the page.")
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

  const fetchData = () => {
    // Renamed from fetchDashboardData for clarity and to be used in other functions
    setIsLoading(true)
    checkAuthAndLoadData().finally(() => setIsLoading(false))
  }

  useEffect(() => {
    fetchData()

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

  // loginAsUser function removed

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

  const upgradeTierForFree = async (organizationId: string, organizationName: string, newPlan: string) => {
    const confirmed = confirm(
      `Are you sure you want to start a 30-day FREE TRIAL of ${newPlan} for ${organizationName}?\n\n` +
        `They will have access to all premium features during the trial period.`,
    )

    if (!confirmed) return

    setIsProcessing(true)
    try {
      const response = await fetch("/api/master/manage-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upgrade",
          organizationId,
          organizationName,
          planName: newPlan,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to start trial")
      }

      await fetchData() // Use fetchData
      showNotification("success", result.message)
    } catch (error: any) {
      console.error("Error upgrading subscription:", error)
      showNotification("error", error.message || "Failed to start trial")
    } finally {
      setIsProcessing(false)
    }
  }

  const cancelSubscription = async (subscriptionId: string, organizationName: string) => {
    const confirmed = confirm(
      `Are you sure you want to cancel the subscription for ${organizationName}?\n\n` +
        `The subscription will remain active until the end of the current billing period, then downgrade to Starter plan.`,
    )

    if (!confirmed) return

    setIsProcessing(true)
    try {
      const response = await fetch("/api/master/manage-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "cancel",
          subscriptionId,
          organizationName,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to cancel subscription")
      }

      await fetchData() // Use fetchData
      showNotification("success", result.message)
    } catch (error: any) {
      console.error("Error cancelling subscription:", error)
      showNotification("error", error.message || "Failed to cancel subscription")
    } finally {
      setIsProcessing(false)
    }
  }

  const downgradeTierForFree = async (subscriptionId: string, organizationName: string) => {
    const confirmed = confirm(`Are you sure you want to downgrade ${organizationName} to Starter plan?`)

    if (!confirmed) return

    setIsProcessing(true)
    try {
      const response = await fetch("/api/master/manage-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "downgrade",
          subscriptionId,
          organizationName,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to downgrade")
      }

      await fetchData() // Use fetchData
      showNotification("success", result.message)
    } catch (error: any) {
      console.error("Error downgrading subscription:", error)
      showNotification("error", error.message || "Failed to downgrade")
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
      await fetchData() // Use fetchData
      showNotification("success", `${planName} subscription added successfully`)
      setNewSubscriptionPlan("")
    } catch (error) {
      console.error("Error adding subscription:", error)
      showNotification("error", "Failed to add subscription")
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

  const unverifyAndResendEmail = async (userEmail: string) => {
    if (!userEmail) {
      showNotification("error", "Please enter a user email")
      return
    }

    try {
      console.log("[v0] Unverifying and resending verification email for:", userEmail)
      setIsProcessing(true)

      const response = await fetch("/api/admin/unverify-and-resend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userEmail }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        showNotification("error", `Failed to resend verification: ${errorData.error}`)
        return
      }

      const data = await response.json()
      showNotification("success", `Verification email sent to ${userEmail}. User must verify their email.`)

      // Refresh data to show updated status
      fetchData()
    } catch (error) {
      console.error("[v0] Unverify and resend error:", error)
      showNotification("error", "Failed to resend verification email")
    } finally {
      setIsProcessing(false)
    }
  }

  const verifyUserEmail = async (userEmail: string) => {
    if (!userEmail) {
      showNotification("error", "Please enter a user email")
      return
    }

    try {
      console.log("[v0] Manually verifying email for:", userEmail)
      setIsProcessing(true)

      const response = await fetch("/api/admin/verify-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userEmail }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        showNotification("error", `Failed to verify email: ${errorData.error}`)
        return
      }

      const data = await response.json()
      showNotification("success", `Email manually verified for ${userEmail}`)

      // Refresh data to show updated status
      fetchData()
    } catch (error) {
      console.error("[v0] Manual verification error:", error)
      showNotification("error", "Failed to verify email")
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
      await fetchData() // Use fetchData
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
      showNotification("error", "Please enter a user email")
      return
    }

    try {
      console.log("[v0] Starting password reset for:", userEmail)

      const response = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userEmail }),
      })

      if (!response.ok) {
        let errorMessage = "Failed to send reset email"
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch {
          // If response is not JSON, use status text
          errorMessage = `Server error: ${response.statusText}`
        }
        showNotification("error", errorMessage)
        return
      }

      const data = await response.json()
      showNotification("success", `Password reset email sent to ${userEmail}`)
    } catch (error) {
      console.error("[v0] Password reset error:", error)
      showNotification("error", "Failed to send reset email. Please check if the database is properly configured.")
    }
  }

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    const confirmed = confirm(
      `⚠️ GDPR DELETION WARNING ⚠️\n\n` +
        `Delete user: ${userEmail}?\n\n` +
        `This will permanently delete:\n` +
        `• User account and profile\n` +
        `• All activity logs\n` +
        `• All notifications\n` +
        `• All checklist responses\n` +
        `• All assigned templates\n` +
        `• Organization data (if last member)\n\n` +
        `This action CANNOT be undone and complies with GDPR right to erasure.\n\n` +
        `Type the user's email in the next prompt to confirm.`,
    )

    if (!confirmed) return

    const emailConfirm = prompt(`Type "${userEmail}" to confirm deletion:`)

    if (emailConfirm !== userEmail) {
      showNotification("error", "Email confirmation did not match. Deletion cancelled.")
      return
    }

    setIsProcessing(true)

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
        showNotification("error", `Failed to delete user: ${data.error}`)
        return
      }

      // Refresh data
      await fetchData() // Use fetchData
      showNotification("success", `User ${userEmail} and all associated data deleted successfully (GDPR compliant)`)
    } catch (error) {
      console.error("[v0] Error deleting user:", error)
      showNotification("error", "Failed to delete user")
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
      await fetchData() // Use fetchData
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
      await fetchData() // Use fetchData
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
      await fetchData() // Use fetchData
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

  // Added refreshServerStats function
  const refreshServerStats = async () => {
    setIsRefreshingServerStats(true)
    setLastRefreshed(null)
    try {
      console.log("[v0] Refreshing server stats...")
      const response = await fetch("/api/admin/database-stats")
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch server stats")
      }

      setDatabaseSize(data.databaseSize || "0 MB")
      setDatabaseStats((prevStats) => ({
        ...prevStats,
        totalSize: data.totalSizeBytes || 0,
        totalBandwidth: data.totalBandwidthBytes || 0,
        sentEmails: data.sentEmailsCount || 0,
      }))
      const now = new Date()
      setLastRefreshed(`${now.getHours()}:${now.getMinutes().toString().padStart(2, "0")}`)
      showNotification("success", "Server stats refreshed successfully.")
    } catch (err: any) {
      console.error("[v0] Error refreshing server stats:", err.message)
      showNotification("error", `Failed to refresh server stats: ${err.message}`)
      setDatabaseSize("N/A")
      setDatabaseStats((prevStats) => ({
        ...prevStats,
        totalSize: 0,
        totalBandwidth: 0,
        sentEmails: 0,
      }))
    } finally {
      setIsRefreshingServerStats(false)
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

  // Display error message if data loading failed
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8 bg-white rounded-lg shadow-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-3">Dashboard Loading Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
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
                  <Button onClick={refreshServerStats} disabled={isRefreshingServerStats} variant="outline" size="sm">
                    <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshingServerStats ? "animate-spin" : ""}`} />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Supabase Usage */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Supabase Database</span>
                      <span className="text-xs text-gray-500">500MB limit</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">
                          Storage: {(databaseStats.totalSize / 1024 / 1024 || 0).toFixed(2)} MB
                        </span>
                        <span
                          className={`font-medium ${(databaseStats.totalSize / 1024 / 1024) > 400 ? "text-red-600" : databaseStats.totalSize / 1024 / 1024 > 250 ? "text-orange-600" : "text-green-600"}`}
                        >
                          {((databaseStats.totalSize / 1024 / 1024 / 500) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${(databaseStats.totalSize / 1024 / 1024) > 400 ? "bg-red-500" : databaseStats.totalSize / 1024 / 1024 > 250 ? "bg-orange-500" : "bg-green-500"}`}
                          style={{ width: `${Math.min((databaseStats.totalSize / 1024 / 1024 / 500) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Resend Email Usage */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Resend Emails</span>
                      <span className="text-xs text-gray-500">3,000/month limit</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">Sent this month: ~{Math.round(allUsers.length * 2.5)}</span>
                        <span
                          className={`font-medium ${(allUsers.length * 2.5) > 2500 ? "text-red-600" : allUsers.length * 2.5 > 1500 ? "text-orange-600" : "text-green-600"}`}
                        >
                          {(((allUsers.length * 2.5) / 3000) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${(allUsers.length * 2.5) > 2500 ? "bg-red-500" : allUsers.length * 2.5 > 1500 ? "bg-orange-500" : "bg-green-500"}`}
                          style={{ width: `${Math.min(((allUsers.length * 2.5) / 3000) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Vercel Bandwidth */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Vercel Bandwidth</span>
                      <span className="text-xs text-gray-500">100GB/month limit</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">
                          Estimated: {((totalSubmittedReports * 0.3) / 1024).toFixed(2)} GB
                        </span>
                        <span
                          className={`font-medium ${(totalSubmittedReports * 0.3) / 1024 > 80 ? "text-red-600" : (totalSubmittedReports * 0.3) / 1024 > 50 ? "text-orange-600" : "text-green-600"}`}
                        >
                          {(((totalSubmittedReports * 0.3) / 1024 / 100) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${(totalSubmittedReports * 0.3) / 1024 > 80 ? "bg-red-500" : (totalSubmittedReports * 0.3) / 1024 > 50 ? "bg-orange-500" : "bg-green-500"}`}
                          style={{
                            width: `${Math.min(((totalSubmittedReports * 0.3) / 1024 / 100) * 100, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status Summary */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium mb-2">Status Summary:</p>
                  <p className="text-sm text-gray-600">
                    {databaseStats.totalSize / 1024 / 1024 > 400 ||
                    allUsers.length * 2.5 > 2500 ||
                    (totalSubmittedReports * 0.3) / 1024 > 80
                      ? "⚠️ Warning: Approaching free tier limits. Consider upgrading soon."
                      : databaseStats.totalSize / 1024 / 1024 > 250 ||
                          allUsers.length * 2.5 > 1500 ||
                          (totalSubmittedReports * 0.3) / 1024 > 50
                        ? "🟡 Moderate usage. Monitor regularly."
                        : "✅ All systems within safe limits. Database activity prevents auto-pause."}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Top Metrics Row */}
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

            {/* Second Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">New Signups This Month</CardTitle>
                  <UserPlus className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{newSignupsThisMonth}</div>
                  <p className="text-xs text-muted-foreground">
                    {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Conversion to Paid</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{conversionRate}%</div>
                  <p className="text-xs text-muted-foreground">From starter to paid plans</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Trials</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {
                      allSubscriptions.filter(
                        (sub) =>
                          sub.is_trial &&
                          sub.status === "active" &&
                          sub.trial_ends_at &&
                          new Date(sub.trial_ends_at) > new Date(),
                      ).length
                    }
                  </div>
                  <p className="text-xs text-muted-foreground">Users in trial period</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalSubmittedReports || 0}</div>
                  <p className="text-xs text-muted-foreground">Reports processed system-wide</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Templates</CardTitle>
                  <Layout className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{databaseStats.templates.total || 0}</div>
                  <p className="text-xs text-muted-foreground">Active templates in system</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Checklists</CardTitle>
                  <CheckSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{databaseStats.checklists.total || 0}</div>
                  <p className="text-xs text-muted-foreground">Active checklists created</p>
                </CardContent>
              </Card>
            </div>

            {/* Checklists & Templates */}
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
                  <div className="overflow-x-auto">
                    <Table className="min-w-full divide-y divide-gray-200">
                      <TableHeader className="bg-gray-50">
                        <TableRow>
                          {/* <TableHead>Name</TableHead> */}
                          <TableHead className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                            Name
                          </TableHead>
                          <TableHead className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                            Email
                          </TableHead>
                          {/* Removed Organization column header */}
                          <TableHead className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                            Verification
                          </TableHead>
                          <TableHead className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                            Role
                          </TableHead>
                          <TableHead className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                            Organization
                          </TableHead>
                          <TableHead className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                            Last Seen
                          </TableHead>
                          <TableHead className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="bg-white divide-y divide-gray-200">
                        {filteredUsersNew.map((user) => {
                          const authUser = authUserMap.get(user.id)
                          const lastSignIn = authUser?.last_sign_in_at
                            ? new Date(authUser.last_sign_in_at).toLocaleString()
                            : "Never"

                          return (
                            <TableRow key={user.id}>
                              <TableCell className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                                {user.full_name || "N/A"}
                              </TableCell>
                              <TableCell className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                                {user.email}
                              </TableCell>
                              <TableCell className="px-3 py-2 text-left text-xs whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  {user.is_email_verified ? (
                                    <Badge
                                      variant="outline"
                                      className="text-green-600 border-green-200 bg-green-50 text-xs"
                                    >
                                      Verified
                                    </Badge>
                                  ) : (
                                    <Badge
                                      variant="outline"
                                      className="text-orange-600 border-orange-200 bg-orange-50 text-xs"
                                    >
                                      Unverified
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 capitalize">
                                {user.role}
                              </TableCell>
                              {/* Removed Organization column data cell */}
                              <TableCell className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                                {user.organizations?.name || "N/A"}
                              </TableCell>
                              <TableCell className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                                {lastSignIn}
                              </TableCell>
                              <TableCell className="px-3 py-2 text-left text-xs flex gap-1">
                                <Link
                                  href={`/auth/login?email=${encodeURIComponent(user.email)}&impersonate=true`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-blue-200 bg-background hover:bg-blue-50 text-blue-600 h-8 px-2 py-1"
                                >
                                  <LogIn className="w-3 h-3 mr-1" />
                                  Login
                                </Link>
                                {user.is_email_verified ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => unverifyAndResendEmail(user.email)}
                                    className="text-orange-600 border-orange-200 hover:bg-orange-50 text-xs px-2 py-1"
                                    disabled={isProcessing}
                                  >
                                    <Mail className="w-3 h-3 mr-1" />
                                    Resend Verification
                                  </Button>
                                ) : (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => verifyUserEmail(user.email)}
                                      className="text-green-600 border-green-200 hover:bg-green-50 text-xs px-2 py-1"
                                      disabled={isProcessing}
                                    >
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                      Verify Manually
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => unverifyAndResendEmail(user.email)}
                                      className="text-purple-600 border-purple-200 hover:bg-purple-50 text-xs px-2 py-1"
                                      disabled={isProcessing}
                                    >
                                      <Mail className="w-3 h-3 mr-1" />
                                      Resend Email
                                    </Button>
                                  </>
                                )}
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
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
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
                      <p className="text-xs text-gray-500 mt-1">All orgs (with or without subs)</p>
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
                            {(() => {
                              const subscription = allSubscriptions.find(
                                (sub) => sub.organization_id === org.organization_id,
                              )
                              const planName = subscription?.plan_name || "starter"
                              const isActive = subscription?.status === "active"
                              const isTrial = subscription?.is_trial || false

                              return (
                                <div className="flex items-center gap-2">
                                  <Badge
                                    variant={
                                      planName === "starter"
                                        ? "secondary"
                                        : planName === "growth"
                                          ? "default"
                                          : "default"
                                    }
                                    className={
                                      planName === "scale"
                                        ? "bg-purple-100 text-purple-700 border-purple-200"
                                        : planName === "growth"
                                          ? "bg-blue-100 text-blue-700 border-blue-200"
                                          : ""
                                    }
                                  >
                                    <CreditCard className="w-3 h-3 mr-1" />
                                    {planName === "starter" && "Free Starter"}
                                    {planName === "growth" && "Growth Plan"}
                                    {planName === "scale" && "Scale Plan"}
                                  </Badge>
                                  {isTrial && (
                                    <Badge variant="outline" className="bg-yellow-50 border-yellow-200 text-yellow-700">
                                      Trial
                                    </Badge>
                                  )}
                                  {!isActive && subscription && (
                                    <Badge variant="outline" className="bg-red-50 border-red-200 text-red-700">
                                      Inactive
                                    </Badge>
                                  )}
                                </div>
                              )
                            })()}
                            {/* </CHANGE> */}
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

                        {(() => {
                          const subscription = allSubscriptions.find(
                            (sub) => sub.organization_id === org.organization_id,
                          )
                          if (subscription) {
                            const isTrial = subscription.is_trial || false
                            const trialEndsAt = subscription.trial_ends_at ? new Date(subscription.trial_ends_at) : null
                            let daysRemaining = 0
                            if (isTrial && trialEndsAt) {
                              const now = new Date()
                              const diffTime = trialEndsAt.getTime() - now.getTime()
                              daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                            }

                            return (
                              <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="flex items-center gap-2 mb-2">
                                  <CreditCard className="w-4 h-4 text-gray-600" />
                                  <h4 className="font-semibold text-gray-900">Subscription Details</h4>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                  <div>
                                    <p className="text-gray-500">Plan</p>
                                    <p className="font-medium text-gray-900">
                                      {subscription.plan_name === "starter" && "Free Starter"}
                                      {subscription.plan_name === "growth" && "Growth"}
                                      {subscription.plan_name === "scale" && "Scale"}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-gray-500">Status</p>
                                    <p className="font-medium text-gray-900">
                                      {subscription.status === "active" ? "Active" : "Inactive"}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-gray-500">Billing Period</p>
                                    <p className="font-medium text-gray-900">
                                      {new Date(subscription.current_period_start).toLocaleDateString()} -{" "}
                                      {new Date(subscription.current_period_end).toLocaleDateString()}
                                    </p>
                                  </div>
                                  {isTrial && (
                                    <div>
                                      <p className="text-gray-500">Trial Status</p>
                                      <p className="font-medium text-yellow-700">
                                        {daysRemaining > 0 ? `${daysRemaining} days remaining` : "Expired"}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          }
                          return null
                        })()}
                        {/* </CHANGE> */}

                        {/* Organization Members Hierarchy */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Admins Section */}
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                              <Shield className="w-5 h-5 text-green-600" />
                              <h4 className="font-semibold text-gray-900">Admins & Managers</h4>
                              <Badge variant="secondary" className="text-xs">
                                {org.profiles?.filter((p) => p.role === "admin" || p.role === "manager").length || 0}
                              </Badge>
                            </div>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {org.profiles?.filter((p) => p.role === "admin" || p.role === "manager").length > 0 ? (
                                org.profiles
                                  .filter((p) => p.role === "admin" || p.role === "manager")
                                  .map((admin) => (
                                    <div
                                      key={admin.id}
                                      className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-100"
                                    >
                                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                        <Shield className="w-4 h-4 text-green-600" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-900 truncate flex items-center gap-2">
                                          {admin.full_name}
                                          <Badge
                                            variant={admin.role === "admin" ? "default" : "secondary"}
                                            className="text-xs"
                                          >
                                            {admin.role === "admin" ? "Admin" : "Manager"}
                                          </Badge>
                                        </p>
                                        <p className="text-sm text-gray-500 truncate">{admin.email}</p>
                                      </div>

                                      <select
                                        value={admin.role}
                                        onChange={async (e) => {
                                          const newRole = e.target.value

                                          const adminCount = org.profiles?.filter((p) => p.role === "admin").length || 0

                                          if (admin.role === "admin" && newRole !== "admin" && adminCount === 1) {
                                            alert(
                                              "Cannot change the only admin's role. Promote another user to admin first.",
                                            )
                                            e.target.value = admin.role // Reset the dropdown
                                            return
                                          }

                                          if (
                                            confirm(
                                              `Change ${admin.full_name}'s role to ${newRole}? ${
                                                newRole === "staff"
                                                  ? "They will lose admin/manager privileges."
                                                  : newRole === "admin"
                                                    ? "They will have full admin access including removing other admins."
                                                    : "They will have admin-level access but cannot remove admins."
                                              }`,
                                            )
                                          ) {
                                            try {
                                              const response = await fetch("/api/master/change-role", {
                                                method: "POST",
                                                headers: { "Content-Type": "application/json" },
                                                body: JSON.stringify({
                                                  profileId: admin.id,
                                                  newRole,
                                                  organizationId: org.organization_id,
                                                }),
                                              })
                                              const data = await response.json()
                                              if (!response.ok) {
                                                alert(data.error || "Failed to change role")
                                                e.target.value = admin.role // Reset the dropdown
                                              } else {
                                                alert(data.message)
                                                fetchData() // Use fetchData
                                              }
                                            } catch (error) {
                                              console.error("Error changing role:", error)
                                              alert("Failed to change role")
                                              e.target.value = admin.role // Reset the dropdown
                                            }
                                          } else {
                                            e.target.value = admin.role // Reset if cancelled
                                          }
                                        }}
                                        className="text-xs border rounded px-2 py-1 bg-white"
                                        disabled={
                                          admin.role === "admin" &&
                                          (org.profiles?.filter((p) => p.role === "admin").length || 0) === 1
                                        }
                                      >
                                        <option value="admin">Admin</option>
                                        <option value="manager">Manager</option>
                                        <option value="staff">Staff</option>
                                      </select>
                                    </div>
                                  ))
                              ) : (
                                <div className="text-center py-4 text-gray-500">
                                  <Shield className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                  <p className="text-sm">No administrators or managers</p>
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
                                            if (confirm(`Promote ${staff.full_name} to manager?`)) {
                                              fetch("/api/master/change-role", {
                                                method: "POST",
                                                headers: { "Content-Type": "application/json" },
                                                body: JSON.stringify({
                                                  profileId: staff.id,
                                                  newRole: "manager",
                                                  organizationId: org.organization_id,
                                                }),
                                              })
                                                .then((res) => res.json())
                                                .then((data) => {
                                                  if (data.success) {
                                                    alert(data.message)
                                                    fetchData() // Use fetchData
                                                  } else {
                                                    alert(data.error)
                                                  }
                                                })
                                                .catch((error) => {
                                                  console.error("Error promoting staff:", error)
                                                  alert("Failed to promote staff")
                                                })
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
                              Admins/Managers:{" "}
                              {org.profiles?.filter((p) => p.role === "admin" || p.role === "manager").length || 0} |
                              Staff: {org.profiles?.filter((p) => p.role === "staff").length || 0}
                            </span>
                          </div>

                          <div className="mt-4 pt-4 border-t border-gray-100">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-gray-700">Report Management</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  Reports: {org.reportCount || 0} (last 90 days) • Retention:{" "}
                                  {org.subscription_tier === "starter" ? "30" : "90"} days
                                </p>
                                {org.last_report_email_sent && (
                                  <p className="text-xs text-blue-600 mt-1">
                                    Last emailed: {new Date(org.last_report_email_sent).toLocaleDateString()}{" "}
                                    {new Date(org.last_report_email_sent).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </p>
                                )}
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  if (
                                    !confirm(
                                      `Send report summary email to all admins/managers of ${org.organization_name}?\n\nThis will email ${org.profiles?.filter((p) => p.role === "admin" || p.role === "manager").length} recipients with ${org.reportCount || 0} reports from the last 90 days.`,
                                    )
                                  ) {
                                    return
                                  }

                                  setIsProcessing(true)
                                  try {
                                    const response = await fetch("/api/master/email-org-reports", {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ organizationId: org.organization_id }),
                                    })

                                    const data = await response.json()

                                    if (response.ok) {
                                      alert(
                                        `✓ Success!\n\n${data.message}\nReports: ${data.reportCount}\nEmails sent: ${data.emailsSent}`,
                                      )
                                      fetchData() // Use fetchData
                                    } else {
                                      alert(`Error: ${data.error}`)
                                    }
                                  } catch (error) {
                                    console.error("[v0] Error sending reports:", error)
                                    alert("Failed to send report emails. Please try again.")
                                  } finally {
                                    setIsProcessing(false)
                                  }
                                }}
                                disabled={isProcessing || (org.reportCount || 0) === 0}
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              >
                                <Mail className="w-4 h-4 mr-1" />
                                Email Reports ({org.reportCount || 0})
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="feedback" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>User Feedback & Support Requests</CardTitle>
                <CardDescription>View and respond to feedback submitted by users across the platform</CardDescription>
              </CardHeader>
              <CardContent>
                {feedback.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Feedback Yet</h3>
                    <p className="text-gray-500">User feedback and support requests will appear here once submitted.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {feedback.map((item) => (
                      <div
                        key={item.id}
                        className={`border rounded-lg p-4 ${
                          item.status === "unread" ? "bg-blue-50 border-blue-200" : "bg-white"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-lg">{item.subject}</h3>
                              <Badge variant={item.status === "unread" ? "default" : "secondary"}>{item.status}</Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <span className="flex items-center gap-1">
                                <User className="w-4 h-4" />
                                {item.name}
                              </span>
                              <span className="flex items-center gap-1">
                                <Mail className="w-4 h-4" />
                                {item.email}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {new Date(item.created_at).toLocaleDateString("en-GB", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                            {item.page_url && <p className="text-xs text-gray-500 mt-1">From: {item.page_url}</p>}
                          </div>
                        </div>

                        <div className="bg-gray-50 rounded p-3 mb-3">
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{item.message}</p>
                        </div>

                        {item.attachments && item.attachments.length > 0 && (
                          <div className="mb-3">
                            <p className="text-sm font-medium text-gray-700 mb-2">Attachments:</p>
                            <div className="flex flex-wrap gap-2">
                              {item.attachments.map((attachment: any, index: number) => (
                                <Badge key={index} variant="outline">
                                  {attachment.name || `Attachment ${index + 1}`}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="default" onClick={() => openResponseModal(item)}>
                            <Mail className="w-4 h-4 mr-1" />
                            Reply
                          </Button>
                          {item.status === "unread" && (
                            <Button size="sm" variant="outline" onClick={() => markFeedbackAsRead(item.id)}>
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Mark as Read
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              if (confirm("Are you sure you want to delete this feedback?")) {
                                deleteFeedback(item.id)
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subscriptions" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Organizations</p>
                      <p className="text-2xl font-bold">{organizations.length}</p>
                      <p className="text-xs text-gray-500 mt-1">All orgs (with or without subs)</p>
                    </div>
                    <CreditCard className="w-8 h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Free Plans (Starter)</p>
                      <p className="text-2xl font-bold">
                        {
                          organizations.filter(
                            (org) =>
                              !allSubscriptions.find((sub) => sub.organization_id === org.organization_id) ||
                              allSubscriptions.find(
                                (sub) =>
                                  sub.organization_id === org.organization_id &&
                                  sub.plan_name?.toLowerCase() === "starter",
                              ),
                          ).length
                        }
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Default plan</p>
                    </div>
                    <Users className="w-8 h-8 text-gray-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Growth Plans</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {
                          allSubscriptions.filter(
                            (sub) => sub.plan_name?.toLowerCase() === "growth" && sub.status === "active",
                          ).length
                        }
                      </p>
                      <p className="text-xs text-gray-500 mt-1">£9/month</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Scale Plans</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {
                          allSubscriptions.filter(
                            (sub) => sub.plan_name?.toLowerCase() === "scale" && sub.status === "active",
                          ).length
                        }
                      </p>
                      <p className="text-xs text-gray-500 mt-1">£16/month</p>
                    </div>
                    <DollarSign className="w-8 h-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Subscription Management</CardTitle>
                <CardDescription>
                  Search and manage subscriptions for all organizations. All organizations start on Starter plan by
                  default.
                </CardDescription>
                <div className="mt-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search organizations by name..."
                      value={subscriptionSearchTerm}
                      onChange={(e) => setSubscriptionSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Organization</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Trial Status</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {organizations
                        .filter((org) =>
                          org.organization_name.toLowerCase().includes(subscriptionSearchTerm.toLowerCase()),
                        )
                        .map((org) => {
                          const subscription = allSubscriptions.find(
                            (sub) => sub.organization_id === org.organization_id,
                          )
                          const currentPlan = subscription?.plan_name || "starter"
                          const isActive = subscription?.status === "active"
                          const isTrial = subscription?.is_trial || false
                          const trialEndsAt = subscription?.trial_ends_at ? new Date(subscription.trial_ends_at) : null

                          // Calculate days remaining for trial
                          let daysRemaining = 0
                          if (isTrial && trialEndsAt) {
                            const now = new Date()
                            const diffTime = trialEndsAt.getTime() - now.getTime()
                            daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                          }

                          return (
                            <TableRow key={org.organization_id}>
                              <TableCell className="font-medium">{org.organization_name}</TableCell>
                              <TableCell>
                                <Badge variant={currentPlan === "starter" ? "secondary" : "default"}>
                                  {currentPlan === "starter" && "Free Starter"}
                                  {currentPlan === "growth" && "Growth"}
                                  {currentPlan === "scale" && "Scale"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant={isActive ? "default" : "secondary"}>
                                  {isActive ? "Active" : "Inactive"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {isTrial ? (
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="bg-yellow-50 border-yellow-200 text-yellow-700">
                                      Free Trial
                                    </Badge>
                                    <span className="text-sm text-muted-foreground">
                                      {daysRemaining > 0 ? `${daysRemaining} days left` : "Expired"}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-sm text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {subscription ? (
                                  <>
                                    {new Date(subscription.current_period_start).toLocaleDateString()} -{" "}
                                    {new Date(subscription.current_period_end).toLocaleDateString()}
                                  </>
                                ) : (
                                  "-"
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  {currentPlan === "starter" && (
                                    <>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                          upgradeTierForFree(org.organization_id, org.organization_name, "Growth")
                                        }
                                        disabled={isProcessing}
                                      >
                                        <ArrowUp className="w-4 h-4 mr-1" />
                                        Start Growth Trial
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                          upgradeTierForFree(org.organization_id, org.organization_name, "Scale")
                                        }
                                        disabled={isProcessing}
                                      >
                                        <Crown className="w-4 h-4 mr-1" />
                                        Start Scale Trial
                                      </Button>
                                    </>
                                  )}
                                  {currentPlan === "growth" && (
                                    <>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                          upgradeTierForFree(org.organization_id, org.organization_name, "Scale")
                                        }
                                        disabled={isProcessing}
                                      >
                                        <ArrowUp className="w-4 h-4 mr-1" />
                                        {isTrial ? "Start Scale Trial" : "Upgrade to Scale"}
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => downgradeTierForFree(subscription.id, org.organization_name)}
                                        disabled={isProcessing}
                                      >
                                        <ArrowDown className="w-4 h-4 mr-1" />
                                        Downgrade to Starter
                                      </Button>
                                    </>
                                  )}
                                  {currentPlan === "scale" && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => downgradeTierForFree(subscription.id, org.organization_name)}
                                      disabled={isProcessing}
                                    >
                                      <ArrowDown className="w-4 h-4 mr-1" />
                                      Downgrade to Starter
                                    </Button>
                                  )}
                                  {subscription && subscription.status === "active" && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => cancelSubscription(subscription.id, org.organization_name)}
                                      disabled={isProcessing}
                                    >
                                      <X className="w-4 h-4 mr-1" />
                                      Cancel
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                    </TableBody>
                  </Table>
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
            <p className="text-xs text-amber-600 mb-4 flex items-start gap-2">
              <span>⚠️</span>
              <span>
                <strong>Important:</strong> Right-click "Open in Incognito" and select "Open in Incognito Window"
                (Chrome) or "Open in Private Window" (Firefox/Safari) to avoid session conflicts with your current admin
                session.
              </span>
            </p>
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
                Open in Incognito (Right-Click)
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
