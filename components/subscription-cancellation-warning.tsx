"use client"

import { useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

interface SubscriptionCancellationWarningProps {
  daysRemaining: number
  periodEndDate: string
}

export function SubscriptionCancellationWarning({
  daysRemaining,
  periodEndDate,
}: SubscriptionCancellationWarningProps) {
  const [isDismissed, setIsDismissed] = useState(false)

  if (isDismissed || daysRemaining > 3) {
    return null
  }

  return (
    <Alert variant="destructive" className="border-red-300 bg-red-50">
      <AlertTriangle className="h-5 w-5 text-red-600" />
      <AlertTitle className="text-red-800 font-semibold">
        Your Paid Subscription Ends in {daysRemaining} Day{daysRemaining !== 1 ? "s" : ""}
      </AlertTitle>
      <AlertDescription className="text-red-700 space-y-2">
        <p>
          Your subscription will end on <strong>{new Date(periodEndDate).toLocaleDateString()}</strong>. After this
          date, your account will be downgraded to the Starter plan.
        </p>
        <p className="font-medium">
          Please remove extra Templates, Managers, and Team Members to avoid automated removal. Otherwise:
        </p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Only the first 5 team members will remain</li>
          <li>Only the first 3 templates will remain (others will be archived)</li>
          <li>Only the first 50 reports will remain (others will be deleted)</li>
          <li>Extra manager accounts will be removed</li>
        </ul>
        <div className="flex gap-2 mt-4">
          <Button size="sm" variant="outline" onClick={() => setIsDismissed(true)} className="bg-white">
            I Understand
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  )
}
