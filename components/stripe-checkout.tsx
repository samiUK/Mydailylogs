"use client"

import { useState, useEffect } from "react"
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js"
import { loadStripe } from "@stripe/stripe-js"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { X } from "lucide-react"
import { calculateStripeFee } from "@/lib/stripe-fee-calculator"
import { STRIPE_PRICE_CONFIG } from "@/lib/stripe-prices"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface StripeCheckoutProps {
  priceId: string
  onClose: () => void
  onSuccess?: () => void
  onCancel?: () => void
}

export default function StripeCheckout({ priceId, onClose, onSuccess, onCancel }: StripeCheckoutProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pricingBreakdown, setPricingBreakdown] = useState<{
    basePrice: number
    processingFee: number
    total: number
    currency: string
    planName: string
    billingPeriod: string
  } | null>(null)

  console.log("[v0] StripeCheckout received priceId:", priceId)

  useEffect(() => {
    const priceInfo = Object.values(STRIPE_PRICE_CONFIG).find((config) => config.priceId === priceId)
    if (priceInfo) {
      const baseAmount = priceInfo.amount
      const currency = priceInfo.currency.toUpperCase() as "GBP" | "USD"

      // Calculate Stripe fee (assume domestic card for display)
      const feeCalc = calculateStripeFee(baseAmount, currency, "domestic")

      setPricingBreakdown({
        basePrice: baseAmount / 100, // Convert from pence/cents to pounds/dollars
        processingFee: feeCalc.feeAmount / 100,
        total: (baseAmount + feeCalc.feeAmount) / 100,
        currency: currency === "GBP" ? "£" : "$",
        planName: priceInfo.plan.charAt(0).toUpperCase() + priceInfo.plan.slice(1),
        billingPeriod: priceInfo.interval === "month" ? "Monthly" : "Yearly",
      })
    }
  }, [priceId])

  useEffect(() => {
    console.log("[v0] StripeCheckout useEffect - priceId:", priceId)
    fetch("/api/checkout/create-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priceId }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error)
        } else {
          setClientSecret(data.clientSecret)
        }
      })
      .catch((err) => setError(err.message))
  }, [priceId])

  const handleClose = () => {
    onCancel?.()
    onClose()
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={handleClose} variant="outline" className="w-full bg-transparent">
              Close
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!clientSecret) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <p>Loading...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Complete Your Subscription</CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <svg className="w-4 h-4" viewBox="0 0 60 25" xmlns="http://www.w3.org/2000/svg">
                  <path
                    fill="#635BFF"
                    d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a8.33 8.33 0 0 1-4.56 1.1c-4.01 0-6.83-2.5-6.83-7.48 0-4.19 2.39-7.52 6.3-7.52 3.92 0 5.96 3.28 5.96 7.5 0 .4-.04 1.26-.06 1.48zm-5.92-5.62c-1.03 0-2.17.73-2.17 2.58h4.25c0-1.85-1.07-2.58-2.08-2.58zM40.95 20.3c-1.44 0-2.32-.6-2.9-1.04l-.02 4.63-4.12.87V5.57h3.76l.08 1.02a4.7 4.7 0 0 1 3.23-1.29c2.9 0 5.62 2.6 5.62 7.4 0 5.23-2.7 7.6-5.65 7.6zM40 8.95c-.95 0-1.54.34-1.97.81l.02 6.12c.4.44.98.78 1.95.78 1.52 0 2.54-1.65 2.54-3.87 0-2.15-1.04-3.84-2.54-3.84zM28.24 5.57h4.13v14.44h-4.13V5.57zm0-4.7L32.37 0v3.36l-4.13.88V.88zm-4.32 9.35v9.79H19.8V5.57h3.7l.12 1.22c1-1.77 3.07-1.41 3.62-1.22v3.79c-.52-.17-2.29-.43-3.32.86zm-8.55 4.72c0 2.43 2.6 1.68 3.12 1.46v3.36c-.55.3-1.54.54-2.89.54a4.15 4.15 0 0 1-4.27-4.24l.01-13.17 4.02-.86v3.54h3.14V9.1h-3.13v5.85zm-4.91.7c0 2.97-2.31 4.66-5.73 4.66a11.2 11.2 0 0 1-4.46-.93v-3.93c1.38.75 3.1 1.31 4.46 1.31.92 0 1.53-.24 1.53-1C6.26 13.77 0 14.51 0 9.95 0 7.04 2.28 5.3 5.62 5.3c1.36 0 2.72.2 4.09.75v3.88a9.23 9.23 0 0 0-4.1-1.06c-.86 0-1.44.25-1.44.93 0 1.85 6.29.97 6.29 5.88z"
                  />
                </svg>
                Secure payment powered by Stripe
              </CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {pricingBreakdown && (
            <div className="mb-4 p-4 bg-muted rounded-lg border">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-primary" viewBox="0 0 60 25" xmlns="http://www.w3.org/2000/svg">
                  <path
                    fill="currentColor"
                    d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a8.33 8.33 0 0 1-4.56 1.1c-4.01 0-6.83-2.5-6.83-7.48 0-4.19 2.39-7.52 6.3-7.52 3.92 0 5.96 3.28 5.96 7.5 0 .4-.04 1.26-.06 1.48zm-5.92-5.62c-1.03 0-2.17.73-2.17 2.58h4.25c0-1.85-1.07-2.58-2.08-2.58zM40.95 20.3c-1.44 0-2.32-.6-2.9-1.04l-.02 4.63-4.12.87V5.57h3.76l.08 1.02a4.7 4.7 0 0 1 3.23-1.29c2.9 0 5.62 2.6 5.62 7.4 0 5.23-2.7 7.6-5.65 7.6zM40 8.95c-.95 0-1.54.34-1.97.81l.02 6.12c.4.44.98.78 1.95.78 1.52 0 2.54-1.65 2.54-3.87 0-2.15-1.04-3.84-2.54-3.84zM28.24 5.57h4.13v14.44h-4.13V5.57zm0-4.7L32.37 0v3.36l-4.13.88V.88zm-4.32 9.35v9.79H19.8V5.57h3.7l.12 1.22c1-1.77 3.07-1.41 3.62-1.22v3.79c-.52-.17-2.29-.43-3.32.86zm-8.55 4.72c0 2.43 2.6 1.68 3.12 1.46v3.36c-.55.3-1.54.54-2.89.54a4.15 4.15 0 0 1-4.27-4.24l.01-13.17 4.02-.86v3.54h3.14V9.1h-3.13v5.85zm-4.91.7c0 2.97-2.31 4.66-5.73 4.66a11.2 11.2 0 0 1-4.46-.93v-3.93c1.38.75 3.1 1.31 4.46 1.31.92 0 1.53-.24 1.53-1C6.26 13.77 0 14.51 0 9.95 0 7.04 2.28 5.3 5.62 5.3c1.36 0 2.72.2 4.09.75v3.88a9.23 9.23 0 0 0-4.1-1.06c-.86 0-1.44.25-1.44.93 0 1.85 6.29.97 6.29 5.88z"
                  />
                </svg>
                Payment Breakdown - No Hidden Fees!
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">
                    {pricingBreakdown.planName} Plan ({pricingBreakdown.billingPeriod})
                  </span>
                  <span className="font-medium">
                    {pricingBreakdown.currency}
                    {pricingBreakdown.basePrice.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Stripe Processing Fee</span>
                  <span className="font-medium">
                    {pricingBreakdown.currency}
                    {pricingBreakdown.processingFee.toFixed(2)}
                  </span>
                </div>
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Total Amount</span>
                    <span className="font-bold text-lg">
                      {pricingBreakdown.currency}
                      {pricingBreakdown.total.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                We partner with Stripe to process all payments securely. The processing fee covers the cost of secure
                card processing and fraud protection. This fee is non-refundable if you cancel your subscription.
              </p>
            </div>
          )}

          <EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret }}>
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        </CardContent>
      </Card>
    </div>
  )
}
