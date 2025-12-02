"use client"

import { Button } from "@/components/ui/button"
import { AlertTriangle, LogOut } from "lucide-react"
import { useRouter } from "next/navigation"

interface ImpersonationBannerProps {
  userEmail: string
  userRole: string
}

export function ImpersonationBanner({ userEmail, userRole }: ImpersonationBannerProps) {
  const router = useRouter()

  const handleExit = async () => {
    // Clear impersonation cookies
    document.cookie = "impersonation-active=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
    document.cookie = "impersonation-data=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"

    // Sign out from Supabase
    const { createClient } = await import("@/lib/supabase/client")
    const supabase = createClient()
    await supabase.auth.signOut()

    // Redirect to masterdashboard
    window.location.href = "/masterdashboard"
  }

  return (
    <div className="bg-orange-600 text-white px-4 py-3 shadow-lg border-b-4 border-orange-700">
      <div className="container mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
            <span className="font-semibold">SUPPORT MODE:</span>
            <span className="text-sm">
              Viewing as <strong>{userEmail}</strong> ({userRole})
            </span>
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={handleExit} className="flex-shrink-0">
          <LogOut className="h-4 w-4 mr-2" />
          Exit
        </Button>
      </div>
    </div>
  )
}
