"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { AlertCircle, RefreshCw } from "lucide-react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    console.error("[v0] Error occurred:", error)

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          window.location.href = "https://mydaylogs.co.uk"
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="rounded-full bg-red-100 p-3">
            <AlertCircle className="h-12 w-12 text-red-600" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Something went wrong</h1>
          <p className="text-muted-foreground">
            An unexpected error occurred. Don't worry, we're redirecting you to safety.
          </p>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Redirecting to homepage in <span className="font-bold text-foreground">{countdown}</span>{" "}
            {countdown === 1 ? "second" : "seconds"}...
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => reset()} className="w-full sm:w-auto">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            <Button
              variant="outline"
              onClick={() => (window.location.href = "https://mydaylogs.co.uk")}
              className="w-full sm:w-auto"
            >
              Go to Homepage Now
            </Button>
          </div>
        </div>

        {process.env.NODE_ENV === "development" && (
          <details className="text-left text-xs bg-muted p-4 rounded-lg">
            <summary className="cursor-pointer font-medium mb-2">Error Details</summary>
            <pre className="overflow-auto">{error.message}</pre>
          </details>
        )}
      </div>
    </div>
  )
}
