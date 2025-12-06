import { createServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const campaignId = searchParams.get("campaignId")

    if (!campaignId) {
      return NextResponse.json({ error: "Campaign ID is required" }, { status: 400 })
    }

    const supabase = await createServerClient()

    // Fetch all redemptions for this campaign with organization details
    const { data: redemptions, error } = await supabase
      .from("promo_code_redemptions")
      .select(
        `
        *,
        organizations!promo_code_redemptions_organization_id_fkey(
          organization_name,
          slug,
          created_at
        )
      `,
      )
      .eq("campaign_id", campaignId)
      .order("redeemed_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching campaign redemptions:", error)
      return NextResponse.json({ error: "Failed to fetch redemptions" }, { status: 500 })
    }

    // Format the response
    const formattedRedemptions = redemptions.map((redemption) => ({
      id: redemption.id,
      user_email: redemption.user_email,
      organization_name: redemption.organizations?.organization_name || "Unknown",
      organization_id: redemption.organization_id,
      promo_code: redemption.promo_code,
      plan_name: redemption.plan_name,
      discount_amount: redemption.discount_amount,
      redeemed_at: redemption.redeemed_at,
      stripe_customer_id: redemption.stripe_customer_id,
      ip_address: redemption.ip_address,
    }))

    return NextResponse.json({
      success: true,
      redemptions: formattedRedemptions,
      total: formattedRedemptions.length,
    })
  } catch (error) {
    console.error("[v0] Campaign redemptions API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
