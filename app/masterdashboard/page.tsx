"use client"

import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Users, Building2, TrendingUp, CheckCircle } from "lucide-react"
import { useEffect, useState } from "react"

interface Organization {
  id: string
  name: string
  logo_url: string | null
  created_at: string
  profiles?: { count: number }[]
  subscriptions?: { plan_name: string; status: string }[]
}

interface User {
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
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [allSubscriptions, setAllSubscriptions] = useState<Subscription[]>([])
  const [allPayments, setAllPayments] = useState<Payment[]>([])

  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      const supabase = createClient()

      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()
      if (error || !user || user.email !== "coolsami_uk@yahoo.com") {
        router.push("/masterlogin")
        return
      }

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

    checkAuthAndLoadData()
  }, [router])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/masterlogin")
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Users className="w-5 h-5 text-white" />
          </div>
          <p className="text-gray-600">Loading master dashboard...</p>
        </div>
      </div>
    )
  }

  const totalUsers = allUsers.length
  const totalOrganizations = organizations.length
  const activeSubscriptions = allSubscriptions.filter((sub) => sub.status === "active").length
  const totalRevenue = allPayments
    .filter((payment) => payment.status === "completed")
    .reduce((sum, payment) => sum + Number.parseFloat(payment.amount), 0)

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalUsers}</div>
              <p className="text-xs text-muted-foreground">Across all organizations</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Organizations</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalOrganizations}</div>
              <p className="text-xs text-muted-foreground">Active organizations</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeSubscriptions}</div>
              <p className="text-xs text-muted-foreground">Currently active</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">£{totalRevenue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Completed payments</p>
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
                        {org.profiles?.[0]?.count || 0} users • Created {new Date(org.created_at).toLocaleDateString()}
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
                      <Badge variant={payment.status === "completed" ? "default" : "secondary"}>{payment.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
