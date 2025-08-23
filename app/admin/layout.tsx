import type React from "react"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { BrandingProvider } from "@/components/branding-provider"
import { AdminNavigation } from "@/components/admin-navigation"

async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect("/auth/login")
  }

  const { data: profile, error: profileError } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  if (profileError || !profile) {
    redirect("/auth/login?error=profile_not_found")
  }

  if (profile.role !== "admin") {
    redirect("/staff")
  }

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
    redirect("/")
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
