"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

interface BrandingContextType {
  organizationName: string
  logoUrl: string | null
  primaryColor: string
  secondaryColor: string
  isLoading: boolean
}

const BrandingContext = createContext<BrandingContextType>({
  organizationName: "Mydailylogs",
  logoUrl: null,
  primaryColor: "#059669",
  secondaryColor: "#6B7280",
  isLoading: true,
})

export const useBranding = () => useContext(BrandingContext)

interface BrandingProviderProps {
  children: React.ReactNode
  initialBranding?: Partial<BrandingContextType>
}

export function BrandingProvider({ children, initialBranding }: BrandingProviderProps) {
  const [branding, setBranding] = useState<BrandingContextType>({
    organizationName: initialBranding?.organizationName || "Mydailylogs",
    logoUrl: initialBranding?.logoUrl || null,
    primaryColor: initialBranding?.primaryColor || "#059669",
    secondaryColor: initialBranding?.secondaryColor || "#6B7280",
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

      // Get organization branding data
      const { data: organization } = await supabase
        .from("organizations")
        .select("name, logo_url, primary_color, secondary_color")
        .eq("id", profile.organization_id)
        .single()

      if (organization) {
        setBranding({
          organizationName: organization.name || "Mydailylogs",
          logoUrl: organization.logo_url || null,
          primaryColor: organization.primary_color || "#059669",
          secondaryColor: organization.secondary_color || "#6B7280",
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
