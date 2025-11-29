"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Eye, EyeOff, Lock } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [isValidToken, setIsValidToken] = useState(false)
  const [checkingToken, setCheckingToken] = useState(true)
  const [tokenData, setTokenData] = useState<{ user_id: string; user_email: string } | null>(null)

  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    const validateToken = async () => {
      const token = searchParams.get("token")
      console.log("[v0] Reset password page loaded, validating token...")

      if (!token) {
        console.error("[v0] No token found in URL")
        setMessage("Invalid or expired password reset link. Please request a new one.")
        setIsValidToken(false)
        setCheckingToken(false)
        return
      }

      try {
        // Validate token from database
        const { data: tokenRecord, error } = await supabase
          .from("password_reset_tokens")
          .select("*")
          .eq("token", token)
          .eq("is_active", true)
          .is("used_at", null)
          .gt("expires_at", new Date().toISOString())
          .single()

        if (error || !tokenRecord) {
          console.error("[v0] Invalid or expired token:", error)
          setMessage("Invalid or expired password reset link. Please request a new one.")
          setIsValidToken(false)
          setCheckingToken(false)
          return
        }

        console.log("[v0] Valid token found for user:", tokenRecord.user_email)
        setTokenData({
          user_id: tokenRecord.user_id,
          user_email: tokenRecord.user_email,
        })
        setIsValidToken(true)
        setCheckingToken(false)
      } catch (err) {
        console.error("[v0] Error validating token:", err)
        setMessage("An error occurred validating your reset link. Please request a new one.")
        setIsValidToken(false)
        setCheckingToken(false)
      }
    }

    validateToken()
  }, [searchParams, supabase])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setMessage("")

    if (newPassword !== confirmPassword) {
      setMessage("Passwords do not match")
      setLoading(false)
      return
    }

    if (newPassword.length < 6) {
      setMessage("Password must be at least 6 characters long")
      setLoading(false)
      return
    }

    if (!tokenData) {
      setMessage("Invalid session. Please request a new reset link.")
      setLoading(false)
      return
    }

    try {
      console.log("[v0] Updating password for user:", tokenData.user_email)

      const token = searchParams.get("token")
      const response = await fetch("/api/auth/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          newPassword,
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to update password")
      }

      console.log("[v0] Password updated successfully, fetching user profile...")

      // Get user role for redirect
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", tokenData.user_id).single()

      console.log("[v0] User role:", profile?.role)

      setMessage("Password updated successfully! Redirecting to your dashboard...")

      setTimeout(() => {
        if (profile?.role === "admin") {
          console.log("[v0] Redirecting to admin dashboard")
          router.push("/admin")
        } else if (profile?.role === "staff") {
          console.log("[v0] Redirecting to staff dashboard")
          router.push("/staff")
        } else {
          console.log("[v0] Unknown role, redirecting to login")
          router.push("/auth/login")
        }
      }, 1500)
    } catch (error) {
      console.error("[v0] Error updating password:", error)
      setMessage(`Error: ${error instanceof Error ? error.message : "An unexpected error occurred"}`)
    } finally {
      setLoading(false)
    }
  }

  if (checkingToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse text-center">
          <div className="h-8 bg-gray-200 rounded w-48 mb-4 mx-auto"></div>
          <div className="h-4 bg-gray-200 rounded w-32 mx-auto"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full mx-4">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Lock className="h-5 w-5" />
              Reset Password
            </CardTitle>
            <CardDescription>Enter your new password below</CardDescription>
          </CardHeader>
          <CardContent>
            {isValidToken ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      className="bg-white pr-10"
                      placeholder="Enter your new password"
                      minLength={6}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                  <p className="text-sm text-gray-500">Password must be at least 6 characters long</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="bg-white pr-10"
                      placeholder="Confirm your new password"
                      minLength={6}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Saving..." : "Save Password"}
                </Button>
              </form>
            ) : (
              <div className="text-center">
                <p className="text-red-600 mb-4">{message}</p>
                <Button onClick={() => router.push("/auth/login")} variant="outline">
                  Back to Login
                </Button>
              </div>
            )}

            {message && isValidToken && (
              <div
                className={`mt-4 p-3 rounded-md text-sm ${
                  message.includes("Error") || message.includes("do not match") || message.includes("must be")
                    ? "bg-red-50 text-red-700 border border-red-200"
                    : "bg-green-50 text-green-700 border border-green-200"
                }`}
              >
                {message}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
