"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { MessageSquare, X } from "lucide-react"
import { FeedbackModal } from "@/components/feedback-modal"
import { createBrowserClient } from "@supabase/ssr"

export function FeedbackBanner() {
  const [isVisible, setIsVisible] = useState(true)
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  const [bannerData, setBannerData] = useState<{
    campaign: any
    bannerType: "classic" | "auto-promo" | "custom"
  } | null>(null)

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        )

        const {
          data: { user },
          error,
        } = await supabase.auth.getUser()
        if (error) {
          console.log("[v0] Auth error in feedback banner (non-critical):", error.message)
          return
        }
        setUser(user)
      } catch (error) {
        console.log("[v0] Failed to initialize auth in feedback banner (non-critical):", error)
      }
    }

    initializeAuth()

    const fetchBannerData = async () => {
      try {
        const response = await fetch("/api/promo-campaign/banner")
        const data = await response.json()
        setBannerData(data)
      } catch (error) {
        console.log("[v0] Failed to fetch banner data:", error)
      }
    }

    fetchBannerData()

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

  let displayMessage = ""
  let ctaText = "Give Feedback"

  if (!bannerData || bannerData.bannerType === "classic") {
    // Type 1: Classic default - no campaign
    displayMessage = "We've just launched and you might find system bugs. Share them via feedback to help us improve!"
    ctaText = "Give Feedback"
  } else if (bannerData.bannerType === "auto-promo") {
    // Type 2: Auto promo - campaign active, toggle OFF
    const discountDisplay =
      bannerData.campaign.discount_type === "percentage"
        ? `${bannerData.campaign.discount_value}%`
        : `$${bannerData.campaign.discount_value}`
    displayMessage = `We've just launched and you might find system bugs. Share them via feedback and tell others about us to get a ${discountDisplay} discount code!`
    ctaText = `Get ${discountDisplay} Off`
  } else if (bannerData.bannerType === "custom") {
    // Type 3: Custom dynamic - campaign active, toggle ON
    const discountDisplay =
      bannerData.campaign.discount_type === "percentage"
        ? `${bannerData.campaign.discount_value}%`
        : `$${bannerData.campaign.discount_value}`
    displayMessage = bannerData.campaign.banner_message.replace(/{discount}/g, discountDisplay)
    ctaText = bannerData.campaign.banner_cta_text || "Give Feedback"
  }

  return (
    <div className="bg-accent text-accent-foreground py-2 px-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <span>{displayMessage}</span>
        </div>
        <div className="flex items-center gap-2">
          <FeedbackModal
            trigger={
              <Button
                size="sm"
                className="!text-white !bg-orange-500 hover:!bg-orange-600 !border-orange-400 hover:!border-orange-300 h-8 px-4 text-sm font-medium transition-all duration-200 hover:scale-105 hover:shadow-lg"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                {ctaText}
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
