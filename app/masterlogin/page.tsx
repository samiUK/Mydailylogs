"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Shield, AlertTriangle, ArrowLeft } from "lucide-react"
import { useBranding } from "@/components/branding-provider"

export default function MasterLoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { organizationName, logoUrl, primaryColor } = useBranding()

  const handleMasterLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      console.log("[v0] Attempting master login with:", { email, passwordLength: password.length })

      const response = await fetch("/api/admin/authenticate-superuser", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      let data
      const contentType = response.headers.get("content-type")
      if (contentType && contentType.includes("application/json")) {
        data = await response.json()
      } else {
        const text = await response.text()
        console.error("[v0] Non-JSON response:", text)
        setError("Server error. Please check the console and try again.")
        setIsLoading(false)
        return
      }

      console.log("[v0] Auth response:", {
        status: response.ok,
        statusCode: response.status,
        data,
      })

      if (!response.ok) {
        console.log("[v0] Auth failed:", data.error)
        setError(data.error || "Invalid credentials. Access denied.")
        setIsLoading(false)
        return
      }

      // Set localStorage
      localStorage.setItem("masterAdminAuth", "true")
      localStorage.setItem("masterAdminEmail", email)

      if (data.userType === "master_admin") {
        document.cookie = `master-admin-session=authenticated; path=/; max-age=86400; SameSite=Lax`
        document.cookie = `masterAdminEmail=${email}; path=/; max-age=86400; SameSite=Lax`
        document.cookie = `userType=master_admin; path=/; max-age=86400; SameSite=Lax`
        console.log("[v0] Set master admin authentication cookies")
      } else if (data.userType === "superuser") {
        document.cookie = `superuser-session=authenticated; path=/; max-age=86400; SameSite=Lax`
        document.cookie = `superuser-email=${email}; path=/; max-age=86400; SameSite=Lax`
        document.cookie = `userType=superuser; path=/; max-age=86400; SameSite=Lax`
        console.log("[v0] Set superuser authentication cookies")
      }

      console.log("[v0] Redirecting to /masterdashboard")
      // Both redirect to masterdashboard
      router.push("/masterdashboard")
    } catch (error: unknown) {
      console.error("[v0] Master login error:", error)
      setError("Authentication failed. Please try again.")
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-sm">
        <div className="mb-4">
          <Button
            variant="ghost"
            onClick={() => router.push("/")}
            className="text-red-600 hover:text-red-700 hover:bg-red-50 p-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>

        <Card className="border-red-200 shadow-xl">
          <CardHeader className="text-center space-y-3 sm:space-y-4">
            <div className="mx-auto w-14 h-14 sm:w-16 sm:h-16 bg-red-100 rounded-full flex items-center justify-center">
              {logoUrl ? (
                <img
                  src={logoUrl || "/placeholder.svg"}
                  alt="Logo"
                  className="w-8 h-8 sm:w-10 sm:h-10 object-contain"
                />
              ) : (
                <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-red-600" />
              )}
            </div>
            <CardTitle className="text-xl sm:text-2xl text-red-800">
              {organizationName || "MyDayLogs"} - Master Admin
            </CardTitle>
            <CardDescription className="text-sm text-red-600">Restricted access for system monitoring</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 p-2.5 sm:p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="text-xs sm:text-sm text-red-700">
                <strong>Warning:</strong> Unauthorized access is prohibited and monitored.
              </div>
            </div>

            <form onSubmit={handleMasterLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm text-red-800">
                  Master Admin Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@mydaylogs.co.uk"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border-red-200 focus:border-red-400"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm text-red-800">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border-red-200 focus:border-red-400"
                />
              </div>
              {error && (
                <div className="p-2.5 sm:p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-xs sm:text-sm text-red-700">{error}</p>
                </div>
              )}
              <Button
                type="submit"
                className="w-full bg-red-600 hover:bg-red-700 text-sm sm:text-base"
                disabled={isLoading}
              >
                {isLoading ? "Authenticating..." : "Access Dashboard"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
