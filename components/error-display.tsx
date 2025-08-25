"use client"

import { AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface ErrorDisplayProps {
  error: string
  onRetry?: () => void
  title?: string
  description?: string
}

export function ErrorDisplay({
  error,
  onRetry,
  title = "Something went wrong",
  description = "An error occurred while loading data. Please try again.",
}: ErrorDisplayProps) {
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        <p className="text-sm text-muted-foreground bg-muted p-2 rounded">{error}</p>
        {onRetry && (
          <Button onClick={onRetry} className="w-full">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

export function PageError({ error, onRetry }: { error: string; onRetry?: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <ErrorDisplay error={error} onRetry={onRetry} />
    </div>
  )
}
