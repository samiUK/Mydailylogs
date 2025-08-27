import type React from "react"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { BrandingProvider } from "@/components/branding-provider"
import { StaffNavigation } from "@/components/staff-navigation"
import { cookies } from "next/headers"
import { FeedbackModal } from "@/components/feedback-modal"
import { FeedbackBanner } from "@/components/feedback-banner"

export const dynamic = "force-dynamic"

async function StaffLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const isMasterAdminImpersonating = cookieStore.get("masterAdminImpersonation")?.value === "true"
  const impersonatedUserEmail = cookieStore.get("impersonatedUserEmail")?.value

  let user = null
  let profile = null

  if (isMasterAdminImpersonating && impersonatedUserEmail) {
    const supabase = await createClient()
    const { data: impersonatedProfile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("email", impersonatedUserEmail)
      .single()

    if (profileError || !impersonatedProfile) {
      redirect("/auth/login")
    }

    profile = impersonatedProfile
  } else {
    const supabase = await createClient()

    const {
      data: { user: authUser },
      error,
    } = await supabase.auth.getUser()

    if (error || !authUser) {
      redirect("/auth/login")
    }

    user = authUser

    const { data: userProfile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()

    if (profileError || !userProfile) {
      redirect("/auth/login")
    }

    profile = userProfile
  }

  const supabase = await createClient()
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("status, plan_name")
    .eq("organization_id", profile.organization_id)
    .single()

  const handleSignOut = async () => {
    "use server"
    const cookieStore = await cookies()
    const isMasterAdminImpersonating = cookieStore.get("masterAdminImpersonation")?.value === "true"

    if (isMasterAdminImpersonating) {
      // For impersonated sessions, redirect to master dashboard
      redirect("/masterdashboard")
    } else {
      // For normal users, sign out and redirect to login
      const supabase = await createClient()
      await supabase.auth.signOut()
      redirect("/auth/login")
    }
  }

  return (
    <BrandingProvider>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <FeedbackBanner />
        <StaffNavigation user={profile} onSignOut={handleSignOut} subscriptionStatus={subscription?.status || null} />
        <main className="flex-1 w-full max-w-4xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">{children}</main>

        <footer className="mt-auto bg-white border-t border-gray-200 py-4">
          <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-6">
            <p className="text-center text-sm text-gray-500">© 2025 Mydaylogs. All rights reserved.</p>
          </div>
        </footer>

        <FeedbackModal autoTrigger={true} />
      </div>
    </BrandingProvider>
  )
}

export default StaffLayout
