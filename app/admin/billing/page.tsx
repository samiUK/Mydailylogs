"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CreditCard, CheckCircle, Calendar, Crown, Sparkles, ArrowUpCircle, ArrowDownCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { getStripePriceId } from "@/lib/stripe-prices"
import StripeCheckout from "@/components/stripe-checkout"
import { useToast } from "@/hooks/use-toast"
import { SubscriptionCancelDialog } from "@/components/subscription-cancel-dialog"

interface Subscription {
  id: string
  plan_name: string
  status: string
  current_period_start: string
  current_period_end: string
  stripe_subscription_id?: string
  cancel_at_period_end?: boolean
  is_trial?: boolean
  trial_ends_at?: string
}

export const dynamic = "force-dynamic"

export default function BillingPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [priceId, setPriceId] = useState<string | null>(null)
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">("yearly")
  const [showCheckout, setShowCheckout] = useState(false)
  const [currency] = useState<"GBP" | "USD">("GBP")
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)
  const { toast } = useToast()
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
      toast({
        title: "Error",
        description: "There was an error opening checkout. Please refresh and try again.",
        variant: "destructive",
      })
    }
  }

  const handleChangePlan = async (planId: string) => {
    toast({
      title: "Change Plan",
      description: "Please use the main billing page to change your subscription plan.",
    })
    router.push("/admin/billing")
  }

  const handleCancelSubscription = () => {
    const currentPlan = subscription?.plan_name as "starter" | "growth" | "scale"
    const planFeatures = currentPlan ? plans[currentPlan] : undefined

    setShowCancelDialog(true)
  }

  const confirmCancelSubscription = async () => {
    if (!subscription?.stripe_subscription_id) return

    setCancelLoading(true)

    try {
      const response = await fetch("/api/subscriptions/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId: subscription.stripe_subscription_id }),
      })

      if (response.ok) {
        const data = await response.json()
        toast({
          title: "Subscription Cancelled",
          description: data.message || "Your subscription has been cancelled successfully.",
          variant: "default",
        })
        setShowCancelDialog(false)
        setTimeout(() => {
          window.location.reload()
        }, 1500)
      } else {
        const error = await response.json()
        toast({
          title: "Cancellation Failed",
          description: error.error || "Failed to cancel subscription. Please try again.",
          variant: "destructive",
        })
        setShowCancelDialog(false)
      }
    } catch (error) {
      console.error("Error cancelling subscription:", error)
      toast({
        title: "Error",
        description: "Failed to cancel subscription. Please try again.",
        variant: "destructive",
      })
      setShowCancelDialog(false)
    } finally {
      setCancelLoading(false)
    }
  }

  const handleReactivateSubscription = async () => {
    if (!subscription?.stripe_subscription_id) return

    try {
      const response = await fetch("/api/subscriptions/reactivate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId: subscription.stripe_subscription_id }),
      })

      if (response.ok) {
        toast({
          title: "Subscription Reactivated",
          description: "Your subscription has been reactivated successfully.",
          variant: "default",
        })
        setTimeout(() => {
          window.location.reload()
        }, 1500)
      } else {
        const error = await response.json()
        toast({
          title: "Reactivation Failed",
          description: error.error || "Failed to reactivate subscription. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error reactivating subscription:", error)
      toast({
        title: "Error",
        description: "Failed to reactivate subscription. Please try again.",
        variant: "destructive",
      })
    }
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
      priceMonthly: 8,
      priceYearly: 96,
      maxTemplates: 10,
      maxTeamMembers: 25,
      maxAdmins: 3, // Updated to show 3 managers total (admin is 1st)
      maxReportSubmissions: null,
    },
    scale: {
      name: "Scale",
      priceMonthly: 16,
      priceYearly: 180,
      maxTemplates: 20,
      maxTeamMembers: 100,
      maxAdmins: 7, // Updated to show 7 managers total (admin is 1st)
      maxReportSubmissions: null,
    },
  }

  const currentProduct = plans[currentPlanName as keyof typeof plans] || plans.starter
  const isFreePlan = currentPlanName === "starter"

  const hasStripeSubscription = subscription?.stripe_subscription_id || subscription?.status === "trialing"
  const canManageSubscription = !isFreePlan && hasStripeSubscription
  const isCancelled = subscription?.cancel_at_period_end === true
  const isTrial = subscription?.is_trial === true || subscription?.status === "trialing"

  return (
    <div className="container mx-auto py-8 px-4">
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
                <Badge variant="default">{isTrial ? "Trial" : "Active"}</Badge>
                {isCancelled && <Badge variant="destructive">Cancels at period end</Badge>}
              </div>
              <p className="text-muted-foreground mb-4">
                £{currentProduct.priceMonthly}/month •{currentProduct.maxTemplates} templates •
                {currentProduct.maxTeamMembers} team members
              </p>
              {!isFreePlan && subscription?.current_period_end && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {isTrial ? "Trial ends" : "Active until"}{" "}
                    {new Date(subscription.current_period_end).toLocaleDateString()}
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

          {canManageSubscription && (
            <div className="mt-6 pt-6 border-t space-y-3">
              <h4 className="font-semibold text-sm text-muted-foreground">Subscription Management</h4>
              <div className="flex flex-wrap gap-3">
                {!isCancelled ? (
                  <Button
                    variant="outline"
                    onClick={handleCancelSubscription}
                    className="text-destructive hover:text-destructive bg-transparent"
                  >
                    {isTrial ? "Cancel Trial" : "Cancel Subscription"}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={handleReactivateSubscription}
                    style={
                      {
                        color: "var(--brand-primary)",
                        borderColor: "var(--brand-primary)",
                      } as React.CSSProperties
                    }
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "var(--brand-accent-bg)"
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = ""
                    }}
                  >
                    Reactivate Subscription
                  </Button>
                )}
              </div>
              {isTrial && (
                <p className="text-xs text-muted-foreground">
                  You're currently on a free trial. Cancel anytime with no charges.
                </p>
              )}
            </div>
          )}
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
                <span className="text-3xl font-bold">£{billingInterval === "yearly" ? "8" : "8"}</span>
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
                  <span className="text-sm">3 managers (admin is 1st)</span>
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
                  <span className="text-sm font-semibold">⚡ Task Automation (Recurring Tasks)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-sm font-semibold">🎨 Custom Business Branding</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-sm font-semibold">🔗 Contractor Link Share</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-sm font-semibold">📸 Photo Upload on Reports</span>
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
                <span className="text-3xl font-bold">£{billingInterval === "yearly" ? "15" : "16"}</span>
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
                  <span className="text-sm">7 managers (admin is 1st)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-sm">Up to 100 team members</span>
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
                  <span className="text-sm font-semibold">⚡ Task Automation (Recurring Tasks)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-sm font-semibold">🎨 Custom Business Branding</span>
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

      <SubscriptionCancelDialog
        isOpen={showCancelDialog}
        onClose={() => setShowCancelDialog(false)}
        onConfirm={confirmCancelSubscription}
        isTrial={isTrial}
        loading={cancelLoading}
        planName={currentProduct.name}
        trialEndsAt={subscription?.trial_ends_at}
        currentPeriodEnd={subscription?.current_period_end}
        currentPlanFeatures={{
          maxTemplates: currentProduct.maxTemplates,
          maxTeamMembers: currentProduct.maxTeamMembers,
          maxAdmins: currentProduct.maxAdmins,
          maxReportSubmissions: currentProduct.maxReportSubmissions,
        }}
      />
    </div>
  )
}
