"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { getSubscriptionLimits } from "@/lib/subscription-limits"

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
  organizationName: "MyDayLogs",
  logoUrl: null,
  primaryColor: "#059669",
  secondaryColor: "#6B7280",
  hasCustomBranding: false,
  isLoading: true,
  refreshBranding: async () => {},
})

export const useBranding = () => useContext(BrandingContext)

interface BrandingProviderProps {
  children: React.ReactNode
  initialBranding?: Partial<BrandingContextType>
}

export function BrandingProvider({ children, initialBranding }: BrandingProviderProps) {
  const [branding, setBranding] = useState<BrandingContextType>({
    organizationName: initialBranding?.organizationName || "MyDayLogs",
    logoUrl: initialBranding?.logoUrl || null,
    primaryColor: initialBranding?.primaryColor || "#059669",
    secondaryColor: initialBranding?.secondaryColor || "#6B7280",
    hasCustomBranding: initialBranding?.hasCustomBranding || false,
    isLoading: false,
    refreshBranding: async () => {},
  })

  const refreshBranding = async () => {
    const supabase = createClient()

    try {
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
            .select("organization_id, organization_name")
            .eq("email", decodeURIComponent(impersonatedEmail))
            .single()

          if (profile?.organization_id) {
            const [subscriptionLimits, organizationData] = await Promise.all([
              getSubscriptionLimits(profile.organization_id),
              supabase
                .from("organizations")
                .select("logo_url, primary_color, secondary_color")
                .eq("id", profile.organization_id)
                .single(),
            ])

            if (organizationData.data) {
              setBranding({
                organizationName: profile.organization_name || "Your Organization",
                logoUrl: organizationData.data.logo_url,
                primaryColor: organizationData.data.primary_color || "#059669",
                secondaryColor: organizationData.data.secondary_color || "#6B7280",
                hasCustomBranding: true,
                isLoading: false,
                refreshBranding,
              })
            }
          }
        }
        return
      }

      // Regular user authentication
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id, organization_name")
        .eq("id", user.id)
        .single()

      if (!profile?.organization_id) return

      const [subscriptionLimits, organizationData] = await Promise.all([
        getSubscriptionLimits(profile.organization_id),
        supabase
          .from("organizations")
          .select("logo_url, primary_color, secondary_color")
          .eq("id", profile.organization_id)
          .single(),
      ])

      if (organizationData.data) {
        setBranding({
          organizationName: subscriptionLimits.hasCustomBranding
            ? profile.organization_name || "Your Organization"
            : "MyDayLogs",
          logoUrl: organizationData.data.logo_url,
          primaryColor: subscriptionLimits.hasCustomBranding
            ? organizationData.data.primary_color || "#059669"
            : "#059669",
          secondaryColor: subscriptionLimits.hasCustomBranding
            ? organizationData.data.secondary_color || "#6B7280"
            : "#6B7280",
          hasCustomBranding: subscriptionLimits.hasCustomBranding,
          isLoading: false,
          refreshBranding,
        })
      }
    } catch (error) {
      console.error("[v0] Error refreshing branding:", error)
      setBranding((prev) => ({
        ...prev,
        organizationName: "MyDayLogs",
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
