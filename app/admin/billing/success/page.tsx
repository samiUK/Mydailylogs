"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle } from "lucide-react"

export default function BillingSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const sessionId = searchParams.get("session_id")

  useEffect(() => {
    // Add any post-checkout logic here if needed
    setLoading(false)
  }, [])

  if (loading) {
    return <div className="flex justify-center py-8">Processing your subscription...</div>
  }

  return (
    <div className="max-w-2xl mx-auto py-16">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Subscription Activated!</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            Thank you for subscribing! Your account has been upgraded and you now have access to all premium features.
          </p>
          <div className="flex gap-4 justify-center">
            <Button onClick={() => router.push("/admin/billing")}>View Billing</Button>
            <Button variant="outline" onClick={() => router.push("/admin")}>
              Go to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
