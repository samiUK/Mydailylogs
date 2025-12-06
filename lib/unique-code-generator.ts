// Generate unique promo codes for campaigns
import { createAdminClient } from "@/lib/supabase/admin"

function generateRandomCode(prefix: string, length = 6): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // Remove ambiguous chars
  let code = ""
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return `${prefix}-${code}`
}

export async function generateUniqueCodes(
  prefix: string,
  count: number,
  stripeCouponId: string,
  stripe: any,
  supabase: any,
  campaignId: string,
): Promise<{ campaign_id: string; promo_code: string; stripe_promotion_code_id?: string }[]> {
  try {
    console.log(`[v0] Generating ${count} codes for campaign ${campaignId}`)

    const codes: { campaign_id: string; promo_code: string; stripe_promotion_code_id?: string }[] = []
    const uniqueCodes = new Set<string>()

    while (uniqueCodes.size < count) {
      const code = generateRandomCode(prefix)
      uniqueCodes.add(code)
    }

    console.log(`[v0] Creating ${count} Stripe promotion codes...`)

    for (const code of uniqueCodes) {
      try {
        // Create individual Stripe promotion code using the stripe instance passed in
        const stripePromo = await stripe.promotionCodes.create({
          coupon: stripeCouponId,
          code: code,
          max_redemptions: 1,
        })

        codes.push({
          campaign_id: campaignId,
          promo_code: code,
          stripe_promotion_code_id: stripePromo.id,
        })
      } catch (error) {
        console.error(`[v0] Failed to create Stripe promo for ${code}:`, error)
        // Continue with next code even if one fails
      }
    }

    if (codes.length === 0) {
      throw new Error("Failed to create any Stripe promotion codes")
    }

    // Batch insert codes
    const { error } = await supabase.from("unique_promo_codes").insert(codes)

    if (error) {
      console.error("[v0] Error inserting promo codes:", error)
      throw new Error(error.message)
    }

    console.log(`[v0] Successfully created ${codes.length} unique codes with Stripe promotion codes`)
    return codes
  } catch (error) {
    console.error("[v0] Error generating codes:", error)
    throw error
  }
}

export async function issueCodeToUser(
  campaignId: string,
  userEmail: string,
): Promise<{ success: boolean; code?: string; error?: string }> {
  const supabase = createAdminClient()

  try {
    // Check if user already has a code for this campaign
    const { data: existing } = await supabase
      .from("unique_promo_codes")
      .select("promo_code")
      .eq("campaign_id", campaignId)
      .eq("issued_to_email", userEmail)
      .single()

    if (existing) {
      return { success: true, code: existing.promo_code }
    }

    // Get an unissued code
    const { data: availableCode, error: selectError } = await supabase
      .from("unique_promo_codes")
      .select("id, promo_code")
      .eq("campaign_id", campaignId)
      .eq("is_issued", false)
      .order("created_at", { ascending: true })
      .limit(1)
      .single()

    if (selectError || !availableCode) {
      return { success: false, error: "No codes available" }
    }

    // Mark code as issued
    const { error: updateError } = await supabase
      .from("unique_promo_codes")
      .update({
        is_issued: true,
        issued_to_email: userEmail,
        issued_at: new Date().toISOString(),
      })
      .eq("id", availableCode.id)

    if (updateError) {
      console.error("[v0] Error issuing code:", updateError)
      return { success: false, error: updateError.message }
    }

    return { success: true, code: availableCode.promo_code }
  } catch (error) {
    console.error("[v0] Error in issueCodeToUser:", error)
    return { success: false, error: String(error) }
  }
}
