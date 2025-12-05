"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Building, DollarSign, UserPlus, TrendingUp, Clock } from "lucide-react"

interface StatsCardsProps {
  allUsers: any[]
  organizationStats: {
    total: number
    active: number
    withSubscriptions: number
  }
  paidCustomers: number
  complimentaryCustomers: number
  allPayments: any[]
  newSignupsThisMonth: number
  conversionRate: number
  allSubscriptions: any[]
}

export function StatsCards({
  allUsers,
  organizationStats,
  paidCustomers,
  complimentaryCustomers,
  allPayments,
  newSignupsThisMonth,
  conversionRate,
  allSubscriptions,
}: StatsCardsProps) {
  const activeTrials = allSubscriptions.filter(
    (sub) => sub.is_trial && sub.status === "active" && sub.trial_ends_at && new Date(sub.trial_ends_at) > new Date(),
  ).length

  const totalRevenue = allPayments
    .filter((payment) => payment.status === "completed")
    .reduce((sum, payment) => sum + Number.parseFloat(payment.amount), 0)
    .toFixed(2)

  return (
    <>
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
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{organizationStats.total}</div>
            <p className="text-xs text-muted-foreground">
              {organizationStats.active} active | {organizationStats.withSubscriptions} with subscriptions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid Customers</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{paidCustomers}</div>
            <p className="text-xs text-muted-foreground">
              {complimentaryCustomers} complimentary trial{complimentaryCustomers !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">£{totalRevenue}</div>
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
            <div className="text-2xl font-bold">{activeTrials}</div>
            <p className="text-xs text-muted-foreground">Users in trial period</p>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
