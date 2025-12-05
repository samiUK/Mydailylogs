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

interface SubscriptionListProps {
  subscriptions: Subscription[]
  searchTerm: string
  onSearchChange: (term: string) => void
  onRefresh: () => void
}

export function SubscriptionList({ subscriptions, searchTerm, onSearchChange, onRefresh }: SubscriptionListProps) {
  const { toast } = useToast()
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showTrialDialog, setShowTrialDialog] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState<Subscription | null>(null)
  const [showDowngradeDialog, setShowDowngradeDialog] = useState<Subscription | null>(null)
  const [selectedOrg, setSelectedOrg] = useState<{ id: string; name: string } | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<string>("growth")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 15

  const filteredSubs = subscriptions.filter(
    (sub) =>
      sub.organization_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.plan_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.status?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.user_email?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const totalPages = Math.ceil(filteredSubs.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedSubs = filteredSubs.slice(startIndex, endIndex)

  const handleSearchChange = (term: string) => {
    onSearchChange(term)
    setCurrentPage(1)
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

  const getStatusBadge = (status: string, isTrial?: boolean, isMAT?: boolean) => {
    if (isMAT) {
      return (
        <div className="flex gap-2">
          <Badge className="bg-purple-600 hover:bg-purple-700">Complimentary Trial</Badge>
          <Badge variant="outline" className="text-xs">
            No Payment
          </Badge>
        </div>
      )
    }
    if (isTrial) {
      return (
        <div className="flex gap-2">
          <Badge className="bg-blue-600 hover:bg-blue-700">Paid Trial</Badge>
          <Badge variant="outline" className="text-xs">
            Via Stripe
          </Badge>
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

  // Get unique organizations for trial creation
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
        <div className="flex-1">
          <Input
            type="text"
            placeholder="Search by plan, status, organization, or user email..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full"
          />
        </div>
        <Button onClick={() => setShowTrialDialog(true)} className="bg-purple-600 hover:bg-purple-700 w-full sm:w-auto">
          Create Master Admin Trial
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Subscriptions ({filteredSubs.length})</CardTitle>
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
                      {getStatusBadge(sub.status, sub.is_trial, sub.is_masteradmin_trial)}
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

                    <div className="flex flex-col gap-2">
                      {sub.status === "active" && !sub.cancel_at_period_end && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowCancelDialog(sub)}
                          disabled={actionLoading === sub.id}
                          className="border-yellow-500 text-yellow-600 hover:bg-yellow-50 w-full sm:w-auto"
                        >
                          {actionLoading === sub.id ? "Processing..." : "Cancel Subscription"}
                        </Button>
                      )}
                      {(sub.status === "active" || sub.status === "trialing") && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowDowngradeDialog(sub)}
                          disabled={actionLoading === sub.id}
                          className="border-red-500 text-red-600 hover:bg-red-50 w-full sm:w-auto"
                        >
                          {actionLoading === sub.id ? "Processing..." : "Downgrade to Starter"}
                        </Button>
                      )}
                      {sub.stripe_subscription_id && (
                        <p className="text-xs text-muted-foreground mt-2 break-all">ID: {sub.stripe_subscription_id}</p>
                      )}
                    </div>
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
            <DialogTitle>Cancel Subscription</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this subscription? It will remain active until the end of the current
              billing period.
            </DialogDescription>
          </DialogHeader>
          {showCancelDialog && (
            <div className="py-4">
              <p className="text-sm">
                <strong>Organization:</strong> {showCancelDialog.organization_name}
              </p>
              <p className="text-sm">
                <strong>Plan:</strong> {showCancelDialog.plan_name}
              </p>
              <p className="text-sm">
                <strong>Period ends:</strong>{" "}
                {showCancelDialog.current_period_end &&
                  new Date(showCancelDialog.current_period_end).toLocaleDateString("en-GB")}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(null)}>
              Keep Subscription
            </Button>
            <Button
              onClick={() => showCancelDialog && handleCancelSubscription(showCancelDialog)}
              disabled={actionLoading === showCancelDialog?.id}
              variant="destructive"
            >
              {actionLoading === showCancelDialog?.id ? "Cancelling..." : "Cancel Subscription"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!showDowngradeDialog} onOpenChange={(open) => !open && setShowDowngradeDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Downgrade to Starter</DialogTitle>
            <DialogDescription className="text-red-600">
              This will immediately cancel the subscription and downgrade to the free Starter plan. This action cannot
              be undone!
            </DialogDescription>
          </DialogHeader>
          {showDowngradeDialog && (
            <div className="py-4">
              <p className="text-sm mb-2">
                <strong>Organization:</strong> {showDowngradeDialog.organization_name}
              </p>
              <div className="bg-red-50 border border-red-200 rounded p-3 space-y-1 text-sm">
                <p className="font-semibold text-red-900">This will:</p>
                <ul className="list-disc list-inside text-red-700 space-y-1">
                  <li>Cancel Stripe subscription immediately</li>
                  <li>Archive all but 3 most recent templates</li>
                  <li>Soft-delete all but 50 most recent reports</li>
                  <li>Apply Starter plan limits (3 templates, 5 users, 50 reports/month)</li>
                </ul>
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
              {actionLoading === showDowngradeDialog?.id ? "Downgrading..." : "Downgrade Now"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
