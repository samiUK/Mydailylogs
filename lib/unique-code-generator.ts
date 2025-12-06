// Generate unique promo codes for campaigns
import { createClient } from "@/lib/supabase/server"

function generateRandomCode(prefix: string, length = 6): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // Remove ambiguous chars
  let code = ""
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return `${prefix}-${code}`
}

export async function generateUniqueCodes(
  campaignId: string,
  prefix: string,
  count: number,
): Promise<{ success: boolean; generated: number; error?: string }> {
  const supabase = await createClient()

  try {
    const codes: { campaign_id: string; promo_code: string }[] = []
    const uniqueCodes = new Set<string>()

    // Generate unique codes
    while (uniqueCodes.size < count) {
      const code = generateRandomCode(prefix)
      uniqueCodes.add(code)
    }

    // Prepare batch insert
    uniqueCodes.forEach((code) => {
      codes.push({
        campaign_id: campaignId,
        promo_code: code,
      })
    })

    // Batch insert codes
    const { error } = await supabase.from("unique_promo_codes").insert(codes)

    if (error) {
      console.error("[v0] Error inserting promo codes:", error)
      return { success: false, generated: 0, error: error.message }
    }

    return { success: true, generated: codes.length }
  } catch (error) {
    console.error("[v0] Error generating codes:", error)
    return { success: false, generated: 0, error: String(error) }
  }
}

export async function issueCodeToUser(
  campaignId: string,
  userEmail: string,
): Promise<{ success: boolean; code?: string; error?: string }> {
  const supabase = await createClient()

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
