import type React from "react"
import { BrandingProvider } from "@/components/branding-provider"
import { StaffNavigation } from "@/components/staff-navigation"
import { DashboardFooter } from "@/components/dashboard-footer"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { EmailVerificationBanner } from "@/components/email-verification-banner"
import { ImpersonationBanner } from "@/components/impersonation-banner"
import { cookies } from "next/headers"

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
      is_email_verified,
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

  const handleSignOut = async () => {
    "use server"
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect("/auth/login")
  }

  const isEmailVerified = profile.is_email_verified === true

  const cookieStore = await cookies()
  const impersonationActive = cookieStore.get("impersonation-active")?.value === "true"
  const impersonationData = cookieStore.get("impersonation-data")?.value
  let parsedImpersonationData = null
  if (impersonationData) {
    try {
      parsedImpersonationData = JSON.parse(impersonationData)
    } catch (e) {
      console.error("[v0] Failed to parse impersonation data:", e)
    }
  }

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
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--brand-accent-bg, #f0fdf4)" }}>
        {impersonationActive && parsedImpersonationData && (
          <ImpersonationBanner
            userEmail={parsedImpersonationData.userEmail}
            userRole={parsedImpersonationData.userRole}
          />
        )}
        <StaffNavigation user={profile} onSignOut={handleSignOut} profileId={profile.id} />
        <EmailVerificationBanner userEmail={user.email || ""} isVerified={isEmailVerified} />
        <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">{children}</main>
        <DashboardFooter />
      </div>
    </BrandingProvider>
  )
}
