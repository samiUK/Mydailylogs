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
import { SUBSCRIPTION_PRODUCTS, formatPrice } from "@/lib/subscription-products"
import StripeCheckout from "@/components/stripe-checkout"
import { changeSubscriptionPlan } from "@/app/actions/stripe"

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
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)
  const [billingInterval, setBillingInterval] = useState<"month" | "year">("year") // Added billing interval state, defaulting to yearly
  const [showCheckout, setShowCheckout] = useState(false)
  const [changingPlan, setChangingPlan] = useState<string | null>(null)
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
      setSelectedPlanId(planId)
      setShowCheckout(true)
    } catch (error) {
      console.error("Error opening checkout:", error)
      alert("There was an error opening checkout. Please refresh and try again.")
    }
  }

  const handleChangePlan = async (planId: string) => {
    const targetPlan = SUBSCRIPTION_PRODUCTS.find((p) => p.id === planId)
    if (!targetPlan) {
      alert("Invalid plan selected")
      return
    }

    if (
      !confirm(
        `Are you sure you want to switch to the ${targetPlan.name} plan? Your billing will be adjusted accordingly.`,
      )
    ) {
      return
    }

    setChangingPlan(planId)
    try {
      const result = await changeSubscriptionPlan(planId)
      if (result.success) {
        alert("Plan changed successfully! Your new features are now available.")
        window.location.reload()
      } else {
        throw new Error("Plan change was not successful")
      }
    } catch (error) {
      console.error("Error changing plan:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to change plan. Please try again."
      alert(errorMessage)
    } finally {
      setChangingPlan(null)
    }
  }

  if (loading) {
    return <div className="flex justify-center py-8">Loading billing information...</div>
  }

  const currentPlanName = subscription?.plan_name?.toLowerCase() || "starter"
  const currentProduct = SUBSCRIPTION_PRODUCTS.find((p) => p.id === currentPlanName) || SUBSCRIPTION_PRODUCTS[0]
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
                {formatPrice(currentProduct.priceMonthly)}/month •
                {currentProduct.maxTemplates === -1 ? " Unlimited" : ` ${currentProduct.maxTemplates}`} templates •
                {currentProduct.maxTeamMembers === -1 ? " Unlimited" : ` ${currentProduct.maxTeamMembers}`} team members
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
              {!isFreePlan && (
                <div className="mt-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
                  <p className="text-sm text-primary font-medium">✨ Premium Features Enabled</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Custom branding, task automation, and advanced reporting are now available.
                  </p>
                </div>
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
            <Tabs value={billingInterval} onValueChange={(v) => setBillingInterval(v as "month" | "year")}>
              <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
                <TabsTrigger value="month">Monthly</TabsTrigger>
                <TabsTrigger value="year">
                  Yearly
                  <Badge variant="secondary" className="ml-2 bg-green-100 text-green-800 text-xs">
                    Save up to 20%
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {SUBSCRIPTION_PRODUCTS.filter((plan) => plan.id !== "starter").map((plan) => {
              const isCurrent = currentProduct?.id === plan.id
              const isUpgrade = plan.priceMonthly > currentProduct.priceMonthly
              const isDowngrade = plan.priceMonthly < currentProduct.priceMonthly && !isFreePlan

              const displayPrice = billingInterval === "year" ? plan.priceYearly : plan.priceMonthly
              const monthlyEquivalent = billingInterval === "year" ? plan.priceYearly / 12 : plan.priceMonthly

              return (
                <div
                  key={plan.id}
                  className={`border rounded-lg p-6 ${
                    isCurrent
                      ? "border-primary bg-primary/5"
                      : plan.id === "growth"
                        ? "border-accent bg-accent/5"
                        : "border-border"
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold">{plan.name}</h3>
                    {isCurrent && <Badge>Current</Badge>}
                  </div>

                  <div className="mb-2">
                    <span className="text-3xl font-bold">{formatPrice(Math.round(monthlyEquivalent))}</span>
                    <span className="text-lg font-normal text-muted-foreground">/month</span>
                  </div>
                  {billingInterval === "year" && (
                    <p className="text-sm text-muted-foreground mb-2">Billed {formatPrice(displayPrice)} yearly</p>
                  )}

                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                    <p className="text-sm font-semibold text-green-800">First month free trial</p>
                  </div>

                  <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>

                  <ul className="space-y-2 mb-6">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                      <span className="text-sm">{plan.maxAdmins} admin accounts</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                      <span className="text-sm">Up to {plan.maxTeamMembers} team members</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                      <span className="text-sm">{plan.maxTemplates} task templates</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                      <span className="text-sm">
                        {plan.maxReportSubmissions
                          ? `${plan.maxReportSubmissions} report submissions`
                          : "Unlimited report submissions"}
                      </span>
                    </li>
                    {plan.features.taskAutomation && (
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="text-sm font-semibold">⚡ Task Automation (Recurring Tasks)</span>
                      </li>
                    )}
                    {plan.features.customBranding && (
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="text-sm font-semibold">🎨 Custom Business Branding</span>
                      </li>
                    )}
                    {plan.features.contractorLinkShare && (
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="text-sm font-semibold">🔗 Contractor Link Share</span>
                      </li>
                    )}
                    {plan.features.photoUpload && (
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="text-sm font-semibold">📸 Photo Upload on Reports</span>
                      </li>
                    )}
                    {plan.features.reportDeletionRecovery && (
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="text-sm font-semibold">🔄 Report Deletion Recovery (via support)</span>
                      </li>
                    )}
                  </ul>

                  {isCurrent && (
                    <Button variant="outline" className="w-full bg-transparent" disabled>
                      Current Plan
                    </Button>
                  )}

                  {!isCurrent && isFreePlan && (
                    <Button
                      className="w-full"
                      onClick={() => handleUpgrade(plan.id)}
                      disabled={changingPlan === plan.id}
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Upgrade to {plan.name}
                    </Button>
                  )}

                  {!isCurrent && !isFreePlan && isUpgrade && (
                    <Button
                      className="w-full"
                      onClick={() => handleChangePlan(plan.id)}
                      disabled={changingPlan === plan.id}
                    >
                      {changingPlan === plan.id ? (
                        "Processing..."
                      ) : (
                        <>
                          <ArrowUpCircle className="w-4 h-4 mr-2" />
                          Upgrade to {plan.name}
                        </>
                      )}
                    </Button>
                  )}

                  {!isCurrent && !isFreePlan && isDowngrade && (
                    <Button
                      variant="outline"
                      className="w-full bg-transparent"
                      onClick={() => handleChangePlan(plan.id)}
                      disabled={changingPlan === plan.id}
                    >
                      {changingPlan === plan.id ? (
                        "Processing..."
                      ) : (
                        <>
                          <ArrowDownCircle className="w-4 h-4 mr-2" />
                          Downgrade to {plan.name}
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )
            })}
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

      {showCheckout && selectedPlanId && (
        <StripeCheckout
          productId={selectedPlanId}
          billingInterval={billingInterval}
          onClose={() => {
            setShowCheckout(false)
            setSelectedPlanId(null)
          }}
        />
      )}
    </div>
  )
}
