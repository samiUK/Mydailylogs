"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, CreditCard, Download, Calendar, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"

interface SubscriptionPlan {
  id: string
  name: string
  price_monthly: number
  max_templates: number
  max_team_members: number
  features: any
}

interface Subscription {
  id: string
  plan_id: string
  status: string
  current_period_start: string
  current_period_end: string
  cancel_at_period_end: boolean
  subscription_plans: SubscriptionPlan
}

interface BillingHistory {
  id: string
  amount: number
  currency: string
  status: string
  invoice_date: string
}

export default function BillingPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [billingHistory, setBillingHistory] = useState<BillingHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    async function loadBillingData() {
      const supabase = createClient()

      try {
        // Get current user and organization
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

        // Load subscription plans
        const { data: plansData } = await supabase
          .from("subscription_plans")
          .select("*")
          .eq("is_active", true)
          .order("price_monthly")

        if (plansData) setPlans(plansData)

        // Load current subscription
        const { data: subscriptionData } = await supabase
          .from("subscriptions")
          .select(`
            *,
            subscription_plans (*)
          `)
          .eq("organization_id", profile.organization_id)
          .eq("status", "active")
          .single()

        if (subscriptionData) setSubscription(subscriptionData)

        // Load billing history
        const { data: billingData } = await supabase
          .from("billing_history")
          .select("*")
          .eq("organization_id", profile.organization_id)
          .order("invoice_date", { ascending: false })
          .limit(10)

        if (billingData) setBillingHistory(billingData)
      } catch (error) {
        console.error("Error loading billing data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadBillingData()
  }, [router])

  if (loading) {
    return <div className="flex justify-center py-8">Loading billing information...</div>
  }

  const currentPlan = subscription?.subscription_plans
  const isFreePlan = !subscription || currentPlan?.name === "Free"

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
          {currentPlan ? (
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-2xl font-bold">{currentPlan.name}</h3>
                  <Badge variant={subscription?.status === "active" ? "default" : "destructive"}>
                    {subscription?.status}
                  </Badge>
                </div>
                <p className="text-muted-foreground mb-4">
                  £{currentPlan.price_monthly}/month • {currentPlan.max_templates} templates •{" "}
                  {currentPlan.max_team_members} team members
                </p>
                {subscription?.current_period_end && (
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {subscription.cancel_at_period_end ? "Cancels" : "Renews"} on{" "}
                    {new Date(subscription.current_period_end).toLocaleDateString()}
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

      {/* Available Plans */}
      <Card>
        <CardHeader>
          <CardTitle>Available Plans</CardTitle>
          <CardDescription>View subscription plan options (Payment integration coming soon)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const isCurrent = currentPlan?.id === plan.id
              const isFreePlan = plan.name === "Free"

              return (
                <div
                  key={plan.id}
                  className={`border rounded-lg p-6 ${isCurrent ? "border-accent bg-accent/5" : "border-border"}`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold">{plan.name}</h3>
                    {isCurrent && <Badge>Current</Badge>}
                  </div>

                  <div className="text-3xl font-bold mb-2">
                    £{plan.price_monthly}
                    <span className="text-lg font-normal text-muted-foreground">/month</span>
                  </div>

                  <ul className="space-y-2 mb-6">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-accent" />
                      {plan.max_templates} Templates
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-accent" />
                      {plan.max_team_members} Team Members
                    </li>
                    {plan.features?.reports_branding === "custom" && (
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-accent" />
                        Custom Branding
                      </li>
                    )}
                    {plan.features?.priority_support && (
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-accent" />
                        Priority Support
                      </li>
                    )}
                    {plan.features?.advanced_analytics && (
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-accent" />
                        Advanced Analytics
                      </li>
                    )}
                  </ul>

                  {!isCurrent && !isFreePlan && (
                    <Button variant="outline" className="w-full bg-transparent" disabled>
                      Coming Soon
                    </Button>
                  )}

                  {isFreePlan && !isCurrent && (
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

      {/* Billing History */}
      {billingHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              Billing History
            </CardTitle>
            <CardDescription>Your recent invoices and payments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {billingHistory.map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">
                      £{invoice.amount} {invoice.currency.toUpperCase()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(invoice.invoice_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={invoice.status === "paid" ? "default" : "destructive"}>{invoice.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
