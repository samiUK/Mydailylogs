import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { createStripeCoupon, deactivateStripePromotionCode } from "@/lib/stripe-coupons"
import { generateUniqueCodes } from "@/lib/unique-code-generator"

// GET - List all promo campaigns
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: campaigns, error } = await supabase
      .from("promo_campaigns")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) throw error

    return NextResponse.json({ campaigns })
  } catch (error: any) {
    console.error("[v0] Error fetching promo campaigns:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Create new promo campaign
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const {
      name,
      description,
      discount_type,
      discount_value,
      max_redemptions,
      requirement_type,
      requirement_details,
      promo_code_template,
    } = body

    // Validate required fields
    if (!name || !discount_type || !discount_value || !max_redemptions || !requirement_type || !promo_code_template) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (!/^[A-Z0-9]+$/.test(promo_code_template)) {
      return NextResponse.json({ error: "Promo code must be uppercase alphanumeric (e.g., SOCIAL20)" }, { status: 400 })
    }

    console.log("[v0] Creating promo campaign with Stripe integration:", {
      promo_code_template,
      discount_type,
      discount_value,
      max_redemptions,
    })

    const stripeCoupon = await createStripeCoupon(promo_code_template, discount_type, discount_value, max_redemptions)

    const { data: campaign, error } = await supabase
      .from("promo_campaigns")
      .insert({
        name,
        description,
        discount_type,
        discount_value,
        max_redemptions,
        requirement_type,
        requirement_details,
        promo_code_template,
        stripe_coupon_id: stripeCoupon.id,
        is_active: true,
      })
      .select()
      .single()

    if (error) throw error

    const codeGenResult = await generateUniqueCodes(campaign.id, promo_code_template, max_redemptions)

    if (!codeGenResult.success) {
      await supabase.from("promo_campaigns").delete().eq("id", campaign.id)
      throw new Error(`Failed to generate unique codes: ${codeGenResult.error}`)
    }

    console.log("[v0] Promo campaign created successfully with unique codes:", {
      campaign_id: campaign.id,
      stripe_coupon_id: stripeCoupon.id,
      unique_codes_generated: codeGenResult.generated,
    })

    return NextResponse.json({
      campaign,
      stripeIntegration: {
        couponId: stripeCoupon.id,
      },
      uniqueCodes: {
        generated: codeGenResult.generated,
        total: max_redemptions,
      },
      message: `Promo campaign created successfully! ${codeGenResult.generated} unique codes generated and ready to be issued.`,
    })
  } catch (error: any) {
    console.error("[v0] Error creating promo campaign:", error)

    if (error.message?.includes("already exists")) {
      return NextResponse.json(
        { error: "A Stripe coupon with this code already exists. Please use a different promo code." },
        { status: 409 },
      )
    }

    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH - Update promo campaign (activate/deactivate)
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { campaign_id, is_active } = body

    if (!campaign_id || is_active === undefined) {
      return NextResponse.json({ error: "Missing campaign_id or is_active" }, { status: 400 })
    }

    const { data: existingCampaign, error: fetchError } = await supabase
      .from("promo_campaigns")
      .select("stripe_promo_code_id")
      .eq("campaign_id", campaign_id)
      .single()

    if (fetchError) throw fetchError

    if (!is_active && existingCampaign?.stripe_promo_code_id) {
      try {
        await deactivateStripePromotionCode(existingCampaign.stripe_promo_code_id)
        console.log("[v0] Deactivated Stripe promotion code for campaign:", campaign_id)
      } catch (stripeError: any) {
        console.error("[v0] Error deactivating Stripe promotion code:", stripeError)
      }
    }

    const { data: campaign, error } = await supabase
      .from("promo_campaigns")
      .update({ is_active })
      .eq("campaign_id", campaign_id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      campaign,
      message: `Campaign ${is_active ? "activated" : "deactivated"} successfully${!is_active ? ". Stripe promotion code has been deactivated." : "."}`,
    })
  } catch (error: any) {
    console.error("[v0] Error updating promo campaign:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE - Delete promo campaign
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const campaign_id = searchParams.get("campaign_id")

    if (!campaign_id) {
      return NextResponse.json({ error: "Missing campaign_id" }, { status: 400 })
    }

    const { data: campaign, error: fetchError } = await supabase
      .from("promo_campaigns")
      .select("name")
      .eq("id", campaign_id)
      .single()

    if (fetchError) throw fetchError

    const { error: deleteError } = await supabase.from("promo_campaigns").delete().eq("id", campaign_id)

    if (deleteError) throw deleteError

    console.log("[v0] Promo campaign and all unique codes deleted successfully:", {
      campaign_id,
      name: campaign.name,
    })

    return NextResponse.json({
      message: "Campaign and all associated unique promo codes deleted successfully.",
    })
  } catch (error: any) {
    console.error("[v0] Error deleting promo campaign:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
