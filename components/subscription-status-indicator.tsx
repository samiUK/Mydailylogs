"use client"

import { useSubscription } from "@/app/admin/subscription-realtime-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"

export function SubscriptionStatusIndicator() {
  const { subscription, isLoading, refreshSubscription } = useSubscription()

  if (!subscription) return null

  return (
    <div className="flex items-center gap-2">
      <Badge variant={subscription.plan_name === "starter" ? "secondary" : "default"}>
        {subscription.plan_name.charAt(0).toUpperCase() + subscription.plan_name.slice(1)} Plan
      </Badge>

      {isLoading ? (
        <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : (
        <Button variant="ghost" size="sm" onClick={refreshSubscription} className="h-6 px-2 text-xs">
          <RefreshCw className="h-3 w-3" />
        </Button>
      )}
    </div>
  )
}
