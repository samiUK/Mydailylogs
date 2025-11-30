import type React from "react"
import { BrandingProvider } from "@/components/branding-provider"
import { StaffNavigation } from "@/components/staff-navigation"
import { DashboardFooter } from "@/components/dashboard-footer"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { EmailVerificationBanner } from "@/components/email-verification-banner"
import { handleStaffSignOut } from "./actions"

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

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

  const isStaff = profile.role === "staff"
  if (!isStaff) {
    if (profile.role === "superuser") {
      redirect("/masterdashboard")
    } else if (profile.role === "admin") {
      redirect("/admin")
    }
  }

  const isEmailVerified = user.email_confirmed_at !== null

  return (
    <BrandingProvider
      initialBranding={{
        organizationName: profile.organizations?.organization_name || profile.organization_name || "Your Organization",
        logoUrl: profile.organizations?.logo_url || null,
        primaryColor: profile.organizations?.primary_color || "#059669",
        secondaryColor: profile.organizations?.secondary_color || "#6B7280",
        hasCustomBranding: true,
      }}
    >
      <div className="min-h-screen bg-background flex flex-col">
        <StaffNavigation user={profile} onSignOut={handleStaffSignOut} profileId={profile.id} />
        <EmailVerificationBanner userEmail={user.email || ""} isVerified={isEmailVerified} />
        <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">{children}</main>
        <DashboardFooter />
      </div>
    </BrandingProvider>
  )
}
