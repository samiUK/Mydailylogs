"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, CreditCard, Download, Calendar, AlertCircle, Sparkles } from "lucide-react"
import { useRouter } from "next/navigation"
import { SUBSCRIPTION_PRODUCTS, formatPrice } from "@/lib/subscription-products"
import StripeCheckout from "@/components/stripe-checkout"

interface Subscription {
  id: string
  plan_name: string
  status: string
  current_period_start: string
  current_period_end: string
}

interface Payment {
  id: string
  amount: number
  currency: string
  status: string
  created_at: string
}

export default function BillingPage() {
  const [subscription, setSubscription] = useState<any | null>(null)
  const [billingHistory, setBillingHistory] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [isImpersonated, setIsImpersonated] = useState(false)
  const [impersonatedBy, setImpersonatedBy] = useState("")
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)
  const [showCheckout, setShowCheckout] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const checkImpersonation = () => {
      const isImpersonating = localStorage.getItem("masterAdminImpersonation") === "true"
      const impersonatedEmail = localStorage.getItem("impersonatedUserEmail") || ""
      setIsImpersonated(isImpersonating)
      setImpersonatedBy(impersonatedEmail)
    }

    checkImpersonation()

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

        const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single()

        if (!profile?.organization_id) return

        setOrganizationId(profile.organization_id)

        const { data: subscriptionData } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("organization_id", profile.organization_id)
          .eq("status", "active")
          .single()

        if (subscriptionData) setSubscription(subscriptionData)

        const { data: paymentsData } = await supabase
          .from("payments")
          .select("*")
          .eq("subscription_id", subscriptionData?.id)
          .order("created_at", { ascending: false })
          .limit(10)

        if (paymentsData) setBillingHistory(paymentsData)
      } catch (error) {
        console.error("Error loading billing data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadBillingData()
  }, [router])

  const handleUpgrade = (planId: string) => {
    setSelectedPlanId(planId)
    setShowCheckout(true)
  }

  if (loading) {
    return <div className="flex justify-center py-8">Loading billing information...</div>
  }

  const currentPlanName = subscription?.plan_name || "Free"
  const currentProduct = SUBSCRIPTION_PRODUCTS.find((p) => p.name === currentPlanName)

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {isImpersonated && (
        <div className="bg-orange-100 border-l-4 border-orange-500 p-4 rounded-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-orange-700">
                  <strong>IMPERSONATED SESSION</strong> - You are viewing this billing as: {impersonatedBy}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                localStorage.removeItem("masterAdminImpersonation")
                localStorage.removeItem("impersonatedUserEmail")
                localStorage.removeItem("impersonatedUserRole")
                localStorage.removeItem("impersonatedOrganizationId")
                window.location.href = "/masterdashboard"
              }}
              className="text-orange-700 hover:text-orange-900 text-sm font-medium"
            >
              Exit Impersonation
            </button>
          </div>
        </div>
      )}

      <div>
        <h1 className="text-3xl font-bold text-foreground">Billing & Subscription</h1>
        <p className="text-muted-foreground mt-2">Manage your subscription and billing information</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Current Plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentProduct ? (
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-2xl font-bold">{currentProduct.name}</h3>
                  <Badge variant={subscription?.status === "active" ? "default" : "secondary"}>
                    {subscription?.status || "free"}
                  </Badge>
                </div>
                <p className="text-muted-foreground mb-4">
                  {formatPrice(currentProduct.priceMonthly)}/month •
                  {currentProduct.maxTemplates === -1 ? " Unlimited" : ` ${currentProduct.maxTemplates}`} templates •
                  {currentProduct.maxTeamMembers === -1 ? " Unlimited" : ` ${currentProduct.maxTeamMembers}`} team
                  members
                </p>
                {subscription?.current_period_end && (
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Renews on {new Date(subscription.current_period_end).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Active Subscription</h3>
              <p className="text-muted-foreground mb-4">You're currently on the free plan with limited features.</p>
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
          <div className="grid md:grid-cols-3 gap-6">
            {SUBSCRIPTION_PRODUCTS.map((plan) => {
              const isCurrent = currentProduct?.id === plan.id
              const isFreePlan = plan.id === "free"

              return (
                <div
                  key={plan.id}
                  className={`border rounded-lg p-6 ${isCurrent ? "border-primary bg-primary/5" : "border-border"}`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold">{plan.name}</h3>
                    {isCurrent && <Badge>Current</Badge>}
                  </div>

                  <div className="text-3xl font-bold mb-2">
                    {formatPrice(plan.priceMonthly)}
                    <span className="text-lg font-normal text-muted-foreground">/month</span>
                  </div>

                  <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>

                  <ul className="space-y-2 mb-6">
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
                    {plan.features.customBranding && (
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-primary" />
                        <span className="text-sm">Custom Branding</span>
                      </li>
                    )}
                    {plan.features.prioritySupport && (
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-primary" />
                        <span className="text-sm">Priority Support</span>
                      </li>
                    )}
                    {plan.features.advancedAnalytics && (
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-primary" />
                        <span className="text-sm">Advanced Analytics</span>
                      </li>
                    )}
                    {plan.features.apiAccess && (
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-primary" />
                        <span className="text-sm">API Access</span>
                      </li>
                    )}
                  </ul>

                  {!isCurrent && !isFreePlan && (
                    <Button className="w-full" onClick={() => handleUpgrade(plan.id)}>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Upgrade to {plan.name}
                    </Button>
                  )}

                  {isCurrent && !isFreePlan && (
                    <Button variant="outline" className="w-full bg-transparent" disabled>
                      Current Plan
                    </Button>
                  )}

                  {isFreePlan && (
                    <Button variant="outline" className="w-full bg-transparent" disabled>
                      {isCurrent ? "Current Plan" : "Downgrade"}
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
              Billing History
            </CardTitle>
            <CardDescription>Your recent payments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {billingHistory.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">
                      {formatPrice(Number(payment.amount) * 100)} {payment.currency?.toUpperCase()}
                    </p>
                    <p className="text-sm text-muted-foreground">{new Date(payment.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={payment.status === "succeeded" ? "default" : "destructive"}>{payment.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {showCheckout && selectedPlanId && (
        <StripeCheckout
          productId={selectedPlanId}
          onClose={() => {
            setShowCheckout(false)
            setSelectedPlanId(null)
          }}
        />
      )}
    </div>
  )
}
