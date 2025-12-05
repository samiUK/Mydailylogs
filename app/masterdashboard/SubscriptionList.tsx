"use client"

import type { Subscription } from "./types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TableCell } from "@/components/ui/table"

interface SubscriptionListProps {
  subscriptions: Subscription[]
  searchTerm: string
  onSearchChange: (term: string) => void
  onRefresh: () => void
  onForceSync?: (organizationId: string, userEmail: string) => void
}

export function SubscriptionList({
  subscriptions,
  searchTerm,
  onSearchChange,
  onRefresh,
  onForceSync,
}: SubscriptionListProps) {
  const { toast } = useToast()
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showTrialDialog, setShowTrialDialog] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState<Subscription | null>(null)
  const [showDowngradeDialog, setShowDowngradeDialog] = useState<Subscription | null>(null)
  const [showUpgradeDialog, setShowUpgradeDialog] = useState<Subscription | null>(null)
  const [showReactivateDialog, setShowReactivateDialog] = useState<Subscription | null>(null)
  const [selectedOrg, setSelectedOrg] = useState<{ id: string; name: string } | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<string>("growth")
  const [currentPage, setCurrentPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const itemsPerPage = 15

  const filteredSubs = subscriptions.filter((sub) => {
    const matchesSearch =
      sub.organization_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.plan_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.status?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.user_email?.toLowerCase().includes(searchTerm.toLowerCase())

    if (statusFilter === "all") return matchesSearch
    if (statusFilter === "paid-trial") return matchesSearch && sub.is_trial && !sub.is_masteradmin_trial
    if (statusFilter === "complimentary-trial") return matchesSearch && sub.is_masteradmin_trial
    if (statusFilter === "active-paid")
      return matchesSearch && !sub.is_trial && sub.status === "active" && sub.stripe_subscription_id
    if (statusFilter === "trialing") return matchesSearch && sub.status === "trialing"
    if (statusFilter === "active") return matchesSearch && sub.status === "active"
    if (statusFilter === "canceled") return matchesSearch && sub.status === "canceled"
    if (statusFilter === "past_due") return matchesSearch && sub.status === "past_due"

    return matchesSearch && sub.status === statusFilter
  })

  const totalPages = Math.ceil(filteredSubs.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedSubs = filteredSubs.slice(startIndex, endIndex)

  const handleSearchChange = (term: string) => {
    onSearchChange(term)
    setCurrentPage(1)
  }

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value)
    setCurrentPage(1)
  }

  const statusCounts = {
    all: subscriptions.length,
    paidTrial: subscriptions.filter((s) => s.is_trial && !s.is_masteradmin_trial).length,
    complimentaryTrial: subscriptions.filter((s) => s.is_masteradmin_trial).length,
    activePaid: subscriptions.filter((s) => !s.is_trial && s.status === "active" && s.stripe_subscription_id).length,
    trialing: subscriptions.filter((s) => s.status === "trialing").length,
    active: subscriptions.filter((s) => s.status === "active").length,
    canceled: subscriptions.filter((s) => s.status === "canceled").length,
    pastDue: subscriptions.filter((s) => s.status === "past_due").length,
  }

  const handleCreateTrial = async () => {
    if (!selectedOrg) return

    setActionLoading("trial")
    try {
      const response = await fetch("/api/master/manage-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upgrade",
          organizationId: selectedOrg.id,
          organizationName: selectedOrg.name,
          planName: selectedPlan,
        }),
      })

      const data = await response.json()

      if (!response.ok) throw new Error(data.error || "Failed to create trial")

      toast({
        title: "Trial Created",
        description: data.message,
      })

      setShowTrialDialog(false)
      setSelectedOrg(null)
      onRefresh()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleCancelSubscription = async (subscription: Subscription) => {
    setActionLoading(subscription.id)
    try {
      const response = await fetch("/api/master/manage-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "cancel",
          subscriptionId: subscription.stripe_subscription_id || subscription.id,
        }),
      })

      const data = await response.json()

      if (!response.ok) throw new Error(data.error || "Failed to cancel subscription")

      toast({
        title: "Subscription Cancelled",
        description: data.message,
      })

      setShowCancelDialog(null)
      onRefresh()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleDowngrade = async (subscription: Subscription) => {
    setActionLoading(subscription.id)
    try {
      const response = await fetch("/api/master/manage-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "downgrade",
          subscriptionId: subscription.stripe_subscription_id || subscription.id,
        }),
      })

      const data = await response.json()

      if (!response.ok) throw new Error(data.error || "Failed to downgrade subscription")

      toast({
        title: "Downgraded to Starter",
        description: data.message,
      })

      setShowDowngradeDialog(null)
      onRefresh()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleUpgrade = async (subscription: Subscription, targetPlan: string) => {
    setActionLoading(subscription.id)
    try {
      const response = await fetch("/api/master/manage-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upgrade",
          subscriptionId: subscription.stripe_subscription_id || subscription.id,
          organizationId: subscription.organization_id,
          organizationName: subscription.organization_name,
          planName: targetPlan,
        }),
      })

      const data = await response.json()

      if (!response.ok) throw new Error(data.error || "Failed to upgrade subscription")

      toast({
        title: "Subscription Upgraded",
        description: data.message,
      })

      setShowUpgradeDialog(null)
      onRefresh()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleReactivate = async (subscription: Subscription) => {
    setActionLoading(subscription.id)
    try {
      const response = await fetch("/api/master/manage-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reactivate",
          subscriptionId: subscription.stripe_subscription_id || subscription.id,
        }),
      })

      const data = await response.json()

      if (!response.ok) throw new Error(data.error || "Failed to reactivate subscription")

      toast({
        title: "Subscription Reactivated",
        description: data.message,
      })

      setShowReactivateDialog(null)
      onRefresh()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setActionLoading(null)
    }
  }

  const getDaysRemaining = (trialEndsAt: string | null) => {
    if (!trialEndsAt) return null
    const now = new Date()
    const endDate = new Date(trialEndsAt)
    const diffTime = endDate.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const getStatusBadge = (status: string, isTrial?: boolean, isMAT?: boolean, trialEndsAt?: string | null) => {
    if (isMAT) {
      return (
        <div className="flex flex-col gap-1">
          <div className="flex gap-2">
            <Badge className="bg-purple-600 hover:bg-purple-700">Complimentary Trial</Badge>
            <Badge variant="outline" className="text-xs">
              No Payment
            </Badge>
          </div>
          {trialEndsAt && (
            <p className="text-xs text-purple-600 font-medium">Trial ends in {getDaysRemaining(trialEndsAt)} days</p>
          )}
        </div>
      )
    }
    if (isTrial) {
      return (
        <div className="flex flex-col gap-1">
          <div className="flex gap-2">
            <Badge className="bg-blue-600 hover:bg-blue-700">Paid Trial</Badge>
            <Badge variant="outline" className="text-xs">
              Via Stripe
            </Badge>
          </div>
          {trialEndsAt && (
            <p className="text-xs text-blue-600 font-medium">Trial ends in {getDaysRemaining(trialEndsAt)} days</p>
          )}
        </div>
      )
    }
    const colors: Record<string, string> = {
      active: "bg-green-500",
      past_due: "bg-yellow-500",
      canceled: "bg-red-500",
      incomplete: "bg-gray-500",
      trialing: "bg-blue-500",
    }
    return <Badge className={colors[status] || "bg-gray-500"}>{status}</Badge>
  }

  const organizations = Array.from(
    new Map(
      subscriptions.map((sub) => [
        sub.organization_id,
        { id: sub.organization_id, name: sub.organization_name || "Unknown" },
      ]),
    ).values(),
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1 flex gap-2">
          <Input
            type="text"
            placeholder="Search by plan, status, organization, or user email..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="flex-1"
          />
          <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All ({statusCounts.all})</SelectItem>
              <SelectItem value="paid-trial">Paid Trials ({statusCounts.paidTrial})</SelectItem>
              <SelectItem value="complimentary-trial">Complimentary ({statusCounts.complimentaryTrial})</SelectItem>
              <SelectItem value="active-paid">Active Paid ({statusCounts.activePaid})</SelectItem>
              <SelectItem value="trialing">Trialing ({statusCounts.trialing})</SelectItem>
              <SelectItem value="active">Active ({statusCounts.active})</SelectItem>
              <SelectItem value="canceled">Canceled ({statusCounts.canceled})</SelectItem>
              <SelectItem value="past_due">Past Due ({statusCounts.pastDue})</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setShowTrialDialog(true)} className="bg-purple-600 hover:bg-purple-700 w-full sm:w-auto">
          Create Master Admin Trial
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Subscriptions ({filteredSubs.length}
            {statusFilter !== "all" && ` filtered`})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {paginatedSubs.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No subscriptions found matching your search</p>
            ) : (
              paginatedSubs.map((sub) => (
                <Card key={sub.id} className="p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Organization</p>
                      <p className="font-semibold break-words">{sub.organization_name || "Unknown"}</p>
                      {sub.is_masteradmin_trial && (
                        <div className="flex flex-wrap gap-2 mt-1">
                          <Badge className="bg-purple-600 hover:bg-purple-700 text-xs">Complimentary Trial</Badge>
                          <Badge variant="outline" className="text-xs">
                            No Payment
                          </Badge>
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="text-sm font-medium text-muted-foreground">User Email</p>
                      <p className="text-sm break-all">{sub.user_email || "N/A"}</p>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Plan</p>
                      <p className="font-semibold capitalize">{sub.plan_name || "Unknown"}</p>
                      {getStatusBadge(sub.status, sub.is_trial, sub.is_masteradmin_trial, sub.trial_ends_at)}
                    </div>

                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Billing Period</p>
                      {sub.current_period_start && sub.current_period_end ? (
                        <>
                          <p className="text-sm">{new Date(sub.current_period_start).toLocaleDateString("en-GB")}</p>
                          <p className="text-sm">{new Date(sub.current_period_end).toLocaleDateString("en-GB")}</p>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">N/A</p>
                      )}
                      {sub.trial_ends_at && (
                        <p className="text-xs text-blue-600 mt-1">
                          Trial ends: {new Date(sub.trial_ends_at).toLocaleDateString("en-GB")}
                        </p>
                      )}
                      {sub.cancel_at_period_end && <p className="text-xs text-red-600 mt-1">Cancels at period end</p>}
                    </div>

                    <TableCell className="max-w-[200px]">
                      <div className="flex flex-col gap-2">
                        {!sub.stripe_subscription_id && onForceSync && (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => onForceSync(sub.organization_id, sub.user_email || "")}
                            disabled={actionLoading === sub.id}
                            className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
                          >
                            {actionLoading === sub.id ? "Syncing..." : "Sync from Stripe"}
                          </Button>
                        )}

                        {sub.stripe_subscription_id && (sub.status === "active" || sub.status === "trialing") && (
                          <>
                            {sub.plan_name?.toLowerCase() === "growth" && (
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => setShowUpgradeDialog(sub)}
                                disabled={actionLoading === sub.id}
                                className="bg-purple-600 hover:bg-purple-700 w-full sm:w-auto"
                              >
                                {actionLoading === sub.id ? "Processing..." : "Upgrade to Scale"}
                              </Button>
                            )}

                            {!sub.cancel_at_period_end && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setShowCancelDialog(sub)}
                                disabled={actionLoading === sub.id}
                                className="border-orange-500 text-orange-600 hover:bg-orange-50 w-full sm:w-auto"
                              >
                                {actionLoading === sub.id ? "Processing..." : "Cancel at Period End"}
                              </Button>
                            )}

                            {!sub.cancel_at_period_end && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setShowDowngradeDialog(sub)}
                                disabled={actionLoading === sub.id}
                                className="border-red-500 text-red-600 hover:bg-red-50 w-full sm:w-auto"
                              >
                                {actionLoading === sub.id ? "Processing..." : "Cancel Immediately"}
                              </Button>
                            )}
                          </>
                        )}

                        {sub.cancel_at_period_end && sub.stripe_subscription_id && (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => setShowReactivateDialog(sub)}
                            disabled={actionLoading === sub.id}
                            className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
                          >
                            {actionLoading === sub.id ? "Processing..." : "Reactivate Subscription"}
                          </Button>
                        )}

                        {sub.stripe_subscription_id && (
                          <p className="text-xs text-muted-foreground mt-2 break-all">
                            ID: {sub.stripe_subscription_id}
                          </p>
                        )}
                      </div>
                    </TableCell>
                  </div>
                </Card>
              ))
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-6 mt-4 border-t">
              <p className="text-sm text-gray-600">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredSubs.length)} of {filteredSubs.length}{" "}
                subscriptions
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

      <Dialog open={showTrialDialog} onOpenChange={setShowTrialDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Master Admin Trial</DialogTitle>
            <DialogDescription>
              Create a 30-day test trial for an organization. This will automatically downgrade to Starter after 30
              days.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Organization</Label>
              <Select onValueChange={(value) => setSelectedOrg(organizations.find((o) => o.id === value) || null)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Plan</Label>
              <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="growth">Growth</SelectItem>
                  <SelectItem value="scale">Scale</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTrialDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateTrial}
              disabled={!selectedOrg || actionLoading === "trial"}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {actionLoading === "trial" ? "Creating..." : "Create Trial"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!showCancelDialog} onOpenChange={(open) => !open && setShowCancelDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel at Period End</DialogTitle>
            <DialogDescription>
              This will cancel your subscription at the end of the current billing period. You'll keep full access until
              then.
            </DialogDescription>
          </DialogHeader>
          {showCancelDialog && (
            <div className="py-4">
              <p className="text-sm mb-2">
                <strong>Organization:</strong> {showCancelDialog.organization_name}
              </p>
              <div className="bg-orange-50 border border-orange-200 rounded p-3 space-y-1 text-sm">
                <p className="font-semibold text-orange-900">What happens:</p>
                <ul className="list-disc list-inside text-orange-700 space-y-1">
                  <li>
                    Full access continues until {new Date(showCancelDialog.current_period_end).toLocaleDateString()}
                  </li>
                  <li>No further charges will be made</li>
                  <li>Automatically downgrades to Starter after period ends</li>
                  <li>You can reactivate before the period ends</li>
                </ul>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(null)}>
              Keep Subscription
            </Button>
            <Button
              onClick={() => showCancelDialog && handleCancelSubscription(showCancelDialog)}
              disabled={actionLoading === showCancelDialog?.id}
              variant="default"
            >
              {actionLoading === showCancelDialog?.id ? "Processing..." : "Cancel at Period End"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!showDowngradeDialog} onOpenChange={(open) => !open && setShowDowngradeDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Subscription Immediately</DialogTitle>
            <DialogDescription className="text-red-600">
              This will immediately cancel the Stripe subscription and downgrade to the free Starter plan. Access ends
              NOW. This cannot be undone!
            </DialogDescription>
          </DialogHeader>
          {showDowngradeDialog && (
            <div className="py-4">
              <p className="text-sm mb-2">
                <strong>Organization:</strong> {showDowngradeDialog.organization_name}
              </p>
              <div className="bg-red-50 border border-red-200 rounded p-3 space-y-1 text-sm">
                <p className="font-semibold text-red-900">This will immediately:</p>
                <ul className="list-disc list-inside text-red-700 space-y-1">
                  <li>Cancel Stripe subscription (no refund)</li>
                  <li>Downgrade to Starter plan</li>
                  <li>Archive all but 3 most recent templates</li>
                  <li>Soft-delete all but 50 most recent reports</li>
                  <li>Apply Starter limits (3 templates, 5 users, 50 reports/month)</li>
                </ul>
                <p className="text-xs text-red-600 mt-2">
                  Tip: Use "Cancel at Period End" to keep access until billing period ends.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDowngradeDialog(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => showDowngradeDialog && handleDowngrade(showDowngradeDialog)}
              disabled={actionLoading === showDowngradeDialog?.id}
              variant="destructive"
            >
              {actionLoading === showDowngradeDialog?.id ? "Cancelling..." : "Cancel Immediately"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!showUpgradeDialog} onOpenChange={(open) => !open && setShowUpgradeDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upgrade to Scale Plan</DialogTitle>
            <DialogDescription>
              Upgrade this subscription to the Scale plan. The customer will be charged the prorated difference
              immediately.
            </DialogDescription>
          </DialogHeader>
          {showUpgradeDialog && (
            <div className="py-4">
              <p className="text-sm mb-2">
                <strong>Organization:</strong> {showUpgradeDialog.organization_name}
              </p>
              <p className="text-sm mb-2">
                <strong>Current Plan:</strong> {showUpgradeDialog.plan_name}
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded p-3 space-y-1 text-sm">
                <p className="font-semibold text-blue-900">Scale Plan includes:</p>
                <ul className="list-disc list-inside text-blue-700 space-y-1">
                  <li>Unlimited templates</li>
                  <li>Unlimited users</li>
                  <li>Unlimited reports per month</li>
                  <li>Priority support</li>
                </ul>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpgradeDialog(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => showUpgradeDialog && handleUpgrade(showUpgradeDialog, "scale")}
              disabled={actionLoading === showUpgradeDialog?.id}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {actionLoading === showUpgradeDialog?.id ? "Upgrading..." : "Upgrade to Scale"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!showReactivateDialog} onOpenChange={(open) => !open && setShowReactivateDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reactivate Subscription</DialogTitle>
            <DialogDescription>
              This will cancel the scheduled cancellation and the subscription will continue to renew automatically.
            </DialogDescription>
          </DialogHeader>
          {showReactivateDialog && (
            <div className="py-4">
              <p className="text-sm mb-2">
                <strong>Organization:</strong> {showReactivateDialog.organization_name}
              </p>
              <p className="text-sm mb-2">
                <strong>Plan:</strong> {showReactivateDialog.plan_name}
              </p>
              <p className="text-sm">
                <strong>Currently scheduled to cancel:</strong>{" "}
                {showReactivateDialog.current_period_end &&
                  new Date(showReactivateDialog.current_period_end).toLocaleDateString("en-GB")}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReactivateDialog(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => showReactivateDialog && handleReactivate(showReactivateDialog)}
              disabled={actionLoading === showReactivateDialog?.id}
              className="bg-green-600 hover:bg-green-700"
            >
              {actionLoading === showReactivateDialog?.id ? "Reactivating..." : "Reactivate Subscription"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
