"use client"
import { MyDayLogsLogo } from "@/components/mydaylogs-logo"
import { useBranding } from "@/components/branding-provider"
import Link from "next/link"
import { createBrowserClient } from "@supabase/ssr"
import { useEffect, useState } from "react"
import { Check } from "lucide-react"

export function Footer() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const { organizationName, logoUrl, hasCustomBranding } = useBranding()

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setIsLoggedIn(!!user)
    }

    checkAuth()
  }, [])

  const renderLogo = () => {
    if (!isLoggedIn) {
      return <MyDayLogsLogo size="md" />
    }

    // Show organization-specific branding for logged-in users
    return (
      <div className="flex items-center gap-2">
        {logoUrl ? (
          <div className="w-10 h-10 rounded overflow-hidden bg-white flex items-center justify-center shadow-sm">
            <img
              src={logoUrl || "/placeholder.svg"}
              alt={organizationName}
              className="max-w-full max-h-full object-contain"
            />
          </div>
        ) : organizationName === "MyDayLogs" ? (
          <MyDayLogsLogo size="md" showText={false} />
        ) : (
          <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center shadow-sm">
            <Check className="w-6 h-6 text-white" />
          </div>
        )}
        <span className="text-xl font-bold text-emerald-600">{organizationName}</span>
      </div>
    )
  }

  return (
    <footer className="bg-sidebar border-t border-sidebar-border">
      {!isLoggedIn && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              {renderLogo()}
              <p className="text-sidebar-foreground/70 mt-4">
                Professional task management and compliance platform for multi-industry enterprises.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-sidebar-foreground mb-4">Product</h3>
              <ul className="space-y-2 text-sidebar-foreground/70">
                <li>
                  <a href="#features" className="hover:text-sidebar-foreground">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="hover:text-sidebar-foreground">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-sidebar-foreground">
                    API
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-sidebar-foreground mb-4">Company</h3>
              <ul className="space-y-2 text-sidebar-foreground/70">
                <li>
                  <a href="#" className="hover:text-sidebar-foreground">
                    About
                  </a>
                </li>
                <li>
                  <a href="mailto:info@mydaylogs.co.uk" className="hover:text-sidebar-foreground">
                    Contact
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-sidebar-foreground">
                    Support
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-sidebar-foreground mb-4">Legal</h3>
              <ul className="space-y-2 text-sidebar-foreground/70">
                <li>
                  <a href="#" className="hover:text-sidebar-foreground">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-sidebar-foreground">
                    Terms of Service
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-sidebar-foreground">
                    GDPR
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="border-t border-sidebar-border py-4">
        <div className="flex justify-center items-center">
          <p className="text-sidebar-foreground/70 text-sm">
            &copy; 2025{" "}
            {isLoggedIn ? (
              <span className="text-sidebar-foreground/70">{organizationName}</span>
            ) : (
              <Link href="/masterlogin" className="text-sidebar-foreground/70">
                MyDayLogs
              </Link>
            )}
            . All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
