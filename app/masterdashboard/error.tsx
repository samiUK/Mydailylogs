"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset?: () => void
}) {
  useEffect(() => {
    console.error("[v0] Masterdashboard error:", error)
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="max-w-md space-y-4 text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
        <h1 className="text-2xl font-bold">Dashboard Error</h1>
        <p className="text-muted-foreground">The master dashboard encountered an error. This has been logged.</p>
        <div className="flex gap-2 justify-center">
          {reset && <Button onClick={() => reset()}>Try Again</Button>}
          <Button variant="outline" onClick={() => (window.location.href = "/masterlogin")}>
            Return to Login
          </Button>
        </div>
        {process.env.NODE_ENV === "development" && (
          <details className="mt-4 text-left text-sm">
            <summary className="cursor-pointer text-muted-foreground">Error Details</summary>
            <pre className="mt-2 overflow-auto rounded bg-muted p-4">{error.message}</pre>
          </details>
        )}
      </div>
    </div>
  )
}
