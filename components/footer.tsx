"use client"
import { MyDayLogsLogo } from "@/components/mydaylogs-logo"
import Link from "next/link"

export function Footer() {
  return (
    <footer className="bg-sidebar border-t border-sidebar-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <MyDayLogsLogo size="md" />
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

        <div className="border-t border-sidebar-border mt-8 pt-6">
          <div className="flex justify-center items-center">
            <p className="text-sidebar-foreground/70 text-sm">
              &copy; 2025{" "}
              <Link href="/masterlogin" className="hover:text-sidebar-foreground transition-colors">
                MyDayLogs
              </Link>
              . All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
