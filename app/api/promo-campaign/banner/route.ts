import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// GET - Fetch campaign to display on banner
export async function GET() {
  try {
    const supabase = await createClient()

    const { data: campaign, error } = await supabase
      .from("promotional_campaigns")
      .select("*")
      .eq("is_active", true)
      .eq("show_on_banner", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (error || !campaign) {
      return NextResponse.json({ campaign: null })
    }

    // Count current redemptions
    const { count: redemptionCount, error: countError } = await supabase
      .from("promo_code_redemptions")
      .select("*", { count: "exact", head: true })
      .eq("promo_code", campaign.promo_code_template)

    if (countError) {
      console.error("[v0] Error counting redemptions:", countError)
    }

    const currentRedemptions = redemptionCount || 0
    const isAvailable = currentRedemptions < campaign.max_redemptions

    // Return null if redemptions are maxed out
    if (!isAvailable) {
      console.log("[v0] Campaign maxed out, hiding from banner:", {
        code: campaign.promo_code_template,
        current: currentRedemptions,
        max: campaign.max_redemptions,
      })
      return NextResponse.json({ campaign: null })
    }

    return NextResponse.json({
      campaign: {
        id: campaign.id,
        name: campaign.name,
        banner_message: campaign.banner_message,
        banner_cta_text: campaign.banner_cta_text || "Give Feedback",
        discount_value: campaign.discount_value,
        discount_type: campaign.discount_type,
        max_redemptions: campaign.max_redemptions,
        current_redemptions: currentRedemptions,
        remaining_redemptions: campaign.max_redemptions - currentRedemptions,
      },
    })
  } catch (error: any) {
    console.error("[v0] Error fetching banner campaign:", error)
    return NextResponse.json({ campaign: null })
  }
}
