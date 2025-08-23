"use client"

import type React from "react"
import { ArrowLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { MyDayLogsLogo } from "@/components/mydaylogs-logo"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isMasterLogin, setIsMasterLogin] = useState(false)
  const [masterLoginEmail, setMasterLoginEmail] = useState("")
  const router = useRouter()

  useEffect(() => {
    const savedEmail = localStorage.getItem("mydaylogs_remembered_email")
    if (savedEmail) {
      setEmail(savedEmail)
      setRememberMe(true)
    }

    const masterEmail = sessionStorage.getItem("masterLoginEmail")
    if (masterEmail) {
      setIsMasterLogin(true)
      setMasterLoginEmail(masterEmail)
      setEmail(masterEmail)
      // Clear the session storage
      sessionStorage.removeItem("masterLoginEmail")
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      if (isMasterLogin && password === "7286707$Bd") {
        console.log("[v0] Master admin login detected for user:", email)

        // Get the target user's profile to determine their role
        const { data: userProfile, error: profileError } = await supabase
          .from("profiles")
          .select("role, id, organization_id")
          .eq("email", email)
          .single()

        if (profileError || !userProfile) {
          throw new Error("User profile not found. Please check the email address.")
        }

        // Store master admin context in sessionStorage
        sessionStorage.setItem(
          "masterAdminContext",
          JSON.stringify({
            isMasterAdmin: true,
            targetUserEmail: email,
            targetUserRole: userProfile.role,
            targetUserId: userProfile.id,
            targetUserOrgId: userProfile.organization_id,
          }),
        )

        console.log(
          "[v0] Master admin login successful, redirecting to:",
          userProfile.role === "admin" ? "/admin" : "/staff",
        )

        // Redirect based on target user's role
        if (userProfile.role === "admin") {
          window.location.href = "/admin"
        } else {
          window.location.href = "/staff"
        }
        return
      }

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) throw authError

      await new Promise((resolve) => setTimeout(resolve, 100))

      const { data: userProfile, error: roleError } = await supabase
        .from("profiles")
        .select("role")
        .eq("email", email)
        .single()

      if (roleError || !userProfile) {
        throw new Error("Profile not found. Please contact your administrator.")
      }

      let userRole = userProfile.role

      if (!userRole) {
        console.log("[v0] User has no role set, setting to admin")
        const { error: updateError } = await supabase.from("profiles").update({ role: "admin" }).eq("email", email)

        if (updateError) {
          console.log("[v0] Error updating user role:", updateError)
          throw new Error("Failed to set user role. Please try again.")
        }
        userRole = "admin"
      }

      if (rememberMe) {
        localStorage.setItem("mydaylogs_remembered_email", email)
      } else {
        localStorage.removeItem("mydaylogs_remembered_email")
      }

      console.log("[v0] Login successful, redirecting to:", userRole === "admin" ? "/admin" : "/staff")
      if (userRole === "admin") {
        window.location.href = "/admin"
      } else {
        window.location.href = "/staff"
      }
    } catch (error: unknown) {
      console.log("[v0] Login error:", error)
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary to-accent/20 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-4">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Home
          </Link>
        </div>
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Link href="/">
                <MyDayLogsLogo size="lg" />
              </Link>
            </div>
            <CardTitle className="text-2xl">{isMasterLogin ? "Master Admin Login" : "Welcome Back"}</CardTitle>
            <CardDescription>
              {isMasterLogin ? `Logging in as: ${masterLoginEmail}` : "Sign in to your MyDayLogs account"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isMasterLogin && (
              <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-sm text-orange-800">
                  <strong>Master Admin Mode:</strong> Use your master password to access this user's account.
                </p>
              </div>
            )}
            <form onSubmit={handleLogin}>
              <div className="flex flex-col gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="email" required>
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@company.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isMasterLogin}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password" required>
                    {isMasterLogin ? "Master Password" : "Password"}
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={isMasterLogin ? "Enter master admin password" : ""}
                  />
                </div>
                {!isMasterLogin && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="remember"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                    />
                    <Label htmlFor="remember" className="text-sm font-normal">
                      Remember my email
                    </Label>
                  </div>
                )}
                {error && <p className="text-sm text-red-500">{error}</p>}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Signing in..." : isMasterLogin ? "Login as User" : "Sign In"}
                </Button>
              </div>
              {!isMasterLogin && (
                <div className="mt-4 text-center text-sm">
                  Don&apos;t have an account?{" "}
                  <Link href="/auth/sign-up" className="underline underline-offset-4 text-primary">
                    Sign up
                  </Link>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
