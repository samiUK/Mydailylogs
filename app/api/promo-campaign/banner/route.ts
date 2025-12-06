import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// GET - Fetch campaign to display on banner (3-tier system)
export async function GET() {
  try {
    const supabase = await createClient()

    const { data: activeCampaign, error: activeError } = await supabase
      .from("promotional_campaigns")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    // Type 1: No active campaign - return null for classic default
    if (activeError || !activeCampaign) {
      return NextResponse.json({ campaign: null, bannerType: "classic" })
    }

    // Count current redemptions
    const { count: redemptionCount, error: countError } = await supabase
      .from("promo_code_redemptions")
      .select("*", { count: "exact", head: true })
      .eq("promo_code", activeCampaign.promo_code_template)

    if (countError) {
      console.error("[v0] Error counting redemptions:", countError)
    }

    const currentRedemptions = redemptionCount || 0
    const isAvailable = currentRedemptions < activeCampaign.max_redemptions

    // Return classic if redemptions are maxed out
    if (!isAvailable) {
      console.log("[v0] Campaign maxed out, reverting to classic banner")
      return NextResponse.json({ campaign: null, bannerType: "classic" })
    }

    // Type 3: Custom dynamic banner (show_on_banner enabled)
    if (activeCampaign.show_on_banner) {
      return NextResponse.json({
        campaign: {
          id: activeCampaign.id,
          name: activeCampaign.name,
          banner_message: activeCampaign.banner_message,
          banner_cta_text: activeCampaign.banner_cta_text || "Give Feedback",
          discount_value: activeCampaign.discount_value,
          discount_type: activeCampaign.discount_type,
          max_redemptions: activeCampaign.max_redemptions,
          current_redemptions: currentRedemptions,
          remaining_redemptions: activeCampaign.max_redemptions - currentRedemptions,
        },
        bannerType: "custom",
      })
    }

    // Type 2: Auto promo banner (campaign active but show_on_banner disabled)
    return NextResponse.json({
      campaign: {
        id: activeCampaign.id,
        discount_value: activeCampaign.discount_value,
        discount_type: activeCampaign.discount_type,
        max_redemptions: activeCampaign.max_redemptions,
        current_redemptions: currentRedemptions,
        remaining_redemptions: activeCampaign.max_redemptions - currentRedemptions,
      },
      bannerType: "auto-promo",
    })
  } catch (error: any) {
    console.error("[v0] Error fetching banner campaign:", error)
    return NextResponse.json({ campaign: null, bannerType: "classic" })
  }
}
