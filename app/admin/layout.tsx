import type React from "react"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { BrandingProvider } from "@/components/branding-provider"
import { AdminNavigation } from "@/components/admin-navigation"
import { cookies } from "next/headers"

async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const isMasterAdminImpersonating = cookieStore.get("masterAdminImpersonation")?.value === "true"
  const impersonatedUserEmail = cookieStore.get("impersonatedUserEmail")?.value

  let user: any = null
  let profile: any = null

  if (isMasterAdminImpersonating && impersonatedUserEmail) {
    const supabase = await createClient()
    const { data: impersonatedProfile } = await supabase
      .from("profiles")
      .select("*")
      .eq("email", impersonatedUserEmail)
      .single()

    if (impersonatedProfile) {
      user = { email: impersonatedUserEmail }
      profile = impersonatedProfile
    } else {
      redirect("/auth/login?error=impersonated_user_not_found")
    }
  } else {
    const supabase = await createClient()
    const {
      data: { user: authUser },
      error,
    } = await supabase.auth.getUser()

    if (error || !authUser) {
      redirect("/auth/login")
    }

    const { data: userProfile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", authUser.id)
      .single()

    if (profileError || !userProfile) {
      redirect("/auth/login?error=profile_not_found")
    }

    if (userProfile.role !== "admin") {
      redirect("/staff")
    }

    user = authUser
    profile = userProfile
  }

  const supabase = await createClient()
  const { data: organization } = await supabase
    .from("organizations")
    .select("name, logo_url, primary_color, secondary_color")
    .eq("id", profile.organization_id)
    .single()

  const brandingData = {
    organizationName: organization?.name || "Mydailylogs",
    logoUrl: organization?.logo_url || null,
    primaryColor: organization?.primary_color || "#059669",
    secondaryColor: organization?.secondary_color || "#6B7280",
    isLoading: false,
  }

  const handleSignOut = async () => {
    "use server"
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect("/auth/login")
  }

  return (
    <BrandingProvider initialBranding={brandingData}>
      <div className="min-h-screen bg-gray-50">
        <AdminNavigation user={profile} onSignOut={handleSignOut} />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
      </div>
    </BrandingProvider>
  )
}

export default AdminLayout
