"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  CreditCard,
  CheckCircle,
  Calendar,
  AlertCircle,
  Crown,
  Sparkles,
  ArrowUpCircle,
  ArrowDownCircle,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { getStripePriceId } from "@/lib/stripe-prices"
import StripeCheckout from "@/components/stripe-checkout"

interface Subscription {
  id: string
  plan_name: string
  status: string
  current_period_start: string
  current_period_end: string
}

export const dynamic = "force-dynamic"

export default function BillingPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [priceId, setPriceId] = useState<string | null>(null)
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">("yearly")
  const [showCheckout, setShowCheckout] = useState(false)
  const [currency] = useState<"GBP" | "USD">("GBP")
  const router = useRouter()

  useEffect(() => {
    async function loadBillingData() {
      const supabase = createClient()

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
          router.push("/auth/login")
          return
        }

        const { data: profileData } = await supabase
          .from("profiles")
          .select("organization_id")
          .eq("id", user.id)
          .single()

        if (!profileData) return

        const { data: subscriptionData } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("organization_id", profileData.organization_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()

        if (!subscriptionData) {
          const { data: newSub } = await supabase
            .from("subscriptions")
            .insert({
              organization_id: profileData.organization_id,
              plan_name: "starter",
              status: "active",
              current_period_start: new Date().toISOString(),
              current_period_end: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString(),
            })
            .select()
            .single()

          if (newSub) {
            setSubscription(newSub)
          } else {
            setSubscription({
              id: "temp",
              plan_name: "starter",
              status: "active",
              current_period_start: new Date().toISOString(),
              current_period_end: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString(),
            })
          }
        } else {
          setSubscription(subscriptionData)
        }
      } catch (error) {
        console.error("Error loading billing data:", error)
        setSubscription({
          id: "temp",
          plan_name: "starter",
          status: "active",
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString(),
        })
      } finally {
        setLoading(false)
      }
    }

    loadBillingData()
  }, [router])

  const handleUpgrade = (planId: string) => {
    try {
      const calculatedPriceId = getStripePriceId(planId as "growth" | "scale", billingInterval, currency)
      console.log(
        "[v0] Upgrade clicked - Plan:",
        planId,
        "Interval:",
        billingInterval,
        "Currency:",
        currency,
        "PriceId:",
        calculatedPriceId,
      )
      setPriceId(calculatedPriceId)
      setShowCheckout(true)
    } catch (error) {
      console.error("Error opening checkout:", error)
      alert("There was an error opening checkout. Please refresh and try again.")
    }
  }

  const handleChangePlan = async (planId: string) => {
    alert("Please use the main billing page to change your subscription plan.")
    router.push("/admin/profile/billing")
  }

  if (loading) {
    return <div className="flex justify-center py-8">Loading billing information...</div>
  }

  const currentPlanName = subscription?.plan_name?.toLowerCase() || "starter"
  const plans = {
    starter: {
      name: "Starter",
      priceMonthly: 0,
      maxTemplates: 3,
      maxTeamMembers: 5,
      maxAdmins: 1,
      maxReportSubmissions: 50,
    },
    growth: {
      name: "Growth",
      priceMonthly: 9,
      priceYearly: 96,
      maxTemplates: 10,
      maxTeamMembers: 25,
      maxAdmins: 3,
      maxReportSubmissions: null,
    },
    scale: {
      name: "Scale",
      priceMonthly: 16,
      priceYearly: 180,
      maxTemplates: 20,
      maxTeamMembers: 75,
      maxAdmins: 7,
      maxReportSubmissions: null,
    },
  }

  const currentProduct = plans[currentPlanName as keyof typeof plans] || plans.starter
  const isFreePlan = currentPlanName === "starter"

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Billing & Subscription</h1>
        <p className="text-muted-foreground mt-2">Manage your subscription and billing information</p>
      </div>

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Current Plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                {!isFreePlan && <Crown className="w-6 h-6 text-yellow-500" />}
                <h3 className="text-2xl font-bold">{currentProduct.name}</h3>
                <Badge variant="default">Active</Badge>
              </div>
              <p className="text-muted-foreground mb-4">
                £{currentProduct.priceMonthly}/month •{currentProduct.maxTemplates} templates •
                {currentProduct.maxTeamMembers} team members
              </p>
              {!isFreePlan && subscription?.current_period_end && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Active until {new Date(subscription.current_period_end).toLocaleDateString()}
                  </p>
                </div>
              )}
              {isFreePlan && (
                <p className="text-sm text-muted-foreground">
                  All organizations start with the Starter plan. Upgrade anytime to unlock premium features.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Available Plans</CardTitle>
          <CardDescription>Choose the plan that fits your needs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <Tabs value={billingInterval} onValueChange={(v) => setBillingInterval(v as "monthly" | "yearly")}>
              <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
                <TabsTrigger value="yearly">
                  Yearly
                  <Badge variant="secondary" className="ml-2 bg-green-100 text-green-800 text-xs">
                    Save up to 20%
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Growth Plan */}
            <div
              className={`border rounded-lg p-6 ${currentPlanName === "growth" ? "border-primary bg-primary/5" : "border-accent bg-accent/5"}`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">Growth</h3>
                {currentPlanName === "growth" && <Badge>Current</Badge>}
              </div>

              <div className="mb-2">
                <span className="text-3xl font-bold">£{billingInterval === "yearly" ? "9" : "9"}</span>
                <span className="text-lg font-normal text-muted-foreground">/month</span>
              </div>
              {billingInterval === "yearly" && <p className="text-sm text-muted-foreground mb-2">Billed £96 yearly</p>}

              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                <p className="text-sm font-semibold text-green-800">First month free trial</p>
              </div>

              <p className="text-sm text-muted-foreground mb-4">Ideal for growing small-medium businesses</p>

              <ul className="space-y-2 mb-6">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-sm">3 admin/manager accounts</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-sm">Up to 25 team members</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-sm">10 task templates</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-sm">Unlimited report submissions</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-sm">90-day report storage</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-sm font-semibold">⚡ Recurring Task Automation</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-sm font-semibold">📅 Multi-Day Scheduling</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-sm font-semibold">🎨 Custom Business Branding</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-sm font-semibold">📧 Email Notifications</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-sm font-semibold">🔗 Contractor Link Share</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-sm font-semibold">📸 Photo Upload on Reports</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-sm font-semibold">🕐 Business Hours Integration</span>
                </li>
              </ul>

              {currentPlanName === "growth" ? (
                <Button variant="outline" className="w-full bg-transparent" disabled>
                  Current Plan
                </Button>
              ) : isFreePlan ? (
                <Button className="w-full" onClick={() => handleUpgrade("growth")}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Upgrade to Growth
                </Button>
              ) : currentPlanName === "scale" ? (
                <Button variant="outline" className="w-full bg-transparent" onClick={() => handleChangePlan("growth")}>
                  <ArrowDownCircle className="w-4 h-4 mr-2" />
                  Downgrade to Growth
                </Button>
              ) : null}
            </div>

            {/* Scale Plan */}
            <div
              className={`border rounded-lg p-6 ${currentPlanName === "scale" ? "border-primary bg-primary/5" : "border-border"}`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">Scale</h3>
                {currentPlanName === "scale" && <Badge>Current</Badge>}
              </div>

              <div className="mb-2">
                <span className="text-3xl font-bold">£{billingInterval === "yearly" ? "16" : "16"}</span>
                <span className="text-lg font-normal text-muted-foreground">/month</span>
              </div>
              {billingInterval === "yearly" && <p className="text-sm text-muted-foreground mb-2">Billed £180 yearly</p>}

              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                <p className="text-sm font-semibold text-green-800">First month free trial</p>
              </div>

              <p className="text-sm text-muted-foreground mb-4">Perfect for large-scale operations</p>

              <ul className="space-y-2 mb-6">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-sm">7 admin/manager accounts</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-sm">Up to 75 team members</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-sm">20 task templates</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-sm">Unlimited report submissions</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-sm">90-day report storage</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-sm font-semibold">⚡ Recurring Task Automation</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-sm font-semibold">📅 Multi-Day Scheduling</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-sm font-semibold">🎨 Custom Business Branding</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-sm font-semibold">📧 Email Notifications</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-sm font-semibold">🔗 Contractor Link Share</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-sm font-semibold">📸 Photo Upload on Reports</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-sm font-semibold">🕐 Business Hours Integration</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-sm font-semibold">🔄 Report Deletion Recovery (via support)</span>
                </li>
              </ul>

              {currentPlanName === "scale" ? (
                <Button variant="outline" className="w-full bg-transparent" disabled>
                  Current Plan
                </Button>
              ) : isFreePlan || currentPlanName === "growth" ? (
                <Button className="w-full" onClick={() => handleUpgrade("scale")}>
                  <ArrowUpCircle className="w-4 h-4 mr-2" />
                  Upgrade to Scale
                </Button>
              ) : null}
            </div>
          </div>

          {!isFreePlan && (
            <div className="mt-6 p-4 bg-muted rounded-lg border">
              <p className="text-sm text-muted-foreground">
                <AlertCircle className="w-4 h-4 inline mr-2" />
                Need to downgrade to Starter? Please contact our support team for assistance with plan downgrades to the
                free tier.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {showCheckout && priceId && (
        <StripeCheckout
          priceId={priceId}
          onClose={() => {
            setShowCheckout(false)
            setPriceId(null)
          }}
        />
      )}
    </div>
  )
}
