import type React from "react"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { BrandingProvider } from "@/components/branding-provider"
import { StaffNavigation } from "@/components/staff-navigation"

async function StaffLayout({ children }: { children: React.ReactNode }) {
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
    redirect("/auth/login")
  }

  const handleSignOut = async () => {
    "use server"
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect("/")
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
