"use client"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AlertTriangle, Calendar, Clock, Users, X, FileText, UserCog } from "lucide-react"
import { useState } from "react"

interface SubscriptionCancelDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  isTrial: boolean
  loading: boolean
  planName?: string
  trialEndsAt?: string
  currentPeriodEnd?: string
  currentPlanFeatures?: {
    maxTemplates: number
    maxTeamMembers: number
    maxAdmins: number
    maxReportSubmissions: number | null
  }
}

export function SubscriptionCancelDialog({
  isOpen,
  onClose,
  onConfirm,
  isTrial,
  loading,
  planName = "Growth",
  trialEndsAt,
  currentPeriodEnd,
  currentPlanFeatures,
}: SubscriptionCancelDialogProps) {
  const [acknowledged, setAcknowledged] = useState(false)

  const getDaysRemaining = () => {
    if (!trialEndsAt) return null
    const now = new Date()
    const trialEnd = new Date(trialEndsAt)
    const diffTime = trialEnd.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays > 0 ? diffDays : 0
  }

  const getCancellationDate = () => {
    if (!currentPeriodEnd) return null
    return new Date(currentPeriodEnd).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  }

  const daysRemaining = getDaysRemaining()
  const cancellationDate = getCancellationDate()
  const isScalePlan = planName.toLowerCase() === "scale"

  const handleConfirm = () => {
    if (!acknowledged) return
    onConfirm()
  }

  const handleClose = () => {
    setAcknowledged(false)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-orange-100">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              </div>
              <DialogTitle className="text-xl">
                {isTrial ? "Cancel Your Free Trial?" : `Cancel ${planName} Subscription?`}
              </DialogTitle>
            </div>
          </div>

          {isTrial && daysRemaining !== null && daysRemaining > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 my-4">
              <div className="flex items-center gap-2 text-emerald-800">
                <Clock className="w-5 h-5" />
                <span className="font-semibold">
                  {daysRemaining} {daysRemaining === 1 ? "day" : "days"} remaining in your free trial
                </span>
              </div>
              <p className="text-sm text-emerald-700 mt-2">
                You still have time to explore all the premium features at no cost!
              </p>
            </div>
          )}

          {!isTrial && cancellationDate && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 my-4">
              <div className="flex items-center gap-2 text-blue-800">
                <Calendar className="w-5 h-5" />
                <span className="font-semibold">Cancellation takes effect: {cancellationDate}</span>
              </div>
              <p className="text-sm text-blue-700 mt-2">
                Your subscription will remain active until the end of your billing period. You can reactivate anytime
                before this date.
              </p>
            </div>
          )}

          <DialogDescription className="text-base pt-2 space-y-4">
            {isScalePlan && !isTrial && (
              <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-red-900 mb-1">Critical: Team Member Loss</p>
                    <p className="text-sm text-red-800">
                      You currently have{" "}
                      <span className="font-bold">{currentPlanFeatures?.maxTeamMembers} team members</span> and{" "}
                      <span className="font-bold">{currentPlanFeatures?.maxAdmins} managers</span>. After cancellation
                      on {cancellationDate}, you'll be limited to{" "}
                      <span className="font-bold">5 team members and 1 admin only</span>. This means you'll need to
                      remove {(currentPlanFeatures?.maxTeamMembers || 0) - 5} team members and{" "}
                      {(currentPlanFeatures?.maxAdmins || 0) - 1} managers before the downgrade.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <p className="font-semibold text-foreground mb-3">
                By cancelling your {planName} plan, you'll lose access to:
              </p>
              <div className="space-y-3 pl-1">
                {currentPlanFeatures && (
                  <>
                    <div className="flex items-start gap-3">
                      <FileText className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">
                        <span className="font-semibold">{currentPlanFeatures.maxTemplates} custom templates</span> →
                        Only your <span className="font-semibold text-emerald-600">first 3 templates will remain</span>
                      </span>
                    </div>
                    <div className="flex items-start gap-3">
                      <Users className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">
                        <span className="font-semibold">{currentPlanFeatures.maxTeamMembers} team members</span> → Only
                        your <span className="font-semibold text-emerald-600">first 5 team members will remain</span>
                        {isScalePlan && !isTrial && (
                          <span className="text-red-600 font-semibold">
                            {" "}
                            (you must remove {(currentPlanFeatures.maxTeamMembers || 0) - 5} members before{" "}
                            {cancellationDate})
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-start gap-3">
                      <UserCog className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">
                        <span className="font-semibold">{currentPlanFeatures.maxAdmins} managers</span> with admin-level
                        access → Only <span className="font-semibold text-emerald-600">1 admin will remain</span>
                        {isScalePlan && !isTrial && (
                          <span className="text-red-600 font-semibold">
                            {" "}
                            (you must remove {(currentPlanFeatures.maxAdmins || 0) - 1} managers before{" "}
                            {cancellationDate})
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-start gap-3">
                      <X className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">
                        <span className="font-semibold">Unlimited report submissions</span> → Your{" "}
                        <span className="font-semibold text-emerald-600">last 50 reports will remain</span> unless you
                        modify your organization to exceed this limit
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 mt-4">
              <p className="text-sm">
                {isTrial ? (
                  <>
                    <span className="font-semibold text-foreground">If you cancel now:</span> You won't be charged, and
                    you'll be <span className="font-semibold text-red-600">immediately downgraded</span> to the free
                    Starter plan with limited features.
                  </>
                ) : (
                  <>
                    <span className="font-semibold text-foreground">If you cancel now:</span> Your {planName}{" "}
                    subscription will remain active until <span className="font-semibold">{cancellationDate}</span>. You
                    can reactivate anytime before this date to keep your plan. After that, you'll be downgraded to the
                    free Starter plan.
                  </>
                )}
              </p>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mt-4">
              <p className="text-sm text-emerald-800">
                {isTrial ? (
                  <>
                    <span className="font-semibold">Changed your mind?</span> After cancellation, you can upgrade again
                    anytime from the billing page.
                  </>
                ) : (
                  <>
                    <span className="font-semibold">Changed your mind?</span> You can reactivate your subscription
                    anytime before {cancellationDate} to keep your current plan and avoid losing access.
                  </>
                )}
              </p>
            </div>

            <div className="flex items-start gap-3 pt-2">
              <Checkbox
                id="acknowledge"
                checked={acknowledged}
                onCheckedChange={(checked) => setAcknowledged(checked === true)}
              />
              <label
                htmlFor="acknowledge"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                I understand that I will lose access to these premium features
                {isScalePlan && !isTrial && " and will need to remove team members and managers"}, and I want to proceed
                with cancellation
              </label>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={loading}
            className="flex-1 sm:flex-none bg-transparent"
          >
            Keep My {planName} Plan
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={loading || !acknowledged}
            className="flex-1 sm:flex-none"
          >
            {loading ? "Cancelling..." : "Yes, Cancel Subscription"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
