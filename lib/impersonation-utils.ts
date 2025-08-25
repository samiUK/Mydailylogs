import { createClient } from "@/lib/supabase/client"
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
  const cookieStore = cookies()
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

// Client-side impersonation detection using cookies
export function getClientImpersonationContext(): ImpersonationContext {
  if (typeof window === "undefined") {
    return { isImpersonating: false }
  }

  // Use only cookies for session management
  const isImpersonating =
    document.cookie
      .split("; ")
      .find((row) => row.startsWith("masterAdminImpersonation="))
      ?.split("=")[1] === "true"

  const impersonatedUserEmail = document.cookie
    .split("; ")
    .find((row) => row.startsWith("impersonatedUserEmail="))
    ?.split("=")[1]

  const impersonatedUserRole = document.cookie
    .split("; ")
    .find((row) => row.startsWith("impersonatedUserRole="))
    ?.split("=")[1]

  const impersonatedOrganizationId = document.cookie
    .split("; ")
    .find((row) => row.startsWith("impersonatedOrganizationId="))
    ?.split("=")[1]

  const masterAdminType = document.cookie
    .split("; ")
    .find((row) => row.startsWith("masterAdminType="))
    ?.split("=")[1] as "master_admin" | "superuser"

  return {
    isImpersonating,
    impersonatedUserEmail: impersonatedUserEmail ? decodeURIComponent(impersonatedUserEmail) : undefined,
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

// Get effective user for client components
export async function getEffectiveClientUser(): Promise<EffectiveUser | null> {
  const impersonationContext = getClientImpersonationContext()
  const supabase = createClient()

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

// Start impersonation session (client-side)
export function startImpersonation(
  targetUserEmail: string,
  targetUserRole: string,
  targetOrganizationId: string,
  masterAdminType: "master_admin" | "superuser" = "master_admin",
) {
  // Set cookies for server-side detection only
  document.cookie = `masterAdminImpersonation=true; path=/; max-age=86400; SameSite=Lax`
  document.cookie = `impersonatedUserEmail=${encodeURIComponent(targetUserEmail)}; path=/; max-age=86400; SameSite=Lax`
  document.cookie = `impersonatedUserRole=${targetUserRole}; path=/; max-age=86400; SameSite=Lax`
  document.cookie = `impersonatedOrganizationId=${targetOrganizationId}; path=/; max-age=86400; SameSite=Lax`
  document.cookie = `masterAdminType=${masterAdminType}; path=/; max-age=86400; SameSite=Lax`
}

// Exit impersonation session (client-side)
export function exitImpersonation() {
  // Clear cookies only
  document.cookie = "masterAdminImpersonation=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
  document.cookie = "impersonatedUserEmail=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
  document.cookie = "impersonatedUserRole=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
  document.cookie = "impersonatedOrganizationId=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
  document.cookie = "masterAdminType=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"

  // Redirect to master dashboard
  window.location.href = "/masterdashboard"
}

// Check if current session is impersonated (works in both client and server)
export function isCurrentlyImpersonating(): boolean {
  if (typeof window !== "undefined") {
    // Client-side check
    const context = getClientImpersonationContext()
    return context.isImpersonating
  }

  // Server-side check would need to be called differently
  return false
}

// Get impersonation banner data for UI display
export function getImpersonationBannerData(): {
  show: boolean
  userEmail: string
  userRole: string
  masterAdminType: string
} | null {
  const context = getClientImpersonationContext()

  if (context.isImpersonating && context.impersonatedUserEmail) {
    return {
      show: true,
      userEmail: context.impersonatedUserEmail,
      userRole: context.impersonatedUserRole || "user",
      masterAdminType: context.masterAdminType || "master_admin",
    }
  }

  return null
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
