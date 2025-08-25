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
  organizationName: "MyDayLogs", // Updated default from "Mydailylogs" to "MyDayLogs"
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
    isLoading: initialBranding?.isLoading ?? true,
    refreshBranding: async () => {},
  })

  const refreshBranding = async () => {
    const supabase = createClient()

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

    const subscriptionLimits = await getSubscriptionLimits(profile.organization_id)

    const { data: organization } = await supabase
      .from("organizations")
      .select("logo_url, primary_color, secondary_color")
      .eq("id", profile.organization_id)
      .single()

    if (organization) {
      setBranding({
        organizationName: subscriptionLimits.hasCustomBranding
          ? profile.organization_name || "Your Organization"
          : "MyDayLogs",
        logoUrl: organization.logo_url,
        primaryColor: subscriptionLimits.hasCustomBranding ? organization.primary_color || "#059669" : "#059669",
        secondaryColor: subscriptionLimits.hasCustomBranding ? organization.secondary_color || "#6B7280" : "#6B7280",
        hasCustomBranding: subscriptionLimits.hasCustomBranding,
        isLoading: false,
        refreshBranding,
      })
    }
  }

  useEffect(() => {
    const fetchOrganizationBranding = async () => {
      const supabase = createClient()

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setBranding((prev) => ({ ...prev, isLoading: false }))
        return
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id, organization_name")
        .eq("id", user.id)
        .single()

      if (!profile?.organization_id) {
        setBranding((prev) => ({ ...prev, isLoading: false }))
        return
      }

      const subscriptionLimits = await getSubscriptionLimits(profile.organization_id)

      const { data: organization } = await supabase
        .from("organizations")
        .select("logo_url, primary_color, secondary_color")
        .eq("id", profile.organization_id)
        .single()

      if (organization) {
        setBranding({
          organizationName: subscriptionLimits.hasCustomBranding
            ? profile.organization_name || "Your Organization"
            : "MyDayLogs",
          logoUrl: organization.logo_url,
          primaryColor: subscriptionLimits.hasCustomBranding ? organization.primary_color || "#059669" : "#059669",
          secondaryColor: subscriptionLimits.hasCustomBranding ? organization.secondary_color || "#6B7280" : "#6B7280",
          hasCustomBranding: subscriptionLimits.hasCustomBranding,
          isLoading: false,
          refreshBranding,
        })
      } else {
        setBranding((prev) => ({ ...prev, isLoading: false }))
      }
    }

    if (!initialBranding) {
      fetchOrganizationBranding()
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
