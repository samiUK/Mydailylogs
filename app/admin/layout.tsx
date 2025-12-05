import type React from "react"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AdminNavigation } from "@/components/admin-navigation"
import { BrandingProvider } from "@/components/branding-provider"
import { DashboardFooter } from "@/components/dashboard-footer"
import { EmailVerificationBanner } from "@/components/email-verification-banner"
import { PaymentFailedBanner } from "@/components/payment-failed-banner"
import { ImpersonationBanner } from "@/components/impersonation-banner"
import { cookies } from "next/headers"
import { syncSubscriptionOnLogin } from "@/lib/subscription-sync-failsafe"
import { SubscriptionRealtimeProvider } from "./subscription-realtime-provider"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
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

  if (profile.role !== "admin" && profile.role !== "manager" && profile.role !== "master_admin") {
    redirect("/unauthorized")
  }

  const organizationId = profile.organizations?.organization_id

  if (organizationId && user.email) {
    try {
      await syncSubscriptionOnLogin(organizationId, user.email)
      console.log("[v0] ✅ Subscription synced from Stripe on login")
    } catch (error) {
      console.error("[v0] ❌ Subscription sync failed on login:", error)
      // Don't block login if sync fails
    }
  }

  const handleSignOut = async () => {
    "use server"
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect("/auth/login")
  }

  const brandingData = {
    organizationName: profile.organizations?.organization_name || profile.organization_name || "Your Organization",
    logoUrl: profile.organizations?.logo_url || null,
    primaryColor: profile.organizations?.primary_color || "#059669",
    secondaryColor: profile.organizations?.secondary_color || "#6B7280",
    hasCustomBranding: true,
  }

  const isEmailVerified = profile.is_email_verified === true

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("status, plan_name, grace_period_ends_at, stripe_subscription_id, cancel_at_period_end, current_period_end")
    .eq("organization_id", organizationId)
    .in("status", ["active", "trialing"])
    .maybeSingle()

  const hasPaymentFailed = subscription?.status === "past_due" && subscription?.grace_period_ends_at
  const gracePeriodEndsAt = subscription?.grace_period_ends_at || null

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
    <BrandingProvider initialBranding={brandingData}>
      <SubscriptionRealtimeProvider organizationId={organizationId!} initialSubscription={subscription as any}>
        <div className="min-h-screen bg-gray-50 flex flex-col">
          {impersonationActive && parsedImpersonationData && (
            <ImpersonationBanner
              userEmail={parsedImpersonationData.userEmail}
              userRole={parsedImpersonationData.userRole}
            />
          )}
          <AdminNavigation user={profile} onSignOut={handleSignOut} />
          <EmailVerificationBanner userEmail={user.email || ""} isVerified={isEmailVerified} />
          {hasPaymentFailed && gracePeriodEndsAt && <PaymentFailedBanner gracePeriodEndsAt={gracePeriodEndsAt} />}
          <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">{children}</main>
          <DashboardFooter />
        </div>
      </SubscriptionRealtimeProvider>
    </BrandingProvider>
  )
}
