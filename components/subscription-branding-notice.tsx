"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Crown, Palette } from "lucide-react"
import { getSubscriptionLimits } from "@/lib/subscription-limits"
import Link from "next/link"

interface SubscriptionBrandingNoticeProps {
  organizationId: string
}

export function SubscriptionBrandingNotice({ organizationId }: SubscriptionBrandingNoticeProps) {
  const [subscriptionLimits, setSubscriptionLimits] = useState<{
    hasCustomBranding: boolean
    planName: string
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadLimits() {
      try {
        const limits = await getSubscriptionLimits(organizationId)
        setSubscriptionLimits(limits)
      } catch (error) {
        console.error("Error loading subscription limits:", error)
      } finally {
        setLoading(false)
      }
    }

    if (organizationId) {
      loadLimits()
    }
  }, [organizationId])

  if (loading || !subscriptionLimits) {
    return null
  }

  if (subscriptionLimits.hasCustomBranding) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-green-800">
              <Palette className="w-5 h-5" />
              Custom Branding Active
            </CardTitle>
            <Badge style={{ backgroundColor: "var(--brand-primary)", color: "white" }}>
              {subscriptionLimits.planName}
            </Badge>
          </div>
          <CardDescription className="text-green-700">
            Your reports display your organization's custom branding and logo.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="border-amber-200 bg-amber-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-amber-800">
            <Crown className="w-5 h-5" />
            Custom Branding Available
          </CardTitle>
          <Badge variant="secondary" style={{ backgroundColor: "var(--brand-primary)", color: "white" }}>
            {subscriptionLimits.planName}
          </Badge>
        </div>
        <CardDescription className="text-amber-700">
          Reports currently show default branding. Upgrade to display your organization's logo and name.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Link href="/admin/billing">
          <Button className="bg-amber-600 hover:bg-amber-700 text-white">
            <Crown className="w-4 h-4 mr-2" />
            Upgrade for Custom Branding
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}
