"use client"

import { useCallback, useState, useEffect } from "react"
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js"
import { loadStripe } from "@stripe/stripe-js"
import { startCheckoutSession } from "@/app/actions/stripe"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { X } from "lucide-react"

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
console.log("[v0] Stripe publishable key present:", !!stripePublishableKey)
console.log("[v0] Stripe publishable key value:", stripePublishableKey?.substring(0, 20) + "...")

const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null

interface StripeCheckoutProps {
  productId: string
  billingInterval?: "month" | "year"
  onClose?: () => void
}

export default function StripeCheckout({ productId, billingInterval = "month", onClose }: StripeCheckoutProps) {
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    console.log("[v0] StripeCheckout component mounted")
    console.log("[v0] Stripe promise:", stripePromise ? "initialized" : "null")

    if (stripePromise) {
      stripePromise
        .then((stripe) => {
          console.log("[v0] Stripe instance loaded:", !!stripe)
          setIsLoading(false)
        })
        .catch((err) => {
          console.error("[v0] Failed to load Stripe:", err)
          setError("Failed to load payment system")
          setIsLoading(false)
        })
    } else {
      setIsLoading(false)
    }
  }, [])

  const fetchClientSecret = useCallback(async () => {
    setError(null)
    console.log("[v0] Starting checkout session for product:", productId, "interval:", billingInterval)
    try {
      const clientSecret = await startCheckoutSession(productId, billingInterval)
      console.log("[v0] Client secret received:", clientSecret ? "Yes" : "No")
      console.log("[v0] Client secret length:", clientSecret?.length)
      if (!clientSecret) {
        throw new Error("No client secret returned from server")
      }
      return clientSecret
    } catch (error) {
      console.error("[v0] Error starting checkout:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to start checkout session"
      setError(errorMessage)
      throw error
    }
  }, [productId, billingInterval])

  if (!stripePromise) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Payment System Unavailable</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive mb-4">
              Payment processing is not configured. Stripe publishable key is missing.
            </p>
            <Button onClick={onClose} variant="outline" className="w-full bg-transparent">
              Close
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Loading Payment System...</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-auto relative">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Complete Your Subscription</CardTitle>
              <CardDescription>Secure payment powered by Stripe</CardDescription>
            </div>
            {onClose && (
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="py-8 text-center">
              <p className="text-destructive mb-4">{error}</p>
              <Button onClick={onClose} variant="outline">
                Close
              </Button>
            </div>
          ) : (
            <div id="checkout" className="min-h-[400px]">
              <EmbeddedCheckoutProvider stripe={stripePromise} options={{ fetchClientSecret }}>
                <EmbeddedCheckout />
              </EmbeddedCheckoutProvider>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
