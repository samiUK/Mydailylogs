"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { MessageSquare, X } from "lucide-react"
import { FeedbackModal } from "@/components/feedback-modal"
import { createBrowserClient } from "@supabase/ssr"

export function FeedbackBanner() {
  const [isVisible, setIsVisible] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    // Get current user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })

    // Check if banner was previously closed
    const bannerClosed = localStorage.getItem("feedback-banner-closed")
    if (bannerClosed === "true") {
      setIsVisible(false)
    }
  }, [])

  const deploymentDate = new Date("2024-12-24")
  const currentDate = new Date()
  const daysSinceDeployment = Math.floor((currentDate.getTime() - deploymentDate.getTime()) / (1000 * 60 * 60 * 24))
  const showBanner = daysSinceDeployment <= 90

  const handleClose = () => {
    setIsVisible(false)
    localStorage.setItem("feedback-banner-closed", "true")
  }

  if (!showBanner || !isVisible) return null

  return (
    <div className="bg-accent text-accent-foreground py-2 px-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <span>🚀 You're using the Beta version of MyDayLogs. Things may change, and we'd love your feedback!</span>
        </div>
        <div className="flex items-center gap-2">
          <FeedbackModal
            trigger={
              <Button
                size="sm"
                className="!text-white !bg-orange-500 hover:!bg-orange-600 !border-orange-400 hover:!border-orange-300 h-8 px-4 text-sm font-medium transition-all duration-200 hover:scale-105 hover:shadow-lg"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Give Feedback
              </Button>
            }
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="text-accent-foreground hover:bg-accent-foreground/20 h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
