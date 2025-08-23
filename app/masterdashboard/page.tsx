"use client"

import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
} from "lucide-react"
import { useEffect, useState } from "react"

interface Organization {
  id: string
  name: string
  logo_url: string | null
  created_at: string
  profiles?: { count: number }[]
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

export default function MasterDashboardPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [allUsers, setAllUsers] = useState<UserProfile[]>([])
  const [allSubscriptions, setAllSubscriptions] = useState<Subscription[]>([])
  const [allPayments, setAllPayments] = useState<Payment[]>([])

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

  const loginAsUser = async (userEmail: string) => {
    if (!userEmail.trim()) {
      alert("Please enter a valid email address")
      return
    }

    // Store the target user email in sessionStorage for the auth page
    sessionStorage.setItem("masterAdminTarget", userEmail.trim())

    // Redirect to auth/login page
    window.location.href = `/auth/login?email=${encodeURIComponent(userEmail.trim())}`
  }

  const exitImpersonation = () => {
    setImpersonatedUser(null)
    setImpersonatedUserData(null)
    setActiveTab("overview")
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
    const isAuthenticated = localStorage.getItem("masterAdminAuth")
    const adminEmail = localStorage.getItem("masterAdminEmail")

    if (!isAuthenticated || adminEmail !== "arsami.uk@gmail.com") {
      router.push("/masterlogin")
      return
    }

    const supabase = createClient()

    try {
      const [orgsResponse, usersResponse, subscriptionsResponse, paymentsResponse] = await Promise.all([
        supabase.from("organizations").select(`
          *,
          profiles(count),
          subscriptions(*)
        `),
        supabase
          .from("profiles")
          .select(`
          *,
          organizations(name, logo_url)
        `)
          .order("created_at", { ascending: false }),
        supabase
          .from("subscriptions")
          .select(`
          *,
          organizations(name, logo_url)
        `)
          .order("created_at", { ascending: false }),
        supabase
          .from("payments")
          .select(`
          *,
          subscriptions(
            plan_name,
            organizations(name)
          )
        `)
          .order("created_at", { ascending: false }),
      ])

      setOrganizations(orgsResponse.data || [])
      setAllUsers(usersResponse.data || [])
      setAllSubscriptions(subscriptionsResponse.data || [])
      setAllPayments(paymentsResponse.data || [])
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    checkAuthAndLoadData()
  }, [router])

  const handleSignOut = async () => {
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

  const filteredUsers = allUsers.filter(
    (user) =>
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.organizations?.name.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const filteredOrganizations = organizations.filter((org) => org.name.toLowerCase().includes(searchTerm.toLowerCase()))

  const filteredUsersNew = allUsers.filter(
    (user) =>
      user.email.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      user.organizations?.name.toLowerCase().includes(userSearchTerm.toLowerCase()),
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">MyDayLogs Master Dashboard</h1>
              <p className="text-sm text-gray-500">System monitoring and customer support</p>
            </div>
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
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="organizations">Organizations</TabsTrigger>
            <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="login-as">Password Reset</TabsTrigger>
            <TabsTrigger value="tools">Admin Tools</TabsTrigger>
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
                  <CardTitle className="text-sm font-medium">Organizations</CardTitle>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{organizations.length}</div>
                  <p className="text-xs text-muted-foreground">Active organizations</p>
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
                <CardTitle>Organizations</CardTitle>
                <CardDescription>All registered organizations and their details</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {organizations.map((org) => (
                    <div key={org.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {org.logo_url ? (
                          <img
                            src={org.logo_url || "/placeholder.svg"}
                            alt={org.name}
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-gray-500" />
                          </div>
                        )}
                        <div>
                          <h3 className="font-medium">{org.name}</h3>
                          <p className="text-sm text-gray-500">
                            {org.profiles?.[0]?.count || 0} users • Created{" "}
                            {new Date(org.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {org.subscriptions?.[0] ? (
                          <Badge variant={org.subscriptions[0].status === "active" ? "default" : "secondary"}>
                            {org.subscriptions[0].plan_name} - {org.subscriptions[0].status}
                          </Badge>
                        ) : (
                          <Badge variant="outline">Free</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

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
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">User Management</h2>
                  <p className="text-gray-600">Manage all users across organizations</p>
                </div>
                <div className="flex items-center gap-4">
                  <Input
                    placeholder="Search users..."
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    className="w-64"
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
                      <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-medium">{user.full_name || user.email}</h3>
                            <p className="text-sm text-gray-500">{user.email}</p>
                            <p className="text-xs text-gray-400">
                              {user.role} • {user.organizations?.name || "No Organization"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => loginAsUser(user.email)}
                            className="text-blue-600 border-blue-200 hover:bg-blue-50"
                          >
                            <LogIn className="w-4 h-4 mr-1" />
                            Login
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => resetUserPassword(user.email)}
                            className="text-orange-600 border-orange-200 hover:bg-orange-50"
                          >
                            <Key className="w-4 h-4 mr-1" />
                            Reset Password
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteUser(user.id, user.email)}
                            className="text-red-600 border-red-200 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
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
            <Card>
              <CardHeader>
                <CardTitle>Organization Management</CardTitle>
                <CardDescription>Manage all organizations and their subscriptions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredOrganizations.map((org) => (
                    <div key={org.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {org.logo_url ? (
                          <img
                            src={org.logo_url || "/placeholder.svg"}
                            alt={org.name}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                            <Building2 className="w-6 h-6 text-gray-500" />
                          </div>
                        )}
                        <div>
                          <h3 className="font-medium text-lg">{org.name}</h3>
                          <p className="text-sm text-gray-500">
                            {org.profiles?.[0]?.count || 0} users • Created{" "}
                            {new Date(org.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {org.subscriptions?.[0] ? (
                          <Badge variant={org.subscriptions[0].status === "active" ? "default" : "secondary"}>
                            {org.subscriptions[0].plan_name} - {org.subscriptions[0].status}
                          </Badge>
                        ) : (
                          <Badge variant="outline">Free</Badge>
                        )}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Plus className="w-4 h-4 mr-1" />
                              Add Subscription
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Add Subscription</DialogTitle>
                              <DialogDescription>Add a new subscription for {org.name}</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="planSelect">Subscription Plan</Label>
                                <Select value={newSubscriptionPlan} onValueChange={setNewSubscriptionPlan}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a plan" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Base">Base Plan</SelectItem>
                                    <SelectItem value="Pro">Pro Plan</SelectItem>
                                    <SelectItem value="Enterprise">Enterprise Plan</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <DialogFooter>
                              <Button
                                onClick={() => addSubscription(org.id, newSubscriptionPlan)}
                                disabled={!newSubscriptionPlan || isProcessing}
                              >
                                {isProcessing ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null}
                                Add Subscription
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  ))}
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

          <TabsContent value="login-as" className="space-y-6">
            <div className="space-y-6">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <AlertTriangle className="w-6 h-6 text-orange-600" />
                  <h2 className="text-xl font-semibold text-orange-800">Password Reset Tool</h2>
                </div>
                <p className="text-orange-700 mb-4">
                  For security and data protection compliance, we've replaced the "Login As" feature with a secure
                  password reset tool. This approach maintains GDPR/CCPA compliance while allowing you to help users
                  access their accounts.
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
            </div>
          </TabsContent>

          <TabsContent value="tools" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Administrative Tools</CardTitle>
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
        </Tabs>
      </div>
    </div>
  )
}
