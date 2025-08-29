"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Crown, Users, FileText } from "lucide-react"
import { getSubscriptionLimits, getCurrentUsage } from "@/lib/subscription-limits"
import Link from "next/link"

interface UsageLimitsCardProps {
  organizationId: string
}

export function UsageLimitsCard({ organizationId }: UsageLimitsCardProps) {
  const [limits, setLimits] = useState<{
    maxTemplates: number
    maxTeamMembers: number
    planName: string
  } | null>(null)
  const [usage, setUsage] = useState<{
    templateCount: number
    teamMemberCount: number
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const [limitsData, usageData] = await Promise.all([
          getSubscriptionLimits(organizationId),
          getCurrentUsage(organizationId),
        ])
        setLimits(limitsData)
        setUsage(usageData)
      } catch (error) {
        console.error("Error loading usage data:", error)
      } finally {
        setLoading(false)
      }
    }

    if (organizationId) {
      loadData()
    }
  }, [organizationId])

  if (loading || !limits || !usage) {
    return null
  }

  const templateUsagePercent = (usage.templateCount / limits.maxTemplates) * 100
  const teamUsagePercent = (usage.teamMemberCount / limits.maxTeamMembers) * 100
  const isFreePlan = limits.planName === "Free"

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5" />
            Plan Usage
          </CardTitle>
          <Badge variant={isFreePlan ? "secondary" : "default"}>{limits.planName}</Badge>
        </div>
        <CardDescription>Monitor your current plan usage and limits</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Templates
            </span>
            <span className="font-medium">
              {usage.templateCount} / {limits.maxTemplates}
            </span>
          </div>
          <Progress value={templateUsagePercent} className="h-2" />
          {templateUsagePercent >= 80 && <p className="text-xs text-amber-600">Approaching template limit</p>}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Team Members
            </span>
            <span className="font-medium">
              {usage.teamMemberCount} / {limits.maxTeamMembers}
            </span>
          </div>
          <Progress value={teamUsagePercent} className="h-2" />
          {teamUsagePercent >= 80 && <p className="text-xs text-amber-600">Approaching team member limit</p>}
        </div>

        {(templateUsagePercent >= 80 || teamUsagePercent >= 80 || isFreePlan) && (
          <div className="pt-4 border-t">
            <Link href="/admin/billing">
              <Button className="w-full bg-accent hover:bg-accent/90">
                <Crown className="w-4 h-4 mr-2" />
                {isFreePlan ? "Upgrade Plan" : "Manage Subscription"}
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
