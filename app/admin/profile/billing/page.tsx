"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, CreditCard, Download, Calendar, AlertCircle, Sparkles, ExternalLink, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { SUBSCRIPTION_PRODUCTS, formatPrice } from "@/lib/subscription-products"
import StripeCheckout from "@/components/stripe-checkout"
import { cancelSubscription, createBillingPortalSession } from "@/app/actions/stripe"

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
  const [subscription, setSubscription] = useState<any | null>(null)
  const [billingHistory, setBillingHistory] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)
  const [showCheckout, setShowCheckout] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const router = useRouter()

  useEffect(() => {
    loadBillingData()
  }, [])

  async function loadBillingData() {
    const supabase = createClient()
    setError(null)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/auth/login")
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single()

      if (profileError || !profile?.organization_id) {
        setError("Unable to load organization information")
        return
      }

      setOrganizationId(profile.organization_id)

      const { data: subscriptionData, error: subError } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("organization_id", profile.organization_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (subError) {
        console.error("[v0] Error fetching subscription:", subError)
      }

      let finalSubscription = subscriptionData

      if (!subscriptionData) {
        const { data: newSub, error: insertError } = await supabase
          .from("subscriptions")
          .insert({
            organization_id: profile.organization_id,
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
      setError("Failed to load billing information. Please refresh the page.")
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
    setError(null)
    setSuccess(null)
    setSelectedPlanId(planId)
    setShowCheckout(true)
  }

  const handleCancel = async () => {
    if (
      !subscription ||
      !confirm("Are you sure you want to cancel your subscription? You'll lose access to premium features.")
    ) {
      return
    }

    setProcessing(true)
    setError(null)

    try {
      await cancelSubscription(subscription.id)
      setSuccess("Subscription cancelled successfully. Changes will take effect at the end of your billing period.")
      await loadBillingData()
    } catch (error: any) {
      setError(error.message || "Failed to cancel subscription. Please try again or contact support.")
    } finally {
      setProcessing(false)
    }
  }

  const handleManageBilling = async () => {
    setProcessing(true)
    setError(null)

    try {
      const portalUrl = await createBillingPortalSession()
      window.open(portalUrl, "_blank")
    } catch (error: any) {
      setError(error.message || "Failed to open billing portal. Please try again.")
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
      setError("Invoice not available for this payment")
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

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
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
                  {formatPrice(currentProduct.priceMonthly)}/month
                </p>
                <div className="space-y-2 mb-4">
                  <p className="text-sm text-muted-foreground">
                    • {currentProduct.maxTemplates === -1 ? "Unlimited" : currentProduct.maxTemplates} templates
                  </p>
                  <p className="text-sm text-muted-foreground">
                    • {currentProduct.maxTeamMembers === -1 ? "Unlimited" : currentProduct.maxTeamMembers} team members
                  </p>
                  <p className="text-sm text-muted-foreground">
                    • {currentProduct.maxAdmins} admin account{currentProduct.maxAdmins > 1 ? "s" : ""}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    • {currentProduct.maxStorage === -1 ? "Unlimited" : currentProduct.maxStorage} GB storage
                  </p>
                  <p className="text-sm text-muted-foreground">
                    • {currentProduct.maxAPIRequests === -1 ? "Unlimited" : currentProduct.maxAPIRequests} API requests
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
                    {formatPrice(plan.priceMonthly)}
                    <span className="text-lg font-normal text-muted-foreground">/month</span>
                  </div>

                  <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>

                  <ul className="space-y-2 flex-1">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-primary" />
                      <span className="text-sm">Basic Reporting</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-primary" />
                      <span className="text-sm">Advanced Reporting</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-primary" />
                      <span className="text-sm">Advanced Analytics</span>
                    </li>
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
                      <span className="text-sm">
                        {plan.maxStorage === -1 ? "Unlimited" : plan.maxStorage} GB storage
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-primary" />
                      <span className="text-sm">
                        {plan.maxAPIRequests === -1 ? "Unlimited" : plan.maxAPIRequests} API requests
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
                        {formatPrice(Math.abs(Number(payment.amount)) * 100)} {payment.currency?.toUpperCase()}
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

      {showCheckout && selectedPlanId && (
        <StripeCheckout
          productId={selectedPlanId}
          onClose={() => {
            setShowCheckout(false)
            setSelectedPlanId(null)
            loadBillingData()
          }}
        />
      )}
    </div>
  )
}
