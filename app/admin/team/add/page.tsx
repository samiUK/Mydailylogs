"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from 'next/navigation'
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, UserPlus, AlertTriangle, Crown } from 'lucide-react'
import { checkCanCreateTeamMember, checkCanCreateAdmin, getSubscriptionLimits } from "@/lib/subscription-limits"
import { UpgradeNotification } from "@/components/upgrade-notification"
import Link from "next/link"

interface Admin {
  id: string
  first_name: string | null
  last_name: string | null
  full_name: string | null
  email: string
}

export default function AddTeamMemberPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [admins, setAdmins] = useState<Admin[]>([])
  const [canCreateTeamMember, setCanCreateTeamMember] = useState(true)
  const [canCreateAdmin, setCanCreateAdmin] = useState(true)
  const [adminLimitCheck, setAdminLimitCheck] = useState<any>(null)
  const [limitCheckResult, setLimitCheckResult] = useState<any>(null)
  const [subscriptionLimits, setSubscriptionLimits] = useState<any>(null)
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    position: "",
    role: "staff" as "admin" | "staff",
    reportsTo: "none",
  })

  useEffect(() => {
    loadAdminsAndCheckLimits()
  }, [])

  useEffect(() => {
    if (formData.role === "admin" && organizationId) {
      checkAdminLimits()
    }
  }, [formData.role, organizationId])

  const checkAdminLimits = async () => {
    if (!organizationId) return
    
    const adminCheck = await checkCanCreateAdmin(organizationId)
    setAdminLimitCheck(adminCheck)
    setCanCreateAdmin(adminCheck.canCreate)
  }

  const loadAdminsAndCheckLimits = async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single()

    if (profile?.organization_id) {
      setOrganizationId(profile.organization_id)

      const { data: admins } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, full_name, email")
        .eq("organization_id", profile.organization_id)
        .eq("role", "admin")

      setAdmins(admins || [])

      const [limitCheck, limits] = await Promise.all([
        checkCanCreateTeamMember(profile.organization_id),
        getSubscriptionLimits(profile.organization_id),
      ])

      setLimitCheckResult(limitCheck)
      setSubscriptionLimits(limits)
      setCanCreateTeamMember(limitCheck.canCreate)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (formData.role === "admin" && !canCreateAdmin) {
      alert(adminLimitCheck?.reason || "Cannot create admin account due to plan limits")
      return
    }
    
    if (!canCreateTeamMember || !organizationId) return

    const limitCheck = await checkCanCreateTeamMember(organizationId)
    if (!limitCheck.canCreate) {
      alert(limitCheck.reason || "Cannot create team member due to plan limits")
      return
    }

    setIsLoading(true)

    try {
      const supabase = createClient()

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single()

      if (!profile?.organization_id) throw new Error("No organization found")

      const response = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
          position: formData.position,
          role: formData.role,
          organizationId: profile.organization_id,
          reportsTo: formData.reportsTo === "none" ? null : formData.reportsTo,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to create user")
      }

      router.push("/admin/team")
    } catch (error) {
      console.error("Error creating team member:", error)
      alert(error instanceof Error ? error.message : "Failed to create team member")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/admin/team">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Team
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-foreground">Add Team Member</h1>
          <p className="text-muted-foreground mt-2">Create a new team member account with login credentials</p>

          {limitCheckResult && subscriptionLimits && (
            <div className="mt-2 flex items-center gap-4">
              <div className="text-sm text-muted-foreground">
                Team Members: {limitCheckResult.currentCount} / {limitCheckResult.maxAllowed} used
              </div>
              {adminLimitCheck && (
                <div className="text-sm text-muted-foreground">
                  Admins: {adminLimitCheck.currentCount} / {adminLimitCheck.maxAllowed} used
                </div>
              )}
              <div className="text-sm text-muted-foreground">Plan: {subscriptionLimits.planName}</div>
              {!canCreateTeamMember && (
                <Link href="/admin/profile/billing">
                  <Button size="sm" className="bg-accent hover:bg-accent/90">
                    <Crown className="w-4 h-4 mr-1" />
                    Upgrade Plan
                  </Button>
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {formData.role === "admin" && !canCreateAdmin && adminLimitCheck && subscriptionLimits && (
        <UpgradeNotification
          title="Admin Account Limit Reached"
          description={adminLimitCheck.reason}
          currentPlan={subscriptionLimits.planName}
          requiredPlan="Growth"
          variant="alert"
        />
      )}

      {!canCreateTeamMember && limitCheckResult && (
        <Alert className="border-destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{limitCheckResult.reason}</span>
            <Link href="/admin/profile/billing">
              <Button size="sm" variant="destructive">
                Upgrade Now
              </Button>
            </Link>
          </AlertDescription>
        </Alert>
      )}

      <Card className={!canCreateTeamMember ? "opacity-50" : ""}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Team Member Details
          </CardTitle>
          <CardDescription>Enter the team member's information and assign their login credentials</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="position">Position/Job Title</Label>
              <Input
                id="position"
                type="text"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                placeholder="e.g. Operations Manager, Quality Inspector"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="user@company.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Minimum 6 characters"
                minLength={6}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={formData.role}
                onValueChange={(value: "admin" | "staff") => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="admin">
                    Admin
                    {formData.role !== "admin" && adminLimitCheck && !canCreateAdmin && " 🔒"}
                  </SelectItem>
                </SelectContent>
              </Select>
              {formData.role === "admin" && !canCreateAdmin && subscriptionLimits && (
                <p className="text-xs text-muted-foreground">
                  {subscriptionLimits.planName} plan includes {adminLimitCheck?.maxAllowed} admin account.{" "}
                  <Link href="/admin/profile/billing" className="text-accent hover:underline">
                    Upgrade to add more admins
                  </Link>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="reportsTo">Reports To</Label>
              <Select
                value={formData.reportsTo}
                onValueChange={(value) => setFormData({ ...formData, reportsTo: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select supervisor (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No supervisor</SelectItem>
                  {admins.map((admin) => (
                    <SelectItem key={admin.id} value={admin.id}>
                      {admin.full_name || `${admin.first_name} ${admin.last_name}` || admin.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-4 pt-4">
              <Button 
                type="submit" 
                disabled={isLoading || !canCreateTeamMember || (formData.role === "admin" && !canCreateAdmin)}
                className="flex-1"
              >
                {isLoading ? "Creating Account..." : "Create Team Member"}
              </Button>
              <Link href="/admin/team">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
