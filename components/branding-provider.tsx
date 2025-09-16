"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState, useCallback } from "react"
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
  isLoading: false,
  refreshBranding: async () => {},
})

export const useBranding = () => useContext(BrandingContext)

interface BrandingProviderProps {
  children: React.ReactNode
  initialBranding?: Partial<BrandingContextType>
}

let cachedBranding: BrandingContextType | null = null

export function BrandingProvider({ children, initialBranding }: BrandingProviderProps) {
  const [branding, setBranding] = useState<BrandingContextType>({
    organizationName: initialBranding?.organizationName || "Your Organization",
    logoUrl: initialBranding?.logoUrl || null,
    primaryColor: initialBranding?.primaryColor || "#059669",
    secondaryColor: initialBranding?.secondaryColor || "#6B7280",
    hasCustomBranding: initialBranding?.hasCustomBranding || true,
    isLoading: false,
    refreshBranding: async () => {},
  })

  const refreshBranding = useCallback(async () => {
    if (branding.isLoading) return // Prevent multiple simultaneous calls

    const supabase = createClient()
    setBranding((prev) => ({ ...prev, isLoading: true }))

    try {
      const isImpersonating = document.cookie.includes("masterAdminImpersonation=true")

      if (isImpersonating) {
        const impersonatedEmail = document.cookie.split("impersonatedUserEmail=")[1]?.split(";")[0]

        if (impersonatedEmail) {
          const { data: profile } = await supabase
            .from("profiles")
            .select(`
              organization_name,
              organizations!inner(logo_url, primary_color, secondary_color)
            `)
            .eq("email", decodeURIComponent(impersonatedEmail))
            .single()

          if (profile?.organizations) {
            const newBranding = {
              organizationName: profile.organization_name || "Your Organization",
              logoUrl: profile.organizations.logo_url,
              primaryColor: profile.organizations.primary_color || "#059669",
              secondaryColor: profile.organizations.secondary_color || "#6B7280",
              hasCustomBranding: true,
              isLoading: false,
              refreshBranding,
            }
            setBranding(newBranding)
            cachedBranding = newBranding
            return
          }
        }
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setBranding((prev) => ({ ...prev, isLoading: false }))
        return
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select(`
          organization_name,
          organizations!inner(logo_url, primary_color, secondary_color)
        `)
        .eq("id", user.id)
        .single()

      if (profile?.organizations) {
        const newBranding = {
          organizationName: profile.organization_name || "Your Organization",
          logoUrl: profile.organizations.logo_url,
          primaryColor: profile.organizations.primary_color || "#059669",
          secondaryColor: profile.organizations.secondary_color || "#6B7280",
          hasCustomBranding: true,
          isLoading: false,
          refreshBranding,
        }
        setBranding(newBranding)
        cachedBranding = newBranding
      }
    } catch (error) {
      setBranding((prev) => ({ ...prev, isLoading: false }))
    }
  }, [branding.isLoading])

  useEffect(() => {
    if (!initialBranding && !cachedBranding) {
      refreshBranding()
    } else if (cachedBranding) {
      setBranding({ ...cachedBranding, refreshBranding })
    }
  }, [])

  useEffect(() => {
    const handleRefresh = () => refreshBranding()
    window.addEventListener("brandingRefresh", handleRefresh)
    return () => window.removeEventListener("brandingRefresh", handleRefresh)
  }, [])

  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty("--brand-primary", branding.primaryColor)
    root.style.setProperty("--brand-secondary", branding.secondaryColor)
  }, [branding.primaryColor, branding.secondaryColor])

  const contextValue = {
    ...branding,
    refreshBranding,
  }

  return <BrandingContext.Provider value={contextValue}>{children}</BrandingContext.Provider>
}
