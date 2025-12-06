import { supabaseAdmin } from "@/lib/supabase/admin"

export const FRAUD_PREVENTION = {
  // Maximum checkout attempts per email+IP combo in time window
  MAX_CHECKOUT_ATTEMPTS: 5,
  CHECKOUT_WINDOW_MINUTES: 15,

  // Cooldown period after cancellation before allowing promo codes again
  CANCEL_COOLDOWN_DAYS: 30,

  // Block duration for rate limit violations
  RATE_LIMIT_BLOCK_HOURS: 24,
}

interface RateLimitResult {
  allowed: boolean
  reason?: string
  attemptsRemaining?: number
}

/**
 * Check if a user+IP combo is rate limited for checkout attempts
 * Prevents brute-forcing promo codes
 */
export async function checkCheckoutRateLimit(userEmail: string, ipAddress: string): Promise<RateLimitResult> {
  // Get or create rate limit record
  const { data: limitRecord } = await supabaseAdmin
    .from("checkout_rate_limits")
    .select("*")
    .eq("user_email", userEmail)
    .eq("ip_address", ipAddress)
    .single()

  const now = new Date()

  // Check if blocked
  if (limitRecord?.is_blocked && limitRecord.blocked_until) {
    const blockedUntil = new Date(limitRecord.blocked_until)
    if (now < blockedUntil) {
      return {
        allowed: false,
        reason: `Too many checkout attempts. Please try again after ${blockedUntil.toLocaleString()}.`,
      }
    } else {
      // Unblock and reset
      await supabaseAdmin
        .from("checkout_rate_limits")
        .update({
          is_blocked: false,
          blocked_until: null,
          attempt_count: 0,
        })
        .eq("user_email", userEmail)
        .eq("ip_address", ipAddress)
    }
  }

  if (!limitRecord) {
    // First attempt - create record
    await supabaseAdmin.from("checkout_rate_limits").insert({
      user_email: userEmail,
      ip_address: ipAddress,
      attempt_count: 1,
      first_attempt_at: now.toISOString(),
      last_attempt_at: now.toISOString(),
    })

    return {
      allowed: true,
      attemptsRemaining: FRAUD_PREVENTION.MAX_CHECKOUT_ATTEMPTS - 1,
    }
  }

  // Check if we're within the time window
  const firstAttempt = new Date(limitRecord.first_attempt_at)
  const windowEnd = new Date(firstAttempt.getTime() + FRAUD_PREVENTION.CHECKOUT_WINDOW_MINUTES * 60 * 1000)

  if (now > windowEnd) {
    // Window expired - reset counter
    await supabaseAdmin
      .from("checkout_rate_limits")
      .update({
        attempt_count: 1,
        first_attempt_at: now.toISOString(),
        last_attempt_at: now.toISOString(),
      })
      .eq("user_email", userEmail)
      .eq("ip_address", ipAddress)

    return {
      allowed: true,
      attemptsRemaining: FRAUD_PREVENTION.MAX_CHECKOUT_ATTEMPTS - 1,
    }
  }

  // Within window - check limit
  if (limitRecord.attempt_count >= FRAUD_PREVENTION.MAX_CHECKOUT_ATTEMPTS) {
    // Block the user
    const blockedUntil = new Date(now.getTime() + FRAUD_PREVENTION.RATE_LIMIT_BLOCK_HOURS * 60 * 60 * 1000)

    await supabaseAdmin
      .from("checkout_rate_limits")
      .update({
        is_blocked: true,
        blocked_until: blockedUntil.toISOString(),
      })
      .eq("user_email", userEmail)
      .eq("ip_address", ipAddress)

    return {
      allowed: false,
      reason: `Too many checkout attempts. Blocked until ${blockedUntil.toLocaleString()}.`,
    }
  }

  // Increment counter
  await supabaseAdmin
    .from("checkout_rate_limits")
    .update({
      attempt_count: limitRecord.attempt_count + 1,
      last_attempt_at: now.toISOString(),
    })
    .eq("user_email", userEmail)
    .eq("ip_address", ipAddress)

  return {
    allowed: true,
    attemptsRemaining: FRAUD_PREVENTION.MAX_CHECKOUT_ATTEMPTS - limitRecord.attempt_count - 1,
  }
}

/**
 * Check if user has already redeemed a specific promo code
 */
export async function hasRedeemedPromoCode(userEmail: string, promoCode: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("promo_code_redemptions")
    .select("id")
    .eq("user_email", userEmail)
    .eq("promo_code", promoCode)
    .single()

  return !!data
}

/**
 * Check if organization is in cooldown period after cancellation
 * Prevents immediate cancel-and-re-signup abuse
 */
export async function checkCancellationCooldown(
  organizationId: string,
): Promise<{ inCooldown: boolean; reason?: string; daysRemaining?: number }> {
  const { data: org } = await supabaseAdmin
    .from("organizations")
    .select("last_subscription_cancelled_at, subscription_cancel_count")
    .eq("organization_id", organizationId)
    .single()

  if (!org?.last_subscription_cancelled_at) {
    return { inCooldown: false }
  }

  const cancelledAt = new Date(org.last_subscription_cancelled_at)
  const now = new Date()
  const cooldownEnd = new Date(cancelledAt.getTime() + FRAUD_PREVENTION.CANCEL_COOLDOWN_DAYS * 24 * 60 * 60 * 1000)

  if (now < cooldownEnd) {
    const daysRemaining = Math.ceil((cooldownEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
    return {
      inCooldown: true,
      reason: `Your organization recently canceled a subscription. Please wait ${daysRemaining} more day(s) before subscribing again with a promo code.`,
      daysRemaining,
    }
  }

  return { inCooldown: false }
}

/**
 * Track promo code redemption
 */
export async function trackPromoRedemption(data: {
  organizationId: string
  userEmail: string
  promoCode: string
  stripeCheckoutSessionId: string
  stripeCustomerId: string
  planName: string
  discountAmount?: number
  ipAddress?: string
  userAgent?: string
}) {
  let campaignId: string | null = null

  try {
    const { data: campaign } = await supabaseAdmin
      .from("promotional_campaigns")
      .select("campaign_id")
      .eq("promo_code_template", data.promoCode)
      .eq("is_active", true)
      .single()

    if (campaign) {
      campaignId = campaign.campaign_id
      console.log("[v0] Linked redemption to campaign:", campaignId)
    }
  } catch (error) {
    console.log("[v0] Could not find active campaign for promo code:", data.promoCode)
  }

  await supabaseAdmin.from("promo_code_redemptions").insert({
    organization_id: data.organizationId,
    user_email: data.userEmail,
    promo_code: data.promoCode,
    stripe_checkout_session_id: data.stripeCheckoutSessionId,
    stripe_customer_id: data.stripeCustomerId,
    plan_name: data.planName,
    discount_amount: data.discountAmount,
    ip_address: data.ipAddress,
    user_agent: data.userAgent,
    campaign_id: campaignId, // Added campaign_id to link redemption with campaign
  })
}
