"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CreditCard, CheckCircle, Calendar, AlertCircle, Crown, Sparkles } from "lucide-react"
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

export const dynamic = "force-dynamic"

export default function BillingPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)
  const [showCheckout, setShowCheckout] = useState(false)
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
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(1)
          .single()

        if (subscriptionData) {
          console.log("[v0] Subscription data loaded:", subscriptionData)
          setSubscription(subscriptionData)
        }
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
  const isSubscriptionActive =
    subscription?.status === "active" &&
    subscription?.current_period_end &&
    new Date(subscription.current_period_end) > new Date()

  return (
    <div className="max-w-4xl mx-auto space-y-8">
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
          {currentProduct ? (
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  {currentProduct.name !== "Free" && <Crown className="w-6 h-6 text-yellow-500" />}
                  <h3 className="text-2xl font-bold">{currentProduct.name}</h3>
                  <Badge variant={isSubscriptionActive ? "default" : "secondary"}>
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
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {isSubscriptionActive ? "Active until" : "Expired on"}{" "}
                      {new Date(subscription.current_period_end).toLocaleDateString()}
                    </p>
                    {subscription.current_period_start && (
                      <p className="text-sm text-muted-foreground">
                        Started: {new Date(subscription.current_period_start).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                )}
                {isSubscriptionActive && currentProduct.name !== "Free" && (
                  <div className="mt-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
                    <p className="text-sm text-primary font-medium">✨ Premium Features Enabled</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Custom branding, unlimited templates, and priority support are now available.
                    </p>
                  </div>
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

      {/* Available Plans */}
      <Card>
        <CardHeader>
          <CardTitle>Available Plans</CardTitle>
          <CardDescription>Choose the plan that fits your needs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            {SUBSCRIPTION_PRODUCTS.map((plan) => {
              const isCurrent = currentProduct?.id === plan.id && isSubscriptionActive
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
