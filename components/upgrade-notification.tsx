"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Crown, Sparkles, Lock } from 'lucide-react'
import Link from "next/link"

interface UpgradeNotificationProps {
  title: string
  description: string
  currentPlan: string
  requiredPlan?: string
  variant?: "card" | "alert" | "inline"
  className?: string
}

export function UpgradeNotification({
  title,
  description,
  currentPlan,
  requiredPlan = "Growth",
  variant = "alert",
  className = "",
}: UpgradeNotificationProps) {
  if (variant === "card") {
    return (
      <Card className={`border-accent/50 bg-gradient-to-br from-accent/5 to-accent/10 ${className}`}>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="rounded-full bg-accent/20 p-3">
              <Crown className="w-6 h-6 text-accent" />
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  {title}
                  <Sparkles className="w-4 h-4 text-accent" />
                </h3>
                <p className="text-sm text-muted-foreground mt-1">{description}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">
                  Current: <span className="font-medium">{currentPlan}</span>
                </span>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground">
                  Required: <span className="font-medium text-accent">{requiredPlan}</span>
                </span>
              </div>
              <Link href="/admin/profile/billing">
                <Button size="sm" className="bg-accent hover:bg-accent/90">
                  <Crown className="w-4 h-4 mr-2" />
                  Upgrade Now
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (variant === "inline") {
    return (
      <div className={`flex items-center justify-between p-3 rounded-lg bg-accent/10 border border-accent/20 ${className}`}>
        <div className="flex items-center gap-3">
          <Lock className="w-4 h-4 text-accent" />
          <div className="text-sm">
            <span className="font-medium text-foreground">{title}</span>
            <span className="text-muted-foreground ml-2">{description}</span>
          </div>
        </div>
        <Link href="/admin/profile/billing">
          <Button size="sm" variant="outline" className="border-accent text-accent hover:bg-accent hover:text-accent-foreground">
            <Crown className="w-3 h-3 mr-1" />
            Upgrade
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <Alert className={`border-accent bg-accent/5 ${className}`}>
      <Crown className="h-4 w-4 text-accent" />
      <AlertTitle className="text-foreground">{title}</AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <div className="space-y-1">
          <p>{description}</p>
          <p className="text-xs">
            Your plan: <span className="font-medium">{currentPlan}</span> • Upgrade to{" "}
            <span className="font-medium text-accent">{requiredPlan}</span> to unlock this feature
          </p>
        </div>
        <Link href="/admin/profile/billing">
          <Button size="sm" className="bg-accent hover:bg-accent/90 ml-4">
            <Crown className="w-4 h-4 mr-2" />
            Upgrade Plan
          </Button>
        </Link>
      </AlertDescription>
    </Alert>
  )
}
