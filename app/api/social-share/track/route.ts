import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const adminSupabase = createAdminClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const body = await request.json()
    const { platform, promoCode, campaignId, feedbackId } = body

    console.log("[v0] Social share tracking request:", { platform, promoCode, campaignId, feedbackId })

    const validPlatforms = ["facebook", "twitter", "linkedin", "other"]
    if (!platform || !validPlatforms.includes(platform)) {
      return NextResponse.json({ error: "Invalid share platform" }, { status: 400 })
    }

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

    const forwardedFor = request.headers.get("x-forwarded-for")
    const ipAddress = forwardedFor ? forwardedFor.split(",")[0] : null
    const userAgent = request.headers.get("user-agent")

    const { error: insertError, data: insertedData } = await adminSupabase
      .from("social_shares")
      .insert({
        user_id: user?.id || null,
        user_email: userEmail,
        organization_id: organizationId,
        feedback_id: feedbackId || null,
        share_platform: platform,
        promo_code: promoCode || null,
        campaign_id: campaignId || null,
        ip_address: ipAddress,
        user_agent: userAgent,
        shared_at: new Date().toISOString(),
      })
      .select()

    console.log("[v0] Social share insert result:", { error: insertError, data: insertedData })

    if (insertError) {
      console.error("[v0] Error tracking social share:", insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
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
