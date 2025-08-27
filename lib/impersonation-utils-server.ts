import { createClient as createServerClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"

// Types for impersonation context
export interface ImpersonationContext {
  isImpersonating: boolean
  impersonatedUserEmail?: string
  impersonatedUserRole?: string
  impersonatedOrganizationId?: string
  masterAdminType?: "master_admin" | "superuser"
}

export interface EffectiveUser {
  id: string
  email: string
  profile: any
  isImpersonated: boolean
  impersonationContext?: ImpersonationContext
}

// Server-side impersonation detection using cookies
export async function getServerImpersonationContext(): Promise<ImpersonationContext> {
  const cookieStore = await cookies()
  const isMasterAdminImpersonating = cookieStore.get("masterAdminImpersonation")?.value === "true"
  const impersonatedUserEmail = cookieStore.get("impersonatedUserEmail")?.value
  const impersonatedUserRole = cookieStore.get("impersonatedUserRole")?.value
  const impersonatedOrganizationId = cookieStore.get("impersonatedOrganizationId")?.value
  const masterAdminType = cookieStore.get("masterAdminType")?.value as "master_admin" | "superuser"

  return {
    isImpersonating: isMasterAdminImpersonating,
    impersonatedUserEmail,
    impersonatedUserRole,
    impersonatedOrganizationId,
    masterAdminType,
  }
}

// Get effective user for server components
export async function getEffectiveServerUser(): Promise<EffectiveUser | null> {
  const impersonationContext = await getServerImpersonationContext()
  const supabase = await createServerClient()

  if (impersonationContext.isImpersonating && impersonationContext.impersonatedUserEmail) {
    // Get impersonated user's profile
    const { data: impersonatedProfile, error: impersonatedError } = await supabase
      .from("profiles")
      .select("*")
      .eq("email", impersonationContext.impersonatedUserEmail)
      .single()

    if (impersonatedProfile) {
      return {
        id: impersonatedProfile.id,
        email: impersonationContext.impersonatedUserEmail,
        profile: impersonatedProfile,
        isImpersonated: true,
        impersonationContext,
      }
    }
  }

  // Regular authentication flow
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) {
    return null
  }

  const { data: profile, error: profileError } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  if (profileError || !profile) {
    return null
  }

  return {
    id: user.id,
    email: user.email || "",
    profile,
    isImpersonated: false,
  }
}

// Utility to check if user has master admin privileges
export async function hasMasterAdminPrivileges(): Promise<boolean> {
  const context = await getServerImpersonationContext()
  return context.masterAdminType === "master_admin"
}

// Utility to check if user is a superuser
export async function isSuperuser(): Promise<boolean> {
  const context = await getServerImpersonationContext()
  return context.masterAdminType === "superuser"
}
