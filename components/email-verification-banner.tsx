"use client"

import { useState, useEffect } from "react"
import { X, Mail, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface EmailVerificationBannerProps {
  userEmail: string
  isVerified: boolean
}

export function EmailVerificationBanner({ userEmail, isVerified }: EmailVerificationBannerProps) {
  const [dismissed, setDismissed] = useState(false)
  const [resending, setResending] = useState(false)
  const [message, setMessage] = useState("")
  const [currentVerificationStatus, setCurrentVerificationStatus] = useState(isVerified)

  useEffect(() => {
    console.log("[v0] Email Verification Banner - Email:", userEmail)
    console.log("[v0] Email Verification Banner - Is Verified:", currentVerificationStatus)
    console.log("[v0] Email Verification Banner - Should Show Banner:", !currentVerificationStatus && !dismissed)

    setCurrentVerificationStatus(isVerified)
  }, [userEmail, isVerified, dismissed, currentVerificationStatus])

  useEffect(() => {
    const checkVerificationStatus = async () => {
      try {
        const response = await fetch("/api/auth/check-verification", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: userEmail }),
        })
        const data = await response.json()
        if (data.verified && !currentVerificationStatus) {
          setCurrentVerificationStatus(true)
          setMessage("Email verified successfully!")
          setTimeout(() => {
            window.location.reload()
          }, 1500)
        }
      } catch (error) {
        console.error("[v0] Error checking verification:", error)
      }
    }

    if (!currentVerificationStatus && !dismissed) {
      const interval = setInterval(checkVerificationStatus, 5000)
      return () => clearInterval(interval)
    }
  }, [userEmail, currentVerificationStatus, dismissed])

  if (currentVerificationStatus || dismissed) {
    return null
  }

  const handleResendVerification = async () => {
    setResending(true)
    setMessage("")

    console.log("[v0] Resending verification email to:", userEmail)

    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail }),
      })

      const data = await response.json()
      console.log("[v0] Resend verification response:", data)

      if (data.success) {
        setMessage("✓ Verification email sent! Check your inbox and spam folder.")
      } else {
        console.error("[v0] Resend failed:", data.error)
        setMessage(`Failed: ${data.error || "Please try again or contact support."}`)
      }
    } catch (error) {
      console.error("[v0] Resend verification error:", error)
      setMessage("Network error. Please try again later.")
    } finally {
      setResending(false)
      setTimeout(() => setMessage(""), 8000)
    }
  }

  return (
    <div className="sticky top-0 z-50 w-full">
      <Alert className="rounded-none border-l-0 border-r-0 border-t-0 bg-amber-50 border-amber-200">
        <AlertCircle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="flex items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-2 flex-1">
            <Mail className="h-4 w-4 text-amber-600" />
            <span className="text-amber-800">
              Please verify your email address <strong>({userEmail})</strong> to ensure uninterrupted access to all
              features.
              <span className="text-xs block mt-1">Check your spam folder if you don't see the email.</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            {message && (
              <span className={`text-xs ${message.startsWith("✓") ? "text-green-700" : "text-amber-700"}`}>
                {message}
              </span>
            )}
            <Button
              onClick={handleResendVerification}
              disabled={resending}
              variant="outline"
              size="sm"
              className="whitespace-nowrap border-amber-300 hover:bg-amber-100 bg-transparent"
            >
              {resending ? "Sending..." : "Resend Email"}
            </Button>
            <Button
              onClick={() => setDismissed(true)}
              variant="ghost"
              size="sm"
              className="hover:bg-amber-100"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  )
}
