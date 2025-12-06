import "server-only"
import { stripe } from "./stripe"

export async function deleteStripeCoupon(couponId: string) {
  try {
    const coupon = await stripe.coupons.del(couponId)
    console.log("[v0] Deleted Stripe coupon:", couponId)
    return coupon
  } catch (error: any) {
    console.error("[v0] Error deleting Stripe coupon:", error)
    throw new Error(`Failed to delete Stripe coupon: ${error.message}`)
  }
}

export async function stripeCouponExists(couponId: string): Promise<boolean> {
  try {
    await stripe.coupons.retrieve(couponId)
    return true
  } catch (error: any) {
    if (error.code === "resource_missing") {
      return false
    }
    throw error
  }
}

export async function createStripeCoupon(
  couponCode: string,
  discountType: "percentage" | "fixed_amount",
  discountValue: number,
  maxRedemptions?: number,
) {
  const exists = await stripeCouponExists(couponCode)
  if (exists) {
    throw new Error(
      `A Stripe coupon with code "${couponCode}" already exists. Please use a different promo code or delete the existing one from Stripe Dashboard.`,
    )
  }

  const couponData: any = {
    id: couponCode,
    duration: "once", // Always apply to first billing period only
    metadata: {
      campaign_type: "promotional",
      created_at: new Date().toISOString(),
    },
  }

  if (discountType === "percentage") {
    couponData.percent_off = discountValue
  } else {
    couponData.amount_off = Math.round(discountValue * 100) // Convert to cents
    couponData.currency = "usd"
  }

  if (maxRedemptions) {
    couponData.max_redemptions = maxRedemptions
  }

  try {
    const coupon = await stripe.coupons.create(couponData)
    console.log("[v0] Created Stripe coupon:", coupon.id)
    return coupon
  } catch (error: any) {
    console.error("[v0] Error creating Stripe coupon:", error)
    throw new Error(`Failed to create Stripe coupon: ${error.message}`)
  }
}

export async function createStripePromotionCode(
  couponId: string,
  promoCode: string,
  maxRedemptions?: number,
  expiresAt?: Date,
) {
  const promoCodeData: any = {
    coupon: couponId,
    code: promoCode.toUpperCase(),
    metadata: {
      campaign_id: couponId,
      created_at: new Date().toISOString(),
    },
  }

  if (maxRedemptions) {
    promoCodeData.max_redemptions = maxRedemptions
  }

  if (expiresAt) {
    promoCodeData.expires_at = Math.floor(expiresAt.getTime() / 1000)
  }

  try {
    const promotionCode = await stripe.promotionCodes.create(promoCodeData)
    console.log("[v0] Created Stripe promotion code:", promotionCode.code)
    return promotionCode
  } catch (error: any) {
    console.error("[v0] Error creating Stripe promotion code:", error)
    throw new Error(`Failed to create Stripe promotion code: ${error.message}`)
  }
}

export async function deactivateStripePromotionCode(promoCodeId: string) {
  try {
    const promotionCode = await stripe.promotionCodes.update(promoCodeId, { active: false })
    console.log("[v0] Deactivated Stripe promotion code:", promotionCode.code)
    return promotionCode
  } catch (error: any) {
    console.error("[v0] Error deactivating Stripe promotion code:", error)
    throw new Error(`Failed to deactivate Stripe promotion code: ${error.message}`)
  }
}

export async function listStripePromotionCodes(couponId?: string) {
  try {
    const params: any = { active: true, limit: 100 }
    if (couponId) {
      params.coupon = couponId
    }
    const promotionCodes = await stripe.promotionCodes.list(params)
    return promotionCodes.data
  } catch (error: any) {
    console.error("[v0] Error listing Stripe promotion codes:", error)
    throw new Error(`Failed to list Stripe promotion codes: ${error.message}`)
  }
}
