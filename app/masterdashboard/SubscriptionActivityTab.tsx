"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RefreshCw, TrendingUp, TrendingDown, XCircle, CheckCircle, Clock, AlertTriangle } from "lucide-react"

interface SubscriptionActivity {
  id: string
  organization_id: string
  organization_name?: string
  subscription_id: string
  stripe_subscription_id: string
  event_type: string
  from_plan: string | null
  to_plan: string
  from_status: string | null
  to_status: string
  amount: number | null
  currency: string
  triggered_by: string
  admin_email: string | null
  details: Record<string, any>
  created_at: string
}

export const SubscriptionActivityTab = () => {
  const [activities, setActivities] = useState<SubscriptionActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  useEffect(() => {
    fetchActivities()
  }, [])

  const fetchActivities = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/master/subscription-activity")
      const data = await response.json()

      if (response.ok) {
        setActivities(data.activities || [])
      }
    } catch (error) {
      console.error("Failed to fetch subscription activities:", error)
    } finally {
      setLoading(false)
    }
  }

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case "upgraded":
        return <TrendingUp className="h-4 w-4 text-green-600" />
      case "downgraded":
        return <TrendingDown className="h-4 w-4 text-orange-600" />
      case "cancelled":
        return <XCircle className="h-4 w-4 text-red-600" />
      case "renewed":
      case "reactivated":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "trial_started":
      case "trial_ended":
        return <Clock className="h-4 w-4 text-blue-600" />
      case "payment_failed":
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      default:
        return <CheckCircle className="h-4 w-4 text-gray-600" />
    }
  }

  const getEventBadge = (eventType: string) => {
    const colors: Record<string, string> = {
      created: "bg-blue-500",
      upgraded: "bg-green-500",
      downgraded: "bg-orange-500",
      cancelled: "bg-red-500",
      renewed: "bg-green-500",
      trial_started: "bg-blue-500",
      trial_ended: "bg-gray-500",
      payment_failed: "bg-yellow-500",
      reactivated: "bg-green-500",
      status_changed: "bg-gray-500",
    }
    return <Badge className={`${colors[eventType] || "bg-gray-500"} text-white`}>{eventType.replace("_", " ")}</Badge>
  }

  const getTriggeredByBadge = (triggeredBy: string) => {
    const colors: Record<string, string> = {
      customer: "border-blue-500 text-blue-700",
      admin: "border-purple-500 text-purple-700",
      stripe_webhook: "border-green-500 text-green-700",
      cron_job: "border-orange-500 text-orange-700",
      system: "border-gray-500 text-gray-700",
    }
    return (
      <Badge variant="outline" className={colors[triggeredBy] || "border-gray-500 text-gray-700"}>
        {triggeredBy.replace("_", " ")}
      </Badge>
    )
  }

  const filteredActivities = activities.filter((activity) => {
    const matchesSearch =
      activity.organization_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.to_plan.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.from_plan?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.admin_email?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesEventType = eventTypeFilter === "all" || activity.event_type === eventTypeFilter

    return matchesSearch && matchesEventType
  })

  const totalPages = Math.ceil(filteredActivities.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedActivities = filteredActivities.slice(startIndex, startIndex + itemsPerPage)

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Subscription Activity</CardTitle>
          <CardDescription>Loading activity logs...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <Input
          type="text"
          placeholder="Search by organization, plan, or admin..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value)
            setCurrentPage(1)
          }}
          className="flex-1"
        />
        <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filter by event" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Events</SelectItem>
            <SelectItem value="created">Created</SelectItem>
            <SelectItem value="upgraded">Upgraded</SelectItem>
            <SelectItem value="downgraded">Downgraded</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="renewed">Renewed</SelectItem>
            <SelectItem value="trial_started">Trial Started</SelectItem>
            <SelectItem value="trial_ended">Trial Ended</SelectItem>
            <SelectItem value="payment_failed">Payment Failed</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={fetchActivities} variant="outline" size="icon">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Subscription Activity ({filteredActivities.length})</CardTitle>
          <CardDescription>Complete history of subscription changes across all organizations</CardDescription>
        </CardHeader>
        <CardContent>
          {paginatedActivities.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No activity logs found</p>
          ) : (
            <div className="space-y-4">
              {paginatedActivities.map((activity) => (
                <Card key={activity.id} className="p-4">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {getEventIcon(activity.event_type)}
                        <div>
                          <p className="font-semibold">{activity.organization_name || "Unknown Organization"}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(activity.created_at).toLocaleString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 justify-end">
                        {getEventBadge(activity.event_type)}
                        {getTriggeredByBadge(activity.triggered_by)}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Plan Change</p>
                        <p className="font-medium">
                          {activity.from_plan ? (
                            <>
                              <span className="capitalize">{activity.from_plan}</span>
                              <span className="mx-2">→</span>
                            </>
                          ) : null}
                          <span className="capitalize">{activity.to_plan}</span>
                        </p>
                      </div>

                      <div>
                        <p className="text-muted-foreground">Status Change</p>
                        <p className="font-medium">
                          {activity.from_status ? (
                            <>
                              <span className="capitalize">{activity.from_status}</span>
                              <span className="mx-2">→</span>
                            </>
                          ) : null}
                          <span className="capitalize">{activity.to_status}</span>
                        </p>
                      </div>

                      {activity.amount !== null && (
                        <div>
                          <p className="text-muted-foreground">Amount</p>
                          <p className="font-medium">
                            {activity.currency.toUpperCase() === "GBP" ? "£" : "$"}
                            {activity.amount.toFixed(2)}
                          </p>
                        </div>
                      )}

                      {activity.admin_email && (
                        <div>
                          <p className="text-muted-foreground">Admin</p>
                          <p className="font-medium text-xs break-all">{activity.admin_email}</p>
                        </div>
                      )}
                    </div>

                    {activity.details && Object.keys(activity.details).length > 0 && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                          View details
                        </summary>
                        <pre className="mt-2 p-2 bg-muted rounded overflow-x-auto">
                          {JSON.stringify(activity.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-6 mt-4 border-t">
              <p className="text-sm text-gray-600">
                Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredActivities.length)} of{" "}
                {filteredActivities.length} activities
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = i + 1
                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className="w-10"
                      >
                        {page}
                      </Button>
                    )
                  })}
                  {totalPages > 5 && <span className="px-2">...</span>}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
