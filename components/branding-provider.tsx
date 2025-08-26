"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

interface BrandingContextType {
  organizationName: string
  logoUrl: string | null
  primaryColor: string
  secondaryColor: string
  hasCustomBranding: boolean
  isLoading: boolean
  refreshBranding: () => Promise<void>
}

const BrandingContext = createContext<BrandingContextType>({
  organizationName: "Your Organization",
  logoUrl: null,
  primaryColor: "#059669",
  secondaryColor: "#6B7280",
  hasCustomBranding: false,
  isLoading: false, // Set default loading to false for better performance
  refreshBranding: async () => {},
})

export const useBranding = () => useContext(BrandingContext)

interface BrandingProviderProps {
  children: React.ReactNode
  initialBranding?: Partial<BrandingContextType>
}

const brandingCache = new Map<string, { data: BrandingContextType; timestamp: number }>()
const CACHE_DURATION = 10 * 60 * 1000 // 10 minutes

export function BrandingProvider({ children, initialBranding }: BrandingProviderProps) {
  const [branding, setBranding] = useState<BrandingContextType>({
    organizationName: initialBranding?.organizationName || "Your Organization",
    logoUrl: initialBranding?.logoUrl || null,
    primaryColor: initialBranding?.primaryColor || "#059669",
    secondaryColor: initialBranding?.secondaryColor || "#6B7280",
    hasCustomBranding: initialBranding?.hasCustomBranding || true,
    isLoading: false, // Start with false loading state
    refreshBranding: async () => {},
  })

  const refreshBranding = async () => {
    const supabase = createClient()

    try {
      const cacheKey = document.cookie.includes("masterAdminImpersonation=true")
        ? `impersonated_${document.cookie.split("impersonatedUserEmail=")[1]?.split(";")[0] || "unknown"}`
        : "current_user"

      const cached = brandingCache.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        setBranding(cached.data)
        return
      }

      // Check for impersonation context from cookies only
      const impersonationCookie = document.cookie.split("; ").find((row) => row.startsWith("masterAdminImpersonation="))
      const isImpersonating = impersonationCookie?.split("=")[1] === "true"

      if (isImpersonating) {
        const impersonatedEmailCookie = document.cookie
          .split("; ")
          .find((row) => row.startsWith("impersonatedUserEmail="))
        const impersonatedEmail = impersonatedEmailCookie?.split("=")[1]

        if (impersonatedEmail) {
          const { data: profile } = await supabase
            .from("profiles")
            .select(`
              organization_id, 
              organization_name,
              organizations!inner(logo_url, primary_color, secondary_color)
            `)
            .eq("email", decodeURIComponent(impersonatedEmail))
            .single()

          if (profile) {
            const newBranding = {
              organizationName: profile.organization_name || "Your Organization",
              logoUrl: profile.organizations?.logo_url || null,
              primaryColor: profile.organizations?.primary_color || "#059669",
              secondaryColor: profile.organizations?.secondary_color || "#6B7280",
              hasCustomBranding: true,
              isLoading: false,
              refreshBranding,
            }

            setBranding(newBranding)
            brandingCache.set(cacheKey, { data: newBranding, timestamp: Date.now() })
          }
        }
        return
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from("profiles")
        .select(`
          organization_id, 
          organization_name,
          organizations(logo_url, primary_color, secondary_color)
        `)
        .eq("id", user.id)
        .single()

      if (profile) {
        const newBranding = {
          organizationName: profile.organization_name || "Your Organization",
          logoUrl: profile.organizations?.logo_url || null,
          primaryColor: profile.organizations?.primary_color || "#059669",
          secondaryColor: profile.organizations?.secondary_color || "#6B7280",
          hasCustomBranding: true,
          isLoading: false,
          refreshBranding,
        }

        setBranding(newBranding)
        brandingCache.set(cacheKey, { data: newBranding, timestamp: Date.now() })
      }
    } catch (error) {
      setBranding((prev) => ({
        ...prev,
        isLoading: false,
        refreshBranding,
      }))
    }
  }

  useEffect(() => {
    if (!initialBranding) {
      refreshBranding()
    } else {
      setBranding((prev) => ({ ...prev, isLoading: false, refreshBranding }))
    }

    const handleBrandingRefresh = () => {
      refreshBranding()
    }

    window.addEventListener("brandingRefresh", handleBrandingRefresh)
    return () => window.removeEventListener("brandingRefresh", handleBrandingRefresh)
  }, [initialBranding])

  useEffect(() => {
    document.documentElement.style.setProperty("--brand-primary", branding.primaryColor)
    document.documentElement.style.setProperty("--brand-secondary", branding.secondaryColor)
  }, [branding.primaryColor, branding.secondaryColor])

  return <BrandingContext.Provider value={branding}>{children}</BrandingContext.Provider>
}
