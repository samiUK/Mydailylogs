"use client"

import { useState, useEffect, useRef } from "react"
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js"
import { loadStripe } from "@stripe/stripe-js"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { X } from "lucide-react"

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null

interface StripeCheckoutProps {
  productType: string
  interval?: "month" | "year"
  organizationId: string
  userEmail: string
  userId: string
  userName?: string
  currency?: "GBP" | "USD"
  onClose?: () => void
}

export default function StripeCheckout({
  productType,
  interval = "month",
  organizationId,
  userEmail,
  userId,
  userName,
  currency = "GBP",
  onClose,
}: StripeCheckoutProps) {
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const hasInitialized = useRef(false)

  useEffect(() => {
    if (hasInitialized.current) return
    hasInitialized.current = true

    const initCheckout = async () => {
      console.log("[v0] Initializing checkout session")

      if (!productType || !interval || !organizationId || !userEmail || !userId) {
        const missing = []
        if (!productType) missing.push("productType")
        if (!interval) missing.push("interval")
        if (!organizationId) missing.push("organizationId")
        if (!userEmail) missing.push("userEmail")
        if (!userId) missing.push("userId")

        const errorMsg = `Missing required parameters: ${missing.join(", ")}`
        console.error("[v0]", errorMsg)
        setError(errorMsg)
        setIsLoading(false)
        return
      }

      try {
        const response = await fetch("/api/checkout/create-session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            productType,
            interval,
            organizationId,
            userEmail,
            userId,
            userName: userName || userEmail,
            currency,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Failed to create checkout session")
        }

        const data = await response.json()
        console.log("[v0] Client secret received:", !!data.clientSecret)

        if (!data.clientSecret) {
          throw new Error("No client secret returned from server")
        }

        setClientSecret(data.clientSecret)
        setIsLoading(false)
      } catch (error) {
        console.error("[v0] Error starting checkout:", error)
        const errorMessage = error instanceof Error ? error.message : "Failed to start checkout session"
        setError(errorMessage)
        setIsLoading(false)
      }
    }

    if (stripePromise) {
      initCheckout()
    } else {
      setError("Stripe is not configured")
      setIsLoading(false)
    }
  }, [productType, interval, organizationId, userEmail, userId, userName, currency])

  if (!stripePromise) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Payment System Unavailable</CardTitle>
              {onClose && (
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
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

  if (error) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Payment Error</CardTitle>
              {onClose && (
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={onClose} variant="outline" className="w-full bg-transparent">
              Close
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isLoading || !clientSecret) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Loading Payment System...</CardTitle>
              {onClose && (
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              <p className="text-sm text-muted-foreground">Preparing secure checkout...</p>
              <Button onClick={onClose} variant="ghost" size="sm" className="mt-4">
                Cancel
              </Button>
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
          <div id="checkout" className="min-h-[400px]">
            <EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret }}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
