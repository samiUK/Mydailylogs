import { type NextRequest, NextResponse } from "next/server"
import { submitCampaignFeedback, isCampaignActive } from "@/lib/promo-campaign"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userEmail, userName, organizationId, feedbackMessage, socialMediaPlatform, socialMediaProofUrl } = body

    // Validation
    if (!userEmail || !userName || !feedbackMessage || !socialMediaPlatform) {
      return NextResponse.json(
        { error: "Missing required fields: userEmail, userName, feedbackMessage, socialMediaPlatform" },
        { status: 400 },
      )
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(userEmail)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 })
    }

    // Validate social media platform
    const validPlatforms = ["twitter", "linkedin", "facebook", "instagram", "other"]
    if (!validPlatforms.includes(socialMediaPlatform.toLowerCase())) {
      return NextResponse.json({ error: "Invalid social media platform" }, { status: 400 })
    }

    // Check if campaign is still active
    const isActive = await isCampaignActive()
    if (!isActive) {
      return NextResponse.json(
        {
          error: "Campaign Ended",
          message: "All 100 promotional codes have been claimed. Thank you for your interest!",
        },
        { status: 410 },
      )
    }

    // Get IP address and user agent for fraud tracking
    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || undefined
    const userAgent = request.headers.get("user-agent") || undefined

    // Submit feedback and generate promo code
    const result = await submitCampaignFeedback({
      userEmail,
      userName,
      organizationId,
      feedbackMessage,
      socialMediaPlatform: socialMediaPlatform.toLowerCase(),
      socialMediaProofUrl,
      ipAddress,
      userAgent,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: "Thank you! Your promo code has been sent to your email.",
      data: result.data,
    })
  } catch (error) {
    console.error("[v0] Promo campaign submission error:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}

// Get campaign status
export async function GET() {
  try {
    const isActive = await isCampaignActive()

    return NextResponse.json({
      isActive,
      message: isActive
        ? "Campaign is active. Submit your feedback and social share to get 20% off!"
        : "Campaign has ended. All 100 codes have been claimed.",
    })
  } catch (error) {
    console.error("[v0] Promo campaign status error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
