"use client"

import { use, useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, CheckCircle, XCircle } from "lucide-react"
import { useRouter } from "next/navigation"

export default function ImpersonatePage({ params }: { params: Promise<{ token: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("Verifying impersonation token...")

  useEffect(() => {
    const verifyAndImpersonate = async () => {
      console.log("[v0] Starting impersonation with token:", resolvedParams.token.substring(0, 10) + "...")

      try {
        // Verify token with API
        const response = await fetch("/api/impersonation/verify-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: resolvedParams.token }),
        })

        console.log("[v0] Verification response status:", response.status)

        if (!response.ok) {
          const errorData = await response.json()
          console.error("[v0] Verification failed:", errorData)
          throw new Error(errorData.error || "Invalid or expired token")
        }

        const { impersonationData, redirectPath } = await response.json()

        console.log("[v0] Impersonation data received:", {
          userEmail: impersonationData.userEmail,
          userRole: impersonationData.userRole,
          redirectPath,
        })

        localStorage.setItem("masterAdminImpersonation", "true")
        localStorage.setItem("impersonatedUserEmail", impersonationData.userEmail)
        localStorage.setItem("impersonatedUserId", impersonationData.userId)
        localStorage.setItem("impersonatedUserRole", impersonationData.userRole)
        localStorage.setItem("impersonatedOrganizationId", impersonationData.organizationId || "")
        localStorage.setItem("masterAdminEmail", impersonationData.masterAdminEmail)

        setStatus("success")
        setMessage(`Successfully authenticated as ${impersonationData.userEmail}`)

        console.log("[v0] Redirecting to dashboard:", redirectPath)

        setTimeout(() => {
          window.location.href = redirectPath
        }, 1500)
      } catch (error) {
        console.error("[v0] Impersonation error:", error)
        setStatus("error")
        setMessage(
          error instanceof Error ? error.message : "Invalid or expired impersonation link. Please request a new one.",
        )
      }
    }

    verifyAndImpersonate()
  }, [resolvedParams.token, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Master Admin Impersonation</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {status === "loading" && (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
              <p className="text-center text-gray-600">{message}</p>
            </>
          )}
          {status === "success" && (
            <>
              <CheckCircle className="h-12 w-12 text-green-600" />
              <p className="text-center text-gray-600">{message}</p>
              <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
            </>
          )}
          {status === "error" && (
            <>
              <XCircle className="h-12 w-12 text-red-600" />
              <p className="text-center text-gray-600">{message}</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
