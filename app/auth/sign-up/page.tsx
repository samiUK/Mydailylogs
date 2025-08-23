"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { createAdminClient } from "@/lib/supabase/admin"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MydailylogsLogo } from "@/components/mydailylogs-logo"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

export default function SignUpPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [organizationName, setOrganizationName] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      setIsLoading(false)
      return
    }

    try {
      const fullName = `${firstName} ${lastName}`.trim()

      const adminSupabase = createAdminClient()

      const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Skip email confirmation for admin-created accounts
        user_metadata: {
          full_name: fullName,
          first_name: firstName,
          last_name: lastName,
          display_name: firstName,
          organization_name: organizationName,
          organization_slug: organizationName
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9-]/g, ""),
        },
      })

      if (authError) throw authError

      if (authData.user) {
        console.log("[v0] User created successfully:", authData.user.id)

        const { data: orgData, error: orgError } = await adminSupabase
          .from("organizations")
          .insert({
            name: organizationName,
            slug: organizationName
              .toLowerCase()
              .replace(/\s+/g, "-")
              .replace(/[^a-z0-9-]/g, ""),
          })
          .select()
          .single()

        if (orgError) {
          console.error("[v0] Organization creation error:", orgError)
          // Clean up the user if organization creation fails
          await adminSupabase.auth.admin.deleteUser(authData.user.id)
          throw new Error(`Organization creation failed: ${orgError.message}`)
        }

        console.log("[v0] Organization created successfully:", orgData.id)

        const { error: profileError } = await adminSupabase.from("profiles").insert({
          id: authData.user.id,
          organization_id: orgData.id,
          first_name: firstName,
          last_name: lastName,
          full_name: fullName,
          email: email,
          role: "admin", // All signups are admin since only admins can create accounts
        })

        if (profileError) {
          console.error("[v0] Profile creation error:", profileError)
          // Clean up the user and organization if profile creation fails
          await adminSupabase.auth.admin.deleteUser(authData.user.id)
          await adminSupabase.from("organizations").delete().eq("id", orgData.id)
          throw new Error(`Profile creation failed: ${profileError.message}`)
        }

        console.log("[v0] Profile created successfully")

        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (signInError) {
          console.error("[v0] Sign in error:", signInError)
          throw new Error(`Sign in failed: ${signInError.message}`)
        }

        console.log("[v0] Admin account setup completed successfully")
        router.push("/admin")
      }
    } catch (error: unknown) {
      console.log("[v0] Signup error:", error)
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary to-accent/20 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <MydailylogsLogo size="lg" />
            </div>
            <CardTitle className="text-2xl">Create Account</CardTitle>
            <CardDescription>Set up your Mydailylogs organization</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignUp}>
              <div className="flex flex-col gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="organizationName">Organization Name</Label>
                  <Input
                    id="organizationName"
                    type="text"
                    placeholder="Your Company Name"
                    required
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="grid gap-2">
                    <Label htmlFor="firstName">First Name</Label>
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
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      type="text"
                      placeholder="Doe"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@company.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Creating account..." : "Create Account"}
                </Button>
              </div>
              <div className="mt-4 text-center text-sm">
                Already have an account?{" "}
                <Link href="/auth/login" className="underline underline-offset-4 text-primary">
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
