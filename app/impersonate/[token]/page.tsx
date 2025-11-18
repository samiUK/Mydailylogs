"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, CheckCircle, XCircle } from 'lucide-react'

export default function ImpersonatePage({ params }: { params: Promise<{ token: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("Verifying impersonation token...")

  useEffect(() => {
    const verifyAndImpersonate = async () => {
      try {
        // Verify token with API
        const response = await fetch("/api/impersonation/verify-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: resolvedParams.token }),
        })

        if (!response.ok) {
          throw new Error("Invalid or expired token")
        }

        const { impersonationData } = await response.json()

        // Store impersonation data in localStorage
        localStorage.setItem("masterAdminImpersonation", "true")
        localStorage.setItem("impersonatedUserEmail", impersonationData.userEmail)
        localStorage.setItem("impersonatedUserId", impersonationData.userId)
        localStorage.setItem("impersonatedUserRole", impersonationData.userRole)
        localStorage.setItem("impersonatedOrganizationId", impersonationData.organizationId || "")
        localStorage.setItem("masterAdminEmail", impersonationData.masterAdminEmail)

        setStatus("success")
        setMessage(`Successfully authenticated as ${impersonationData.userEmail}`)

        // Redirect to appropriate dashboard after 2 seconds
        setTimeout(() => {
          router.push(`/${impersonationData.userRole}`)
        }, 2000)
      } catch (error) {
        console.error("[v0] Impersonation error:", error)
        setStatus("error")
        setMessage("Invalid or expired impersonation link. Please request a new one.")
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
