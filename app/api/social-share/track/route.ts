import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Get user info
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const body = await request.json()
    const { platform, promoCode, campaignId, feedbackId } = body

    // Validate platform
    const validPlatforms = ["facebook", "twitter", "linkedin", "other"]
    if (!platform || !validPlatforms.includes(platform)) {
      return NextResponse.json({ error: "Invalid share platform" }, { status: 400 })
    }

    // Get user email and organization
    let userEmail = user?.email || "Anonymous"
    let organizationId = null

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id, email")
        .eq("id", user.id)
        .single()

      if (profile) {
        userEmail = profile.email || userEmail
        organizationId = profile.organization_id
      }
    }

    // Get IP and user agent for tracking
    const forwardedFor = request.headers.get("x-forwarded-for")
    const ipAddress = forwardedFor ? forwardedFor.split(",")[0] : null
    const userAgent = request.headers.get("user-agent")

    // Insert social share tracking
    const { error: insertError } = await supabase.from("social_shares").insert({
      user_id: user?.id || null,
      user_email: userEmail,
      organization_id: organizationId,
      feedback_id: feedbackId || null,
      share_platform: platform,
      promo_code: promoCode || null,
      campaign_id: campaignId || null,
      ip_address: ipAddress,
      user_agent: userAgent,
    })

    if (insertError) {
      console.error("[v0] Error tracking social share:", insertError)
      // Don't fail the request if tracking fails
    }

    return NextResponse.json({
      success: true,
      message: "Social share tracked successfully",
    })
  } catch (error) {
    console.error("[v0] Error in social share tracking:", error)
    return NextResponse.json({ error: "Failed to track social share" }, { status: 500 })
  }
}
