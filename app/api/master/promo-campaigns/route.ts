import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"
import { createStripeCoupon, deactivateStripePromotionCode, deleteStripeCoupon } from "@/lib/stripe-coupons"
import { generateUniqueCodes } from "@/lib/unique-code-generator"
import Stripe from "stripe" // Added Stripe import

// GET - List all promo campaigns
export async function GET(request: NextRequest) {
  try {
    const adminClient = createAdminClient()

    const { data: campaigns, error } = await adminClient
      .from("promotional_campaigns")
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
  let stripeCouponId: string | null = null

  try {
    const adminClient = createAdminClient()
    const body = await request.json()

    console.log("[v0] Campaign creation request received:", body)

    const {
      name,
      description,
      discount_type,
      discount_value,
      max_redemptions,
      requirement_type,
      promo_code_template,
      show_on_banner = false,
      banner_message = null,
      banner_cta_text = "Give Feedback",
      generate_unique_codes = true,
    } = body

    // Validate required fields
    if (!name || !discount_type || !discount_value || !max_redemptions || !requirement_type || !promo_code_template) {
      console.error("[v0] Missing required fields:", {
        name,
        discount_type,
        discount_value,
        max_redemptions,
        requirement_type,
        promo_code_template,
      })
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (!/^[A-Z0-9]+$/.test(promo_code_template)) {
      console.error("[v0] Invalid promo code format:", promo_code_template)
      return NextResponse.json({ error: "Promo code must be uppercase alphanumeric (e.g., SOCIAL20)" }, { status: 400 })
    }

    if (show_on_banner) {
      console.log("[v0] Disabling banner display on all other campaigns")
      await adminClient
        .from("promotional_campaigns")
        .update({ show_on_banner: false })
        .eq("is_active", true)
        .eq("show_on_banner", true)
    }

    console.log("[v0] Creating promo campaign with Stripe integration:", {
      promo_code_template,
      discount_type,
      discount_value,
      max_redemptions,
      generate_unique_codes,
    })

    const stripeCoupon = await createStripeCoupon(
      promo_code_template,
      discount_type,
      discount_value,
      generate_unique_codes ? undefined : max_redemptions, // Only set max for generic codes
    )
    stripeCouponId = stripeCoupon.id
    console.log("[v0] Stripe coupon created:", stripeCoupon.id)

    try {
      const { data: campaign, error } = await adminClient
        .from("promotional_campaigns")
        .insert({
          name,
          description,
          discount_type,
          discount_value,
          max_redemptions,
          requirement_type,
          promo_code_template,
          stripe_coupon_id: stripeCoupon.id,
          is_active: true,
          show_on_banner,
          banner_message,
          banner_cta_text,
          generate_unique_codes,
        })
        .select()
        .single()

      if (error) {
        console.error("[v0] Database error creating campaign:", error)
        throw error
      }

      console.log("[v0] Campaign created in database:", campaign)

      let generatedCodesCount = 0

      if (generate_unique_codes) {
        const stripeKey = process.env.STRIPE_SECRET_KEY
        if (!stripeKey) {
          throw new Error("Stripe API key not configured")
        }
        const stripe = new Stripe(stripeKey, { apiVersion: "2024-11-20.acacia" })

        const codesToGenerate = max_redemptions * 5 // 5x multiplier for new campaigns

        const generatedCodes = await generateUniqueCodes(
          promo_code_template,
          codesToGenerate,
          stripeCoupon.id,
          stripe,
          adminClient,
          campaign.id,
        )

        generatedCodesCount = generatedCodes.length

        if (generatedCodesCount === 0) {
          console.error("[v0] Failed to generate codes, rolling back campaign")
          await adminClient.from("promotional_campaigns").delete().eq("id", campaign.id)
          throw new Error("Failed to generate unique codes")
        }

        console.log("[v0] Generated unique tracking codes with Stripe promotion codes:", generatedCodesCount)
      } else {
        console.log("[v0] Generic code mode - skipping unique code generation")
      }

      console.log("[v0] Promo campaign created successfully:", {
        campaign_id: campaign.id,
        stripe_coupon_id: stripeCoupon.id,
        unique_codes_generated: generatedCodesCount,
        show_on_banner,
        generate_unique_codes,
      })

      const responseMessage = generate_unique_codes
        ? `Promo campaign created successfully! ${generatedCodesCount} unique Stripe promotion codes generated (5x your ${max_redemptions} max redemptions to ensure availability). Each code can only be used once.${show_on_banner ? " Campaign is now showing on the homepage banner." : ""}`
        : `Generic promo campaign created successfully! Universal code ${promo_code_template} is ready to use.${show_on_banner ? " Campaign is now showing on the homepage banner." : ""}`

      return NextResponse.json({
        campaign,
        stripeIntegration: generate_unique_codes
          ? {
              couponId: stripeCoupon.id,
              promotionCodesCreated: generatedCodesCount,
              note: `${generatedCodesCount} individual Stripe promotion codes created (5x multiplier). Users must enter the FULL code at checkout (e.g., ${promo_code_template}-ABC123).`,
            }
          : {
              couponId: stripeCoupon.id,
              note: `ONE universal Stripe promo code created: ${promo_code_template}`,
            },
        uniqueCodes: generate_unique_codes
          ? {
              generated: generatedCodesCount,
              maxRedemptions: max_redemptions,
              multiplier: 5,
              note: `Generated ${generatedCodesCount} codes for ${max_redemptions} max redemptions. Extra codes ensure you don't run out if some users don't redeem.`,
            }
          : {
              generated: 0,
              total: 0,
              note: "Generic code mode - no tracking codes generated. Anyone can use the universal code directly.",
            },
        message: responseMessage,
      })
    } catch (dbError: any) {
      console.error("[v0] Database operation failed, rolling back Stripe coupon:", stripeCouponId)
      if (stripeCouponId) {
        try {
          await deleteStripeCoupon(stripeCouponId)
          console.log("[v0] Successfully rolled back Stripe coupon:", stripeCouponId)
        } catch (rollbackError: any) {
          console.error("[v0] Failed to rollback Stripe coupon:", rollbackError)
        }
      }
      throw dbError
    }
  } catch (error: any) {
    console.error("[v0] Error creating promo campaign:", error)

    if (error.message?.includes("already exists")) {
      return NextResponse.json({ error: error.message }, { status: 409 })
    }

    return NextResponse.json({ error: error.message || "Failed to create campaign" }, { status: 500 })
  }
}

// PUT - Update promo campaign details
export async function PUT(request: NextRequest) {
  try {
    const adminClient = createAdminClient()
    const body = await request.json()

    const {
      campaign_id,
      name,
      description,
      discount_value,
      max_redemptions,
      requirement_type,
      show_on_banner,
      banner_message,
      banner_cta_text,
    } = body

    if (!campaign_id) {
      return NextResponse.json({ error: "Missing campaign_id" }, { status: 400 })
    }

    console.log("[v0] Updating campaign:", campaign_id)

    // If enabling banner on this campaign, disable it on others
    if (show_on_banner) {
      console.log("[v0] Disabling banner display on all other campaigns")
      await adminClient
        .from("promotional_campaigns")
        .update({ show_on_banner: false })
        .neq("id", campaign_id)
        .eq("show_on_banner", true)
    }

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (discount_value !== undefined) updateData.discount_value = discount_value
    if (max_redemptions !== undefined) updateData.max_redemptions = max_redemptions
    if (requirement_type !== undefined) updateData.requirement_type = requirement_type
    if (show_on_banner !== undefined) updateData.show_on_banner = show_on_banner
    if (banner_message !== undefined) updateData.banner_message = banner_message
    if (banner_cta_text !== undefined) updateData.banner_cta_text = banner_cta_text

    const { data: campaign, error } = await adminClient
      .from("promotional_campaigns")
      .update(updateData)
      .eq("id", campaign_id)
      .select()
      .single()

    if (error) throw error

    console.log("[v0] Campaign updated successfully:", campaign.name)

    return NextResponse.json({
      campaign,
      message: "Campaign updated successfully",
    })
  } catch (error: any) {
    console.error("[v0] Error updating promo campaign:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH - Update promo campaign (activate/deactivate)
export async function PATCH(request: NextRequest) {
  try {
    const adminClient = createAdminClient()
    const body = await request.json()

    const { campaign_id, is_active } = body

    if (!campaign_id || is_active === undefined) {
      return NextResponse.json({ error: "Missing campaign_id or is_active" }, { status: 400 })
    }

    const { data: existingCampaign, error: fetchError } = await adminClient
      .from("promotional_campaigns")
      .select("stripe_promotion_code_id")
      .eq("id", campaign_id)
      .single()

    if (fetchError) throw fetchError

    if (!is_active && existingCampaign?.stripe_promotion_code_id) {
      try {
        await deactivateStripePromotionCode(existingCampaign.stripe_promotion_code_id)
        console.log("[v0] Deactivated Stripe promotion code for campaign:", campaign_id)
      } catch (stripeError: any) {
        console.error("[v0] Error deactivating Stripe promotion code:", stripeError)
      }
    }

    const { data: campaign, error } = await adminClient
      .from("promotional_campaigns")
      .update({ is_active })
      .eq("id", campaign_id)
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
    const adminClient = createAdminClient()
    const { searchParams } = new URL(request.url)
    const campaign_id = searchParams.get("campaign_id")

    if (!campaign_id) {
      return NextResponse.json({ error: "Missing campaign_id" }, { status: 400 })
    }

    const { data: campaign, error: fetchError } = await adminClient
      .from("promotional_campaigns")
      .select("name")
      .eq("id", campaign_id)
      .single()

    if (fetchError) throw fetchError

    const { error: deleteError } = await adminClient.from("promotional_campaigns").delete().eq("id", campaign_id)

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
