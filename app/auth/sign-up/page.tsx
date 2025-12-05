"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MyDayLogsLogo } from "@/components/mydaylogs-logo"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import { ArrowLeft, Check } from "lucide-react"
import { createUserWithProfile } from "./actions"
import { createClient } from "@/lib/supabase/client"

export default function SignUpPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [organizationName, setOrganizationName] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  const planFromUrl = searchParams.get("plan") as "growth" | "scale" | null

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      setIsLoading(false)
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long")
      setIsLoading(false)
      return
    }

    try {
      console.log("[v0] Calling server action to create user")

      const result = await createUserWithProfile({
        email,
        password,
        firstName,
        lastName,
        organizationName,
      })

      console.log("[v0] Server action result:", result)

      if (result.success) {
        console.log("[v0] Auto-logging in user...")
        const supabase = createClient()
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email: result.email!,
          password: result.password!,
        })

        if (loginError) {
          console.error("[v0] Auto-login failed:", loginError)
          setError("Account created but login failed. Please login manually.")
          setTimeout(() => router.push("/auth/login"), 2000)
          return
        }

        console.log("[v0] Auto-login successful, waiting for session to be fully established...")

        // Give the browser time to write auth cookies properly
        await new Promise((resolve) => setTimeout(resolve, 100))

        // Verify session is actually set
        const {
          data: { session },
        } = await supabase.auth.getSession()
        console.log("[v0] Session verification:", session ? "Session active" : "No session")

        if (!session) {
          console.error("[v0] Session not established after login")
          setError("Login succeeded but session failed. Please try logging in manually.")
          setTimeout(() => router.push("/auth/login"), 2000)
          return
        }

        if (planFromUrl) {
          setSuccess(`Account created! Redirecting to ${planFromUrl} plan checkout...`)
          setTimeout(() => {
            window.location.href = `/admin/profile/billing?plan=${planFromUrl}`
          }, 1000)
        } else {
          setSuccess("Account created! Redirecting to your dashboard...")
          setTimeout(() => {
            window.location.href = "/admin"
          }, 1000)
        }
      } else {
        setError(result.error || "Failed to create account")
      }
    } catch (error: unknown) {
      console.error("[v0] Signup error:", error)
      if (error instanceof Error) {
        setError(error.message || "An error occurred during sign up")
      } else {
        setError("An error occurred during sign up")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const renderLogo = () => {
    if (organizationName && organizationName !== "MyDayLogs") {
      return (
        <div className="flex items-center gap-2">
          <div className="w-12 h-12 bg-emerald-500 rounded-lg flex items-center justify-center shadow-sm">
            <Check className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold text-emerald-600">{organizationName}</span>
        </div>
      )
    }
    return <MyDayLogsLogo size="lg" />
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
              <Link href="/">{renderLogo()}</Link>
            </div>
            <CardTitle className="text-2xl">Create Account</CardTitle>
            <CardDescription>
              {planFromUrl
                ? `Sign up for ${planFromUrl.charAt(0).toUpperCase() + planFromUrl.slice(1)} plan`
                : `Set up your ${organizationName || "Clearbooks"} organization`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignUp}>
              <div className="flex flex-col gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="organizationName" required>
                    Organization Name
                  </Label>
                  <Input
                    id="organizationName"
                    type="text"
                    placeholder="Clearbooks"
                    required
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="grid gap-2">
                    <Label htmlFor="firstName" required>
                      First Name
                    </Label>
                    <Input
                      id="firstName"
                      type="text"
                      placeholder="John"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="lastName" required>
                      Last Name
                    </Label>
                    <Input
                      id="lastName"
                      type="text"
                      placeholder="Forecre"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email" required>
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="sami@clearbooks.co.uk"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password" required>
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="confirmPassword" required>
                    Confirm Password
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                {success && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-sm text-green-600">{success}</p>
                    <p className="text-xs text-green-500 mt-1">Redirecting...</p>
                  </div>
                )}
                {error && <p className="text-sm text-red-500">{error}</p>}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading
                    ? "Creating account..."
                    : planFromUrl
                      ? `Create Account & Continue to ${planFromUrl.charAt(0).toUpperCase() + planFromUrl.slice(1)}`
                      : "Create Account"}
                </Button>
              </div>
              <div className="mt-4 text-center text-sm">
                Already have an account?{" "}
                <Link
                  href={planFromUrl ? `/auth/login?plan=${planFromUrl}` : "/auth/login"}
                  className="underline underline-offset-4 text-primary"
                >
                  Sign in
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
