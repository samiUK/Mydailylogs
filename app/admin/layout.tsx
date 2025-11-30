import type React from "react"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AdminNavigation } from "@/components/admin-navigation"
import { BrandingProvider } from "@/components/branding-provider"
import { DashboardFooter } from "@/components/dashboard-footer"
import { EmailVerificationBanner } from "@/components/email-verification-banner"
import { handleAdminSignOut } from "./actions"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  console.log("[v0] Admin Layout - User Email:", user.email)
  console.log("[v0] Admin Layout - Email Confirmed At:", user.email_confirmed_at)
  console.log("[v0] Admin Layout - Is Verified:", user.email_confirmed_at !== null)

  const { data: profile } = await supabase
    .from("profiles")
    .select(`
      id,
      role,
      full_name,
      first_name,
      avatar_url,
      email,
      organization_name,
      organizations(
        organization_id,
        organization_name,
        logo_url,
        primary_color,
        secondary_color
      )
    `)
    .eq("id", user.id)
    .single()

  if (!profile) {
    redirect("/auth/login")
  }

  if (profile.role !== "admin" && profile.role !== "master_admin") {
    redirect("/unauthorized")
  }

  const brandingData = {
    organizationName: profile.organizations?.organization_name || profile.organization_name || "Your Organization",
    logoUrl: profile.organizations?.logo_url || null,
    primaryColor: profile.organizations?.primary_color || "#059669",
    secondaryColor: profile.organizations?.secondary_color || "#6B7280",
    hasCustomBranding: true,
  }

  const isEmailVerified = user.email_confirmed_at !== null

  return (
    <BrandingProvider initialBranding={brandingData}>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <AdminNavigation user={profile} onSignOut={handleAdminSignOut} />
        <EmailVerificationBanner userEmail={user.email || ""} isVerified={isEmailVerified} />
        <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">{children}</main>
        <DashboardFooter />
      </div>
    </BrandingProvider>
  )
}
