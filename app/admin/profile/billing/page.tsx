"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, CreditCard, Download, Calendar, AlertCircle, Sparkles, ExternalLink, Loader2 } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import StripeCheckout from "@/components/stripe-checkout"
import { SUBSCRIPTION_PRODUCTS, formatPrice } from "@/lib/subscription-products"
import { createBillingPortalSession } from "@/lib/stripe-utils" // Import the missing functions

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
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const [currency, setCurrency] = useState<"GBP" | "USD">("GBP")
  const [profile, setProfile] = useState<any | null>(null)
  const [billingPeriod, setBillingPeriod] = useState<string>("monthly")
  const [userId, setUserId] = useState<string | null>(null) // Added userId state
  const supabase = createClient() // Declare the supabase variable here

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
        console.error("[v0] Currency detection failed:", error)
      }
    }

    detectCurrency()
  }, [])

  useEffect(() => {
    loadBillingData()

    const planParam = searchParams.get("plan")
    if (planParam && (planParam === "growth" || planParam === "scale")) {
      setSelectedPlanId(planParam)
      setShowCheckout(true)
    }
  }, [searchParams])

  const formatPriceWithCurrency = (gbpPence: number) => {
    if (currency === "USD") {
      const usdPrice = gbpPence / 100 + 1
      return `$${usdPrice.toFixed(2)}`
    }
    return formatPrice(gbpPence)
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

      setUserId(user.id) // Store the actual user ID from auth

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
      console.error("[v0] Error loading billing data:", error)
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

  const handleUpgrade = (planId: string) => {
    setSelectedPlanId(planId)
    setShowCheckout(true)
  }

  const handleCancel = async () => {
    if (!subscription) return

    // Show detailed warning about consequences
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

      // Refresh subscription data
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

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2">Loading billing information...</span>
      </div>
    )
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

      {subscription?.status === "inactive" && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>Your subscription has been cancelled.</AlertDescription>
        </Alert>
      )}

      {subscription?.status === "active" && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <AlertDescription className="text-green-800">Your subscription is active.</AlertDescription>
        </Alert>
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
                  <h3 className="text-2xl font-bold">{currentProduct.name}</h3>
                  <Badge variant="default">Active</Badge>
                </div>
                <p className="text-lg font-semibold text-primary mb-2">
                  {formatPriceWithCurrency(currentProduct.priceMonthly)}/month
                </p>
                <div className="space-y-2 mb-4">
                  <p className="text-sm text-muted-foreground">
                    • {currentProduct.maxTemplates === -1 ? "Unlimited" : currentProduct.maxTemplates} Templates
                  </p>
                  <p className="text-sm text-muted-foreground">
                    • {currentProduct.maxTeamMembers === -1 ? "Unlimited" : currentProduct.maxTeamMembers} Team Members
                  </p>
                  <p className="text-sm text-muted-foreground">
                    •{" "}
                    {currentProduct.maxAdminAccounts === 1
                      ? "1 Admin"
                      : currentProduct.maxAdminAccounts === 3
                        ? "1 Admin + 2 Managers"
                        : currentProduct.maxAdminAccounts === 7
                          ? "1 Admin + 6 Managers"
                          : `${currentProduct.maxAdminAccounts} Admin/Manager Accounts`}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    • {currentProduct.maxReportSubmissions === null ? "Unlimited" : currentProduct.maxReportSubmissions}{" "}
                    Report Submissions
                  </p>
                  <p className="text-sm text-muted-foreground">
                    • {currentProduct.maxStorage === 1 ? "30-day" : "90-day"} report retention
                  </p>
                  <p className="text-sm text-muted-foreground">
                    •{" "}
                    {currentProduct.features.emailNotifications ? "Monthly report email delivery" : "No email delivery"}
                  </p>
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
                <Button variant="outline" onClick={handleManageBilling} disabled={processing}>
                  {processing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <ExternalLink className="w-4 h-4 mr-2" />
                  )}
                  Manage Billing
                </Button>
                <Button variant="destructive" onClick={handleCancel} disabled={processing}>
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
          <div className="grid md:grid-cols-2 gap-6">
            {SUBSCRIPTION_PRODUCTS.filter((plan) => plan.id !== "starter").map((plan) => {
              const isCurrent = currentProduct?.id === plan.id

              return (
                <div
                  key={plan.id}
                  className={`border rounded-lg p-6 ${
                    isCurrent ? "border-primary bg-primary/5" : "border-border"
                  } ${plan.id === "growth" ? "border-accent border-2 shadow-xl" : ""}`}
                >
                  {plan.id === "growth" && (
                    <Badge className="mb-2 bg-accent text-accent-foreground">Best for SMEs</Badge>
                  )}

                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold">{plan.name}</h3>
                    {isCurrent && <Badge>Current Plan</Badge>}
                  </div>

                  <div className="text-3xl font-bold mb-2">
                    {formatPriceWithCurrency(plan.priceMonthly)}
                    <span className="text-lg font-normal text-muted-foreground">/month</span>
                  </div>

                  <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>

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
                    {plan.id === "scale" && (
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-primary" />
                        <span className="text-sm font-semibold">Report Deletion Recovery (via support)</span>
                      </li>
                    )}
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-primary" />
                      <span className="text-sm">{plan.maxStorage === 1 ? "30-day" : "90-day"} report retention</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-primary" />
                      <span className="text-sm">
                        {plan.features.emailNotifications ? "Monthly email delivery" : "No email delivery"}
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-primary" />
                      <span className="text-sm">
                        {plan.maxTemplates === -1 ? "Unlimited" : plan.maxTemplates} Templates
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-primary" />
                      <span className="text-sm">
                        {plan.maxTeamMembers === -1 ? "Unlimited" : plan.maxTeamMembers} Team Members
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-primary" />
                      <span className="text-sm">
                        {plan.maxAdminAccounts === 1
                          ? "1 Admin"
                          : plan.maxAdminAccounts === 3
                            ? "1 Admin + 2 Managers"
                            : plan.maxAdminAccounts === 7
                              ? "1 Admin + 6 Managers"
                              : `${plan.maxAdminAccounts} Admin/Manager Accounts`}
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-primary" />
                      <span className="text-sm">
                        {plan.maxReportSubmissions === null ? "Unlimited" : plan.maxReportSubmissions} Report
                        Submissions
                      </span>
                    </li>
                  </ul>

                  {!isCurrent && (
                    <Button className="w-full" onClick={() => handleUpgrade(plan.id)} disabled={processing}>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Upgrade to {plan.name}
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
              <Download className="w-5 h-5" />
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
                        <Download className="w-4 h-4" />
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
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <ExternalLink className="w-4 h-4 mr-2" />
                  )}
                  Access Full Billing Portal
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {showCheckout && selectedPlanId && profile?.organization_id && userId && (
        <StripeCheckout
          productType={selectedPlanId as "growth" | "scale"}
          interval={billingPeriod as "month" | "year"}
          organizationId={profile.organization_id}
          userEmail={profile.email}
          userId={userId} // Using actual userId from auth
          userName={profile.full_name || profile.email}
          currency={currency}
          onClose={() => {
            setShowCheckout(false)
            setSelectedPlanId(null)
          }}
        />
      )}
    </div>
  )
}
