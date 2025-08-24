import type React from "react"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { BrandingProvider } from "@/components/branding-provider"
import { StaffNavigation } from "@/components/staff-navigation"
import { cookies } from "next/headers"

async function StaffLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = cookies()
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

  const handleSignOut = async () => {
    "use server"
    const cookieStore = cookies()
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
      <div className="min-h-screen bg-gray-50">
        <StaffNavigation user={profile} onSignOut={handleSignOut} />
        <main className="w-full max-w-4xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">{children}</main>
      </div>
    </BrandingProvider>
  )
}

export default StaffLayout
