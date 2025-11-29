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

  const currentYear = new Date().getFullYear()

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
              <h3 className="font-semibold text-sidebar-foreground mb-4">Company</h3>
              <ul className="space-y-2 text-sidebar-foreground/70">
                <li>
                  <Link href="/about" className="hover:text-sidebar-foreground">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-sidebar-foreground">
                    Contact
                  </Link>
                </li>
                <li>
                  <Link href="/support" className="hover:text-sidebar-foreground">
                    Support
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-sidebar-foreground mb-4">Resources</h3>
              <ul className="space-y-2 text-sidebar-foreground/70">
                <li>
                  <Link href="/use-cases" className="hover:text-sidebar-foreground">
                    Use Cases
                  </Link>
                </li>
                <li>
                  <a href="/#pricing" className="hover:text-sidebar-foreground">
                    Pricing
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-sidebar-foreground mb-4">Legal</h3>
              <ul className="space-y-2 text-sidebar-foreground/70">
                <li>
                  <Link href="/privacy" className="hover:text-sidebar-foreground">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-sidebar-foreground">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="/gdpr" className="hover:text-sidebar-foreground">
                    GDPR
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="border-t border-sidebar-border py-4">
        <div className="flex justify-center items-center">
          <p className="text-sidebar-foreground/70 text-sm">
            &copy; {currentYear}{" "}
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
