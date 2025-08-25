"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useBranding } from "@/components/branding-provider"
import { MyDayLogsLogo } from "@/components/mydaylogs-logo"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { ChevronDownIcon, UserIcon, LogOutIcon, MenuIcon, Check, MessageSquare } from "lucide-react"
import { FeedbackModal } from "@/components/feedback-modal"

interface StaffNavigationProps {
  user: any
  onSignOut: () => void
  subscriptionStatus?: string | null
}

export function StaffNavigation({ user, onSignOut, subscriptionStatus }: StaffNavigationProps) {
  const { organizationName, logoUrl, primaryColor } = useBranding()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const hasPaidSubscription = subscriptionStatus === "active"

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/staff" className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {logoUrl ? (
                  <div className="w-10 h-10 rounded overflow-hidden bg-gray-100 flex items-center justify-center">
                    <img
                      src={logoUrl || "/placeholder.svg"}
                      alt={`${organizationName} logo`}
                      className="max-w-full max-h-full object-contain"
                      onError={(e) => {
                        // Fallback if logo fails to load
                        e.currentTarget.style.display = "none"
                        e.currentTarget.parentElement!.innerHTML = `
                          <div class="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
                            <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                          </div>
                        `
                      }}
                    />
                  </div>
                ) : organizationName === "MyDayLogs" ? (
                  <MyDayLogsLogo size="sm" showText={false} />
                ) : (
                  <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
                <span className="text-xl font-bold text-emerald-600">{organizationName}</span>
              </div>
            </Link>
            <div className="hidden md:ml-10 md:flex md:space-x-8">
              <Link
                href="/staff"
                className="text-foreground hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium"
                style={{ "--hover-color": primaryColor } as React.CSSProperties}
              >
                Staff Dashboard
              </Link>
              {hasPaidSubscription && (
                <Link
                  href="/staff/new"
                  className="text-muted-foreground hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium"
                  style={{ "--hover-color": primaryColor } as React.CSSProperties}
                >
                  New Report
                </Link>
              )}
              <Link
                href="/staff/team"
                className="text-muted-foreground hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium"
                style={{ "--hover-color": primaryColor } as React.CSSProperties}
              >
                Team
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="default" className="md:hidden min-w-12 min-h-12">
                  <MenuIcon className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <SheetHeader>
                  <SheetTitle className="text-left">Navigation</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col space-y-2 mt-6">
                  <Link
                    href="/staff"
                    className="text-foreground hover:text-indigo-600 px-4 py-4 rounded-md text-base font-medium border-b min-h-12 flex items-center"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Staff Dashboard
                  </Link>
                  {hasPaidSubscription && (
                    <Link
                      href="/staff/new"
                      className="text-muted-foreground hover:text-indigo-600 px-4 py-4 rounded-md text-base font-medium border-b min-h-12 flex items-center"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      New Report
                    </Link>
                  )}
                  <Link
                    href="/staff/team"
                    className="text-muted-foreground hover:text-indigo-600 px-4 py-4 rounded-md text-base font-medium border-b min-h-12 flex items-center"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Team
                  </Link>
                </div>
              </SheetContent>
            </Sheet>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 min-h-12 py-3 px-3 sm:px-4">
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                    {user?.avatar_url ? (
                      <img
                        src={user.avatar_url || "/placeholder.svg"}
                        alt="Profile"
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <UserIcon className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <span className="text-sm font-medium text-foreground hidden sm:inline">
                    {user?.first_name || user?.full_name?.split(" ")[0] || "User"}
                  </span>
                  <ChevronDownIcon className="w-4 h-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal py-3">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user?.full_name || "User"}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="py-3">
                  <Link href="/staff/profile" className="flex items-center">
                    <UserIcon className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <FeedbackModal
                  trigger={
                    <DropdownMenuItem
                      onSelect={(e) => e.preventDefault()}
                      className="!bg-orange-500 hover:!bg-orange-600 !text-white focus:!bg-orange-600 focus:!text-white py-3"
                    >
                      <MessageSquare className="mr-2 h-4 w-4" />
                      <span>Give Feedback</span>
                    </DropdownMenuItem>
                  }
                />
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600 focus:text-red-600 py-3" onClick={onSignOut}>
                  <LogOutIcon className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  )
}
