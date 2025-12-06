import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// GET - Fetch campaign to display on banner (3-tier system)
export async function GET() {
  try {
    const supabase = await createClient()

    console.log("[v0] Fetching active campaigns for banner...")

    const { data: activeCampaign, error: activeError } = await supabase
      .from("promotional_campaigns")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    console.log("[v0] Active campaign query result:", { activeCampaign, activeError })

    // Type 1: No active campaign - return null for classic default
    if (activeError || !activeCampaign) {
      console.log("[v0] No active campaign found, returning classic banner")
      return NextResponse.json({ campaign: null, bannerType: "classic" })
    }

    console.log("[v0] Active campaign found:", activeCampaign.name)

    const { count: redemptionCount, error: countError } = await supabase
      .from("unique_promo_codes")
      .select("*", { count: "exact", head: true })
      .eq("campaign_id", activeCampaign.id)
      .eq("is_used", true)

    if (countError) {
      console.error("[v0] Error counting redemptions:", countError)
    }

    const currentRedemptions = redemptionCount || 0
    const isAvailable = currentRedemptions < activeCampaign.max_redemptions

    if (!isAvailable) {
      console.log("[v0] Campaign maxed out, auto-disabling and reverting to classic banner")
      await supabase.from("promotional_campaigns").update({ is_active: false }).eq("id", activeCampaign.id)
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
