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
  const [isValidSession, setIsValidSession] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)

  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    const checkSession = async () => {
      console.log("[v0] Reset password page loaded")

      // Check if we have a token in the URL
      const token = searchParams.get("token")
      const type = searchParams.get("type")

      console.log("[v0] Token from URL:", token ? "present" : "missing")
      console.log("[v0] Type from URL:", type)

      if (token && type === "recovery") {
        console.log("[v0] Attempting to verify OTP with token")
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: "recovery",
        })

        if (error) {
          console.error("[v0] OTP verification error:", error)
          setMessage("Invalid or expired password reset link. Please request a new one.")
          setIsValidSession(false)
        } else {
          console.log("[v0] OTP verified successfully, session established")
          setIsValidSession(true)
        }
      } else {
        // Check if we already have a valid session
        const {
          data: { session },
        } = await supabase.auth.getSession()
        console.log("[v0] Existing session:", session ? "found" : "not found")

        if (session) {
          setIsValidSession(true)
        } else {
          setMessage("Invalid or expired password reset link. Please request a new one.")
          setIsValidSession(false)
        }
      }

      setCheckingSession(false)
    }

    checkSession()
  }, [supabase, searchParams])

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

    try {
      console.log("[v0] Attempting to update password")
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) throw error

      console.log("[v0] Password updated successfully")
      setMessage("Password updated successfully! Redirecting to login...")
      setTimeout(() => {
        router.push("/auth/login")
      }, 2000)
    } catch (error) {
      console.error("[v0] Error updating password:", error)
      setMessage(`Error: ${error instanceof Error ? error.message : "An unexpected error occurred"}`)
    } finally {
      setLoading(false)
    }
  }

  if (checkingSession) {
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
            {isValidSession ? (
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
                  {loading ? "Updating Password..." : "Update Password"}
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

            {message && isValidSession && (
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
