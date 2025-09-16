import { createClient as createServerClient } from "@/lib/supabase/server"
import { cookies, headers } from "next/headers"
import { extractUserFromUrl } from "@/lib/url-session-utils"

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

export async function getServerImpersonationContext(): Promise<ImpersonationContext> {
  const headersList = await headers()
  const pathname = headersList.get("x-pathname") || headersList.get("x-url") || ""

  // First check URL for user-specific routes
  const { userEmail, role } = extractUserFromUrl(pathname)

  if (userEmail && role) {
    return {
      isImpersonating: true,
      impersonatedUserEmail: userEmail,
      impersonatedUserRole: role,
      masterAdminType: "master_admin", // Default for URL-based sessions
    }
  }

  // Fallback to cookies for backward compatibility
  const cookieStore = await cookies()
  const isMasterAdminImpersonating = cookieStore.get("masterAdminImpersonation")?.value === "true"
  const impersonatedUserEmail = cookieStore.get("impersonatedUserEmail")?.value
  const impersonatedUserRole = cookieStore.get("impersonatedUserRole")?.value
  const impersonatedOrganizationId = cookieStore.get("impersonatedOrganizationId")?.value
  const masterAdminType = cookieStore.get("masterAdminType")?.value as "master_admin" | "superuser"

  return {
    isImpersonating: isMasterAdminImpersonating,
    impersonatedUserEmail: impersonatedUserEmail ? decodeURIComponent(impersonatedUserEmail) : undefined,
    impersonatedUserRole,
    impersonatedOrganizationId,
    masterAdminType,
  }
}

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
