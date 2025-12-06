"use client"

import { useState, useEffect } from "react"
import { MessageSquare } from "lucide-react"
import { FeedbackModal } from "@/components/feedback-modal"
import { createBrowserClient } from "@supabase/ssr"

export function FeedbackBanner() {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  const [bannerData, setBannerData] = useState<{
    campaign: any
    bannerType: "classic" | "auto-promo" | "custom"
  } | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

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
  }, [])

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
    ctaText = "Give Feedback"
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
    <>
      <div className="bg-emerald-600 text-white py-2 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm flex-1">
            <MessageSquare className="w-4 h-4 flex-shrink-0" />
            <span>{displayMessage}</span>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-2"
          >
            <MessageSquare className="w-4 h-4" />
            {ctaText}
          </button>
        </div>
      </div>
      <FeedbackModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  )
}
