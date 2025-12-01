"use client"

import { useState } from "react"
import { AlertTriangle, CreditCard, X } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

interface PaymentFailedBannerProps {
  gracePeriodEndsAt: string
  amount: string
  planName: string
  onUpdatePayment: () => void
}

export function PaymentFailedBanner({
  gracePeriodEndsAt,
  amount,
  planName,
  onUpdatePayment,
}: PaymentFailedBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false)

  if (isDismissed) return null

  const daysRemaining = Math.ceil((new Date(gracePeriodEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))

  return (
    <Alert className="bg-red-50 border-red-200 mb-6">
      <AlertTriangle className="h-5 w-5 text-red-600" />
      <AlertDescription className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <p className="font-semibold text-red-900 mb-1">Payment Failed - Action Required</p>
          <p className="text-sm text-red-800">
            Your payment of {amount} for {planName} failed. You have {daysRemaining} day{daysRemaining !== 1 ? "s" : ""}{" "}
            remaining to update your payment method before your account is downgraded to the Starter plan.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={onUpdatePayment} className="bg-red-600 hover:bg-red-700 text-white">
            <CreditCard className="h-4 w-4 mr-2" />
            Update Payment
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsDismissed(true)}
            className="text-red-600 hover:text-red-700 hover:bg-red-100"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  )
}
