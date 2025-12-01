"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CreditCard, CheckCircle, Calendar, AlertCircle, Sparkles, ArrowUpCircle, X } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { getStripePriceId } from "@/lib/stripe-prices"
import StripeCheckout from "@/components/stripe-checkout"
import { toast } from "@/components/ui/use-toast"
import { createBillingPortalSession } from "@/lib/billing-portal" // Import the createBillingPortalSession function

interface Subscription {
  id: string
  plan_name: string
  status: string
  current_period_start: string
  current_period_end: string
  stripe_subscription_id?: string
}

interface Payment {
  id: string
  amount: number
  currency: string
  status: string
  created_at: string
  stripe_invoice_url?: string
  stripe_invoice_pdf?: string
}

export default function BillingPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [billingHistory, setBillingHistory] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [selectedPlanId, setSelectedPlanId] = useState<"growth" | "scale" | null>(null)
  const searchParams = useSearchParams()
  const [currency, setCurrency] = useState<"GBP" | "USD">("GBP")
  const [profile, setProfile] = useState<any | null>(null)
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly")
  const [userId, setUserId] = useState<string | null>(null)
  const [dataLoaded, setDataLoaded] = useState(false)
  const supabase = createClient()
  const [priceId, setPriceId] = useState<string | null>(null)

  const productType = selectedPlanId as "growth" | "scale" | null
  const interval = billingPeriod === "monthly" ? "month" : billingPeriod === "yearly" ? "year" : null

  useEffect(() => {
    const detectCurrency = async () => {
      try {
        const response = await fetch("https://ipapi.co/json/")
        if (response.ok) {
          const data = await response.json()
          const countryCode = data.country_code || "GB"
          setCurrency(countryCode === "GB" ? "GBP" : "USD")
        }
      } catch (error) {
        // Silent fail - defaults to GBP
      }
    }
    detectCurrency()
  }, [])

  useEffect(() => {
    const initialize = async () => {
      await loadBillingData()

      const planParam = searchParams.get("plan")
      if (planParam === "growth" || planParam === "scale") {
        console.log("[v0] URL param detected - plan:", planParam, "period:", billingPeriod, "currency:", currency)
        const calculatedPriceId = getStripePriceId(planParam, billingPeriod, currency)
        console.log("[v0] URL param checkout - priceId:", calculatedPriceId)
        console.log("[v0] Setting priceId and opening checkout from URL param")
        setPriceId(calculatedPriceId)
        setShowCheckout(true)
      }
    }
    initialize()
  }, [searchParams])

  const formatPriceWithCurrency = (gbpPence: number) => {
    if (currency === "USD") {
      const usdPrice = gbpPence / 100 + 1
      return `$${usdPrice.toFixed(2)}`
    }
    return `${gbpPence}p`
  }

  const router = useRouter()

  async function loadBillingData() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/auth/login")
        return
      }

      setUserId(user.id)

      const { data: userProfile, error: profileError } = await supabase
        .from("profiles")
        .select("organization_id, email, full_name")
        .eq("id", user.id)
        .single()

      if (profileError || !userProfile) {
        throw new Error("Unable to load organization information")
      }

      setProfile(userProfile)

      const { data: subscriptionData, error: subError } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("organization_id", userProfile.organization_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (subError) {
        console.error("[v0] Error fetching subscription:", subError)
        throw subError
      }

      let finalSubscription = subscriptionData

      if (!subscriptionData) {
        const { data: newSub, error: insertError } = await supabase
          .from("subscriptions")
          .insert({
            organization_id: userProfile.organization_id,
            plan_name: "starter",
            status: "active",
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString(),
          })
          .select()
          .single()

        if (!insertError && newSub) {
          finalSubscription = newSub
        } else {
          finalSubscription = {
            id: "temp",
            plan_name: "starter",
            status: "active",
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString(),
          }
        }
      }

      setSubscription(finalSubscription)

      if (finalSubscription?.id && finalSubscription.id !== "temp") {
        const { data: paymentsData } = await supabase
          .from("payments")
          .select("*")
          .eq("subscription_id", finalSubscription.id)
          .order("created_at", { ascending: false })
          .limit(20)

        if (paymentsData) setBillingHistory(paymentsData)
      }
    } catch (error) {
      console.error("[v0] Failed to load billing data:", error)
      toast({
        title: "Error",
        description: "Failed to load billing information. Please refresh the page.",
        variant: "destructive",
      })
      setLoading(false)
    } finally {
      setLoading(false)
      setDataLoaded(true)
    }
  }

  const handleUpgrade = (priceId: string) => {
    console.log("[v0] handleUpgrade called with priceId:", priceId)
    console.log("[v0] handleUpgrade stack trace:", new Error().stack)
    setPriceId(priceId)
    setShowCheckout(true)
  }

  const handleCancel = async () => {
    if (!subscription) return

    const confirmed = window.confirm(
      `⚠️ Cancel Subscription - Important Information\n\n` +
        `If you cancel your ${subscription.plan_name} subscription:\n\n` +
        `• Your subscription will remain active until ${new Date(subscription.current_period_end).toLocaleDateString()}\n` +
        `• After that, you'll be downgraded to the free Starter plan\n` +
        `• Only your last 3 templates will be kept (others will be archived)\n` +
        `• Only your last 50 reports will be retained (older ones will be deleted)\n` +
        `• You'll lose access to: Custom branding, advanced features, photo uploads\n\n` +
        `Are you sure you want to cancel?`,
    )

    if (!confirmed) return

    setProcessing(true)

    try {
      const response = await fetch("/api/subscriptions/cancel", {
        method: "POST",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to cancel subscription")
      }

      const { data: updatedSub } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("organization_id", profile?.organization_id)
        .single()

      if (updatedSub) {
        setSubscription(updatedSub)
      }

      alert(
        "✓ Subscription cancelled successfully. You'll have access until " +
          new Date(subscription.current_period_end).toLocaleDateString(),
      )
    } catch (error: any) {
      console.error("[v0] Error cancelling subscription:", error)
      alert("Failed to cancel subscription: " + error.message)
    } finally {
      setProcessing(false)
    }
  }

  const handleManageBilling = async () => {
    setProcessing(true)

    try {
      const portalUrl = await createBillingPortalSession()
      window.open(portalUrl, "_blank")
    } catch (error: any) {
      console.error(error.message || "Failed to open billing portal. Please try again.")
    } finally {
      setProcessing(false)
    }
  }

  const handleDownloadInvoice = async (payment: Payment) => {
    if (payment.stripe_invoice_pdf) {
      window.open(payment.stripe_invoice_pdf, "_blank")
    } else if (payment.stripe_invoice_url) {
      window.open(payment.stripe_invoice_url, "_blank")
    } else {
      console.error("Invoice not available for this payment")
    }
  }

  const handleChangePlan = async (newPlan: "growth" | "scale") => {
    if (!subscription || !dataLoaded) return

    const currentPlan = subscription.plan_name.split("-")[0].toLowerCase()

    if (currentPlan === newPlan) {
      toast({
        title: "Already on this plan",
        description: `You're currently subscribed to the ${newPlan.charAt(0).toUpperCase() + newPlan.slice(1)} plan.`,
      })
      return
    }

    const isUpgrade = currentPlan === "growth" && newPlan === "scale"
    const actionText = isUpgrade ? "upgrade to" : "downgrade to"
    const newPlanName = newPlan.charAt(0).toUpperCase() + newPlan.slice(1)

    const confirmed = window.confirm(
      `${isUpgrade ? "⬆️ Upgrade" : "⬇️ Downgrade"} Subscription\n\n` +
        `You're about to ${actionText} the ${newPlanName} plan.\n\n` +
        `${
          isUpgrade
            ? `• You'll be charged a prorated amount for the upgrade\n• New features will be available immediately\n• Your billing date stays the same`
            : `• You'll receive a prorated credit for the downgrade\n• Changes take effect at the end of your current billing period\n• You'll keep current plan features until then`
        }\n\n` +
        `Continue with ${actionText} ${newPlanName}?`,
    )

    if (!confirmed) return

    setProcessing(true)

    try {
      const response = await fetch("/api/subscriptions/change-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newPlan: `${newPlan}-${subscription.plan_name.includes("yearly") ? "yearly" : "monthly"}`,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to change plan")
      }

      toast({
        title: isUpgrade ? "Upgraded Successfully" : "Downgrade Scheduled",
        description: isUpgrade
          ? `You've been upgraded to ${newPlanName}. New features are now available!`
          : `You'll be downgraded to ${newPlanName} at the end of your billing period.`,
      })

      await loadBillingData()
    } catch (error) {
      console.error("Plan change error:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to change plan",
        variant: "destructive",
      })
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <X className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2">Loading billing information...</span>
      </div>
    )
  }

  const currentPlanName = subscription?.plan_name?.toLowerCase() || "starter"
  const isFreePlan = currentPlanName === "starter"

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Billing & Subscription</h1>
        <p className="text-muted-foreground mt-2">Manage your subscription and billing information</p>
      </div>

      {subscription?.status === "inactive" && (
        <div className="bg-destructive text-destructive-foreground rounded-lg p-4">
          <AlertCircle className="w-4 h-4" />
          <p className="ml-2">Your subscription has been cancelled.</p>
        </div>
      )}

      {subscription?.status === "active" && (
        <div className="bg-green-50 border-green-200 rounded-lg p-4">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <p className="ml-2 text-green-800">Your subscription is active.</p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Current Plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-2xl font-bold">
                    {currentPlanName.charAt(0).toUpperCase() + currentPlanName.slice(1)}
                  </h3>
                  <Badge variant="default">Active</Badge>
                </div>
                <p className="text-lg font-semibold text-primary mb-2">{formatPriceWithCurrency(100)}/month</p>
                <div className="space-y-2 mb-4">
                  <p className="text-sm text-muted-foreground">• Unlimited Templates</p>
                  <p className="text-sm text-muted-foreground">• Unlimited Team Members</p>
                  <p className="text-sm text-muted-foreground">• 1 Admin + 6 Managers Admin/Manager Accounts</p>
                  <p className="text-sm text-muted-foreground">• Unlimited Report Submissions</p>
                  <p className="text-sm text-muted-foreground">• 90-day report retention</p>
                  <p className="text-sm text-muted-foreground">• Monthly report email delivery</p>
                </div>

                {!isFreePlan && subscription?.current_period_end && (
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {subscription.status === "active"
                      ? `Renews on ${new Date(subscription.current_period_end).toLocaleDateString()}`
                      : `Expires on ${new Date(subscription.current_period_end).toLocaleDateString()}`}
                  </p>
                )}

                {isFreePlan && (
                  <p className="text-sm text-muted-foreground">
                    All organizations start with the Starter plan. Upgrade anytime to unlock premium features.
                  </p>
                )}
              </div>
            </div>

            {!isFreePlan && subscription?.status === "active" && (
              <div className="flex gap-3 pt-4 border-t">
                {currentPlanName === "growth" && (
                  <Button variant="default" onClick={() => handleChangePlan("scale")} disabled={processing}>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Upgrade to Scale
                  </Button>
                )}
                {currentPlanName === "scale" && (
                  <Button variant="outline" onClick={() => handleChangePlan("growth")} disabled={processing}>
                    Downgrade to Growth
                  </Button>
                )}
                <Button variant="outline" onClick={handleManageBilling} disabled={processing}>
                  {processing ? (
                    <X className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <ArrowUpCircle className="w-4 h-4 mr-2" />
                  )}
                  Manage Billing
                </Button>
                <Button variant="destructive" onClick={handleCancel} disabled={processing}>
                  {processing ? <X className="w-4 h-4 mr-2 animate-spin" /> : <X className="w-4 h-4 mr-2" />}
                  Cancel Subscription
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Available Plans</CardTitle>
          <CardDescription>Choose the plan that fits your needs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-3 bg-muted p-1 rounded-lg">
              <button
                onClick={() => setBillingPeriod("monthly")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  billingPeriod === "monthly"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingPeriod("yearly")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  billingPeriod === "yearly"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Yearly
                <Badge className="ml-2 bg-accent text-accent-foreground">Save 20%</Badge>
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {["growth", "scale"].map((plan) => {
              const isCurrent = currentPlanName === plan
              const displayPrice = billingPeriod === "yearly" ? 1200 : 100
              const monthlyEquivalent = billingPeriod === "yearly" ? Math.round(1200 / 12) : 100

              return (
                <div
                  key={plan}
                  className={`border rounded-lg p-6 ${
                    isCurrent ? "border-primary bg-primary/5" : "border-border"
                  } ${plan === "growth" ? "border-accent border-2 shadow-xl" : ""}`}
                >
                  {plan === "growth" && <Badge className="mb-2 bg-accent text-accent-foreground">Best for SMEs</Badge>}

                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold">{plan.charAt(0).toUpperCase() + plan.slice(1)}</h3>
                    {isCurrent && <Badge>Current Plan</Badge>}
                  </div>

                  <div className="mb-2">
                    <span className="text-3xl font-bold">{formatPriceWithCurrency(monthlyEquivalent)}</span>
                    <span className="text-lg font-normal text-muted-foreground">/month</span>
                  </div>

                  {billingPeriod === "yearly" && (
                    <p className="text-sm text-muted-foreground mb-4">
                      {formatPriceWithCurrency(displayPrice)} billed annually
                    </p>
                  )}

                  <p className="text-sm text-muted-foreground mb-4">Description for {plan}</p>

                  <ul className="space-y-2 flex-1">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-primary" />
                      <span className="text-sm font-semibold">⚡ Task Automation</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-primary" />
                      <span className="text-sm">Custom Business Branding</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-primary" />
                      <span className="text-sm">Email Notifications</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-primary" />
                      <span className="text-sm">Contractor Link Share</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-primary" />
                      <span className="text-sm">Photo Upload on Reports</span>
                    </li>
                    {plan === "scale" && (
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-primary" />
                        <span className="text-sm font-semibold">Report Deletion Recovery (via support)</span>
                      </li>
                    )}
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-primary" />
                      <span className="text-sm">90-day report retention</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-primary" />
                      <span className="text-sm">Monthly email delivery</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-primary" />
                      <span className="text-sm">Unlimited Templates</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-primary" />
                      <span className="text-sm">Unlimited Team Members</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-primary" />
                      <span className="text-sm">1 Admin + 6 Managers Admin/Manager Accounts</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-primary" />
                      <span className="text-sm">Unlimited Report Submissions</span>
                    </li>
                  </ul>

                  {!isCurrent && (
                    <Button
                      className="w-full"
                      onClick={() => {
                        console.log(
                          "[v0] Button clicked for plan:",
                          plan,
                          "period:",
                          billingPeriod,
                          "currency:",
                          currency,
                        )
                        try {
                          const priceId = getStripePriceId(plan as "growth" | "scale", billingPeriod, currency)
                          console.log("[v0] Calculated priceId:", priceId)
                          handleUpgrade(priceId)
                        } catch (error) {
                          console.error("[v0] Error getting price ID:", error)
                        }
                      }}
                      disabled={processing || !profile?.organization_id || !userId}
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Upgrade to {plan.charAt(0).toUpperCase() + plan.slice(1)}
                    </Button>
                  )}

                  {isCurrent && (
                    <Button variant="outline" className="w-full bg-transparent" disabled>
                      Current Plan
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {billingHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <X className="w-5 h-5" />
              Billing History & Invoices
            </CardTitle>
            <CardDescription>Your recent payments and downloadable invoices for compliance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {billingHistory.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <p className="font-medium">
                        {Number(payment.amount) < 0 ? "Refund: " : ""}
                        {formatPriceWithCurrency(Math.abs(Number(payment.amount)) * 100)}{" "}
                        {payment.currency?.toUpperCase()}
                      </p>
                      <Badge
                        variant={
                          payment.status === "succeeded" || payment.status === "completed"
                            ? "default"
                            : payment.status === "refunded"
                              ? "secondary"
                              : "destructive"
                        }
                      >
                        {payment.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(payment.created_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {(payment.stripe_invoice_pdf || payment.stripe_invoice_url) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadInvoice(payment)}
                        className="flex items-center gap-2"
                      >
                        <X className="w-4 h-4" />
                        Download Invoice
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {subscription?.stripe_subscription_id && (
              <div className="mt-6 pt-6 border-t">
                <p className="text-sm text-muted-foreground mb-3">
                  Need older invoices or receipts? Access your complete billing history through the Stripe portal.
                </p>
                <Button
                  variant="outline"
                  onClick={handleManageBilling}
                  disabled={processing}
                  className="w-full sm:w-auto bg-transparent"
                >
                  {processing ? (
                    <X className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <ArrowUpCircle className="w-4 h-4 mr-2" />
                  )}
                  Access Full Billing Portal
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {showCheckout && priceId && (
        <StripeCheckout
          priceId={priceId}
          onSuccess={() => {
            console.log("[v0] Checkout success - closing modal")
            setShowCheckout(false)
            setPriceId(null)
            toast({
              title: "Success",
              description: "Subscription updated successfully",
            })
          }}
          onCancel={() => {
            console.log("[v0] Checkout cancelled - closing modal")
            setShowCheckout(false)
            setPriceId(null)
          }}
        />
      )}
    </div>
  )
}
