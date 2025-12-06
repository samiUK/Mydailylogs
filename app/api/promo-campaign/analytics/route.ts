import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    // Verify master admin access
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: superuser } = await supabase
      .from("superusers")
      .select("*")
      .eq("email", user.email)
      .eq("is_active", true)
      .single()

    if (!superuser) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Get campaign ID from query params
    const { searchParams } = new URL(request.url)
    const campaignId = searchParams.get("campaignId")

    if (!campaignId) {
      return NextResponse.json({ error: "Campaign ID required" }, { status: 400 })
    }

    // Get campaign details
    const { data: campaign } = await supabase.from("promotional_campaigns").select("*").eq("id", campaignId).single()

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
    }

    // Count feedback submissions (from feedback table)
    const { count: feedbackCount } = await supabase
      .from("feedback")
      .select("*", { count: "exact", head: true })
      .gte("created_at", campaign.created_at)

    // Count social shares (from social_shares table)
    const { data: socialShares, count: shareCount } = await supabase
      .from("social_shares")
      .select("share_platform", { count: "exact" })
      .eq("promo_code", campaign.promo_code)

    // Count shares by platform
    const sharesByPlatform =
      socialShares?.reduce((acc: any, share: any) => {
        acc[share.share_platform] = (acc[share.share_platform] || 0) + 1
        return acc
      }, {}) || {}

    // Count promo code redemptions (from promo_code_redemptions table)
    const { count: redemptionCount } = await supabase
      .from("promo_code_redemptions")
      .select("*", { count: "exact", head: true })
      .eq("promo_code", campaign.promo_code)

    // Calculate conversion rates
    const feedbackToShareRate = feedbackCount ? ((shareCount || 0) / feedbackCount) * 100 : 0
    const shareToRedemptionRate = shareCount ? ((redemptionCount || 0) / shareCount) * 100 : 0
    const overallConversionRate = feedbackCount ? ((redemptionCount || 0) / feedbackCount) * 100 : 0

    return NextResponse.json({
      campaign: {
        id: campaign.id,
        name: campaign.name,
        promo_code: campaign.promo_code,
        discount_value: campaign.discount_value,
        discount_type: campaign.discount_type,
        max_redemptions: campaign.max_redemptions,
        is_active: campaign.is_active,
        created_at: campaign.created_at,
      },
      metrics: {
        totalFeedback: feedbackCount || 0,
        totalShares: shareCount || 0,
        totalRedemptions: redemptionCount || 0,
        sharesByPlatform,
      },
      conversionRates: {
        feedbackToShare: Math.round(feedbackToShareRate * 10) / 10,
        shareToRedemption: Math.round(shareToRedemptionRate * 10) / 10,
        overallConversion: Math.round(overallConversionRate * 10) / 10,
      },
      funnel: [
        { stage: "Feedback Submitted", count: feedbackCount || 0, percentage: 100 },
        {
          stage: "Social Share Clicked",
          count: shareCount || 0,
          percentage: Math.round(feedbackToShareRate * 10) / 10,
        },
        {
          stage: "Promo Code Redeemed",
          count: redemptionCount || 0,
          percentage: Math.round(overallConversionRate * 10) / 10,
        },
      ],
    })
  } catch (error) {
    console.error("[v0] Error fetching campaign analytics:", error)
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 })
  }
}
