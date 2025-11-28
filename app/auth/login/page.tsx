"use client"

import type React from "react"
import { ArrowLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MyDayLogsLogo } from "@/components/mydaylogs-logo"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useState, useEffect, useCallback } from "react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isMasterLogin, setIsMasterLogin] = useState(false)
  const [masterLoginEmail, setMasterLoginEmail] = useState("")
  const [availableProfiles, setAvailableProfiles] = useState<any[]>([])
  const [selectedProfile, setSelectedProfile] = useState<string>("")
  const [showProfileSelection, setShowProfileSelection] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [showResetOption, setShowResetOption] = useState(false)
  const [resetEmailSent, setResetEmailSent] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (!isClient) return

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
      sessionStorage.removeItem("masterLoginEmail")
    }
  }, [isClient])

  const checkUserProfiles = useCallback(
    async (emailAddress: string) => {
      if (!emailAddress || isMasterLogin) return

      try {
        const supabase = createClient()

        const { data: profiles, error } = await supabase
          .from("profiles")
          .select("id, role, organization_name, organization_id")
          .eq("email", emailAddress)
          .limit(10)

        if (error) {
          console.log("[v0] Error checking profiles:", error)
          return
        }

        if (profiles && profiles.length > 1) {
          setAvailableProfiles(profiles)
          setShowProfileSelection(true)
          setSelectedProfile("")
        } else if (profiles && profiles.length === 1) {
          setAvailableProfiles(profiles)
          setShowProfileSelection(false)
          setSelectedProfile(profiles[0].id)
        } else {
          setAvailableProfiles([])
          setShowProfileSelection(false)
          setSelectedProfile("")
        }
      } catch (error) {
        console.log("[v0] Error checking user profiles:", error)
      }
    },
    [isMasterLogin],
  )

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (email && email.includes("@")) {
        checkUserProfiles(email)
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [email, checkUserProfiles])

  const handleSendResetEmail = async () => {
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address first")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userEmail: email }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to send reset email")
      }

      setResetEmailSent(true)
      setError(null)
    } catch (error) {
      console.error("[v0] Reset email error:", error)
      setError(error instanceof Error ? error.message : "Failed to send reset email")
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const isMasterPasswordAttempt = isMasterLogin && password === "7286707$Bd"

      if (isMasterPasswordAttempt) {
        if (showProfileSelection && !selectedProfile) {
          throw new Error("Please select a profile to continue.")
        }

        const profileId = selectedProfile || availableProfiles[0]?.id
        if (!profileId) {
          throw new Error("No profile found for this user.")
        }

        document.cookie = "masterAdminImpersonation=true; path=/; max-age=3600"
        document.cookie = `impersonatedUserEmail=${email}; path=/; max-age=3600`

        const selectedProfileData = availableProfiles.find((p) => p.id === profileId)
        if (!selectedProfileData) {
          throw new Error("Selected profile not found.")
        }

        const redirectUrl = selectedProfileData.role === "admin" ? `/admin/${email}/` : `/staff/${email}/`
        console.log("[v0] Master login redirect to:", redirectUrl)

        window.location.href = redirectUrl
        return
      }

      console.log("[v0] Attempting login for:", email)
      console.log("[v0] Has profiles:", availableProfiles.length)
      console.log("[v0] Show profile selection:", showProfileSelection)
      console.log("[v0] Selected profile:", selectedProfile)

      if (showProfileSelection && !selectedProfile) {
        throw new Error("Please select a profile to continue.")
      }

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        console.error("[v0] Auth error details:", authError)

        const newFailedAttempts = failedAttempts + 1
        setFailedAttempts(newFailedAttempts)

        if (newFailedAttempts >= 3) {
          setShowResetOption(true)
        }

        // Provide more user-friendly error messages
        if (authError.message.includes("Invalid login credentials")) {
          throw new Error("Invalid email or password. Please check your credentials and try again.")
        } else if (authError.message.includes("Email not confirmed")) {
          throw new Error(
            "Please verify your email address before logging in. Check your inbox for the verification link.",
          )
        } else {
          throw authError
        }
      }

      setFailedAttempts(0)
      setShowResetOption(false)

      console.log("[v0] Auth successful, user ID:", authData.user?.id)

      const profileId = selectedProfile || availableProfiles[0]?.id
      if (!profileId) {
        console.error("[v0] No profile found after successful auth")
        throw new Error("Account created but profile not found. Please contact support.")
      }

      const selectedProfileData = availableProfiles.find((p) => p.id === profileId)
      if (!selectedProfileData) {
        console.error("[v0] Selected profile data not found:", profileId)
        throw new Error("Selected profile not found. Please try again.")
      }

      console.log("[v0] Profile found:", selectedProfileData.role, selectedProfileData.organization_name)

      if (typeof window !== "undefined") {
        if (rememberMe) {
          localStorage.setItem("mydaylogs_remembered_email", email)
        } else {
          localStorage.removeItem("mydaylogs_remembered_email")
        }
      }

      const redirectUrl = selectedProfileData.role === "admin" ? "/admin" : "/staff"
      console.log("[v0] Regular login redirect to:", redirectUrl)

      window.location.href = redirectUrl
    } catch (error: unknown) {
      console.error("[v0] Login error:", error)
      setError(error instanceof Error ? error.message : "An error occurred during login. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  if (!isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-secondary to-accent/20 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
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
              {isMasterLogin
                ? `Logging in as: ${masterLoginEmail}`
                : availableProfiles.length > 0
                  ? `Sign in to your account`
                  : "Sign in to your account"}
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
                {showProfileSelection && (
                  <div className="grid gap-2">
                    <Label htmlFor="profile" required>
                      Select Profile
                    </Label>
                    <Select value={selectedProfile} onValueChange={setSelectedProfile}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your profile" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableProfiles.map((profile) => (
                          <SelectItem key={profile.id} value={profile.id}>
                            {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)} - {profile.organization_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
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

                {showResetOption && !resetEmailSent && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800 mb-3">
                      Having trouble logging in? We can send you a password reset email.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full bg-transparent"
                      onClick={handleSendResetEmail}
                      disabled={isLoading}
                    >
                      Send Password Reset Email
                    </Button>
                  </div>
                )}

                {resetEmailSent && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">
                      Password reset email sent! Check your inbox at <strong>{email}</strong> for instructions.
                    </p>
                  </div>
                )}

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
