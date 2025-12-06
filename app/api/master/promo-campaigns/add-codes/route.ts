import { NextResponse } from "next/server"
import { createAdminServerClient } from "@/lib/supabase-server"
import Stripe from "stripe"
import { generateUniqueCodes } from "@/lib/unique-code-generator"

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const campaignId = searchParams.get("campaign_id")
    const additionalCodes = Number.parseInt(searchParams.get("additional_codes") || "50")

    console.log("[v0] Add codes request:", { campaignId, additionalCodes })

    if (!campaignId) {
      return NextResponse.json({ error: "Campaign ID is required" }, { status: 400 })
    }

    const supabase = createAdminServerClient()

    // Fetch the campaign
    const { data: campaign, error: campaignError } = await supabase
      .from("promotional_campaigns")
      .select("*")
      .eq("id", campaignId)
      .single()

    console.log("[v0] Campaign lookup result:", { campaign, campaignError })

    if (campaignError || !campaign) {
      console.error("[v0] Campaign not found:", campaignError)
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
    }

    const shouldGenerateUniqueCodes = campaign.generate_unique_codes !== false

    if (!shouldGenerateUniqueCodes) {
      return NextResponse.json(
        { error: "This campaign uses generic codes, no additional codes needed" },
        { status: 400 },
      )
    }

    // Initialize Stripe inside the handler
    const stripeKey = process.env.STRIPE_SECRET_KEY
    if (!stripeKey) {
      return NextResponse.json({ error: "Stripe API key not configured" }, { status: 500 })
    }
    const stripe = new Stripe(stripeKey, { apiVersion: "2024-11-20.acacia" })

    console.log("[v0] Generating", additionalCodes, "codes for campaign", campaign.name)

    // Generate additional unique codes
    const newCodes = await generateUniqueCodes(
      campaign.promo_code_template,
      additionalCodes,
      campaign.stripe_coupon_id,
      stripe,
      supabase,
      campaignId,
    )

    console.log("[v0] Successfully generated", newCodes.length, "codes")

    return NextResponse.json({
      message: `Successfully generated ${newCodes.length} additional codes for campaign "${campaign.name}"`,
      codes_generated: newCodes.length,
    })
  } catch (error) {
    console.error("[v0] Error generating additional codes:", error)
    return NextResponse.json({ error: "Failed to generate additional codes" }, { status: 500 })
  }
}
