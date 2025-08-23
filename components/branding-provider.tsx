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
}

const BrandingContext = createContext<BrandingContextType>({
  organizationName: "MyDayLogs", // Updated default from "Mydailylogs" to "MyDayLogs"
  logoUrl: null,
  primaryColor: "#059669",
  secondaryColor: "#6B7280",
  hasCustomBranding: false,
  isLoading: true,
})

export const useBranding = () => useContext(BrandingContext)

interface BrandingProviderProps {
  children: React.ReactNode
  initialBranding?: Partial<BrandingContextType>
}

export function BrandingProvider({ children, initialBranding }: BrandingProviderProps) {
  const [branding, setBranding] = useState<BrandingContextType>({
    organizationName: initialBranding?.organizationName || "MyDayLogs", // Updated default from "Mydailylogs" to "MyDayLogs"
    logoUrl: initialBranding?.logoUrl || null,
    primaryColor: initialBranding?.primaryColor || "#059669",
    secondaryColor: initialBranding?.secondaryColor || "#6B7280",
    hasCustomBranding: initialBranding?.hasCustomBranding || false,
    isLoading: initialBranding?.isLoading ?? true,
  })

  useEffect(() => {
    const fetchOrganizationBranding = async () => {
      const supabase = createClient()

      // Get current user to find their organization
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setBranding((prev) => ({ ...prev, isLoading: false }))
        return
      }

      // Get user's profile to find organization_id
      const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single()

      if (!profile?.organization_id) {
        setBranding((prev) => ({ ...prev, isLoading: false }))
        return
      }

      const subscriptionLimits = await getSubscriptionLimits(profile.organization_id)

      // Get organization branding data
      const { data: organization } = await supabase
        .from("organizations")
        .select("name, logo_url, primary_color, secondary_color")
        .eq("id", profile.organization_id)
        .single()

      if (organization) {
        setBranding({
          organizationName: subscriptionLimits.hasCustomBranding
            ? organization.name || "Your Organization"
            : "MyDayLogs", // Updated default from "Mydailylogs" to "MyDayLogs"
          logoUrl: organization.logo_url,
          primaryColor: subscriptionLimits.hasCustomBranding ? organization.primary_color || "#059669" : "#059669", // Default MyDayLogs green for free users
          secondaryColor: subscriptionLimits.hasCustomBranding ? organization.secondary_color || "#6B7280" : "#6B7280", // Default gray for free users
          hasCustomBranding: subscriptionLimits.hasCustomBranding,
          isLoading: false,
        })
      } else {
        setBranding((prev) => ({ ...prev, isLoading: false }))
      }
    }

    // Only fetch if we don't have initial branding data
    if (!initialBranding) {
      fetchOrganizationBranding()
    } else {
      setBranding((prev) => ({ ...prev, isLoading: false }))
    }
  }, [initialBranding])

  useEffect(() => {
    document.documentElement.style.setProperty("--brand-primary", branding.primaryColor)
    document.documentElement.style.setProperty("--brand-secondary", branding.secondaryColor)
  }, [branding.primaryColor, branding.secondaryColor])

  return <BrandingContext.Provider value={branding}>{children}</BrandingContext.Provider>
}
