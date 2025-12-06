import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia",
})

// POST - Sync campaign with Stripe to verify coupon status
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const campaign_id = searchParams.get("campaign_id")
    const stripe_coupon_id = searchParams.get("stripe_coupon_id")

    if (!campaign_id || !stripe_coupon_id) {
      return NextResponse.json({ error: "Missing campaign_id or stripe_coupon_id" }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Fetch current database status
    const { data: campaign, error: fetchError } = await adminClient
      .from("promotional_campaigns")
      .select("*")
      .eq("id", campaign_id)
      .single()

    if (fetchError) {
      return NextResponse.json({ error: "Campaign not found in database" }, { status: 404 })
    }

    // Check Stripe coupon status
    let stripeCoupon
    let stripeExists = true
    let stripeMessage = ""

    try {
      stripeCoupon = await stripe.coupons.retrieve(stripe_coupon_id)
      stripeMessage = stripeCoupon.valid
        ? "Coupon exists and is valid in Stripe"
        : "Coupon exists but is invalid in Stripe"
    } catch (stripeError: any) {
      stripeExists = false
      if (stripeError.code === "resource_missing") {
        stripeMessage = "Coupon has been deleted from Stripe"
      } else {
        stripeMessage = `Stripe error: ${stripeError.message}`
      }
    }

    // If Stripe coupon is deleted but DB shows active, auto-deactivate
    if (!stripeExists && campaign.is_active) {
      console.log("[v0] Stripe coupon deleted, auto-deactivating campaign:", campaign_id)

      await adminClient.from("promotional_campaigns").update({ is_active: false }).eq("id", campaign_id)

      return NextResponse.json({
        synced: true,
        stripe_status: "Deleted",
        db_status: "Auto-deactivated",
        message: `Stripe coupon has been deleted. Campaign has been automatically deactivated in the database. ${stripeMessage}`,
      })
    }

    // Return sync status
    return NextResponse.json({
      synced: true,
      stripe_status: stripeExists ? (stripeCoupon?.valid ? "Active" : "Invalid") : "Deleted",
      db_status: campaign.is_active ? "Active" : "Inactive",
      message: `${stripeMessage}. Database status: ${campaign.is_active ? "Active" : "Inactive"}.`,
      details: stripeExists
        ? {
            coupon_id: stripeCoupon?.id,
            discount_type: stripeCoupon?.percent_off ? "percentage" : "amount_off",
            discount_value: stripeCoupon?.percent_off || stripeCoupon?.amount_off,
            valid: stripeCoupon?.valid,
          }
        : null,
    })
  } catch (error: any) {
    console.error("[v0] Error syncing with Stripe:", error)
    return NextResponse.json({ error: error.message || "Failed to sync with Stripe" }, { status: 500 })
  }
}
