import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"
import { createStripeCoupon, deactivateStripePromotionCode, deleteStripeCoupon } from "@/lib/stripe-coupons"
import { generateUniqueCodes } from "@/lib/unique-code-generator"

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

      let codeGenResult = { success: true, generated: 0, error: null }

      if (generate_unique_codes) {
        codeGenResult = await generateUniqueCodes(
          campaign.id,
          promo_code_template,
          max_redemptions,
          stripeCoupon.id, // Pass coupon ID for Stripe promotion code creation
        )

        if (!codeGenResult.success) {
          console.error("[v0] Failed to generate codes, rolling back campaign:", codeGenResult.error)
          await adminClient.from("promotional_campaigns").delete().eq("id", campaign.id)
          throw new Error(`Failed to generate unique codes: ${codeGenResult.error}`)
        }

        console.log("[v0] Generated unique tracking codes with Stripe promotion codes:", codeGenResult.generated)
      } else {
        console.log("[v0] Generic code mode - skipping unique code generation")
      }

      console.log("[v0] Promo campaign created successfully:", {
        campaign_id: campaign.id,
        stripe_coupon_id: stripeCoupon.id,
        unique_codes_generated: codeGenResult.generated,
        show_on_banner,
        generate_unique_codes,
      })

      const responseMessage = generate_unique_codes
        ? `Promo campaign created successfully! ${codeGenResult.generated} unique Stripe promotion codes generated. Each code can only be used once and validates the full code including suffix.${show_on_banner ? " Campaign is now showing on the homepage banner." : ""}`
        : `Generic promo campaign created successfully! Universal code ${promo_code_template} is ready to use.${show_on_banner ? " Campaign is now showing on the homepage banner." : ""}`

      return NextResponse.json({
        campaign,
        stripeIntegration: generate_unique_codes
          ? {
              couponId: stripeCoupon.id,
              promotionCodesCreated: codeGenResult.generated,
              note: `${codeGenResult.generated} individual Stripe promotion codes created (e.g., ${promo_code_template}-ABC123). Users must enter the FULL code at checkout.`,
            }
          : {
              couponId: stripeCoupon.id,
              note: `ONE universal Stripe promo code created: ${promo_code_template}`,
            },
        uniqueCodes: generate_unique_codes
          ? {
              generated: codeGenResult.generated,
              total: max_redemptions,
              note: "Each code is a valid Stripe promotion code. Users must use the full code including suffix.",
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
