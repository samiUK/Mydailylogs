import { createClient } from "@/lib/supabase/server"

export async function getCampaignStats() {
  const supabase = await createClient()

  try {
    const { data: campaigns, error } = await supabase
      .from("promotional_campaigns")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching campaign stats:", error)
      return { success: false, campaigns: [] }
    }

    return { success: true, campaigns: campaigns || [] }
  } catch (error) {
    console.error("[v0] Error in getCampaignStats:", error)
    return { success: false, campaigns: [] }
  }
}

export async function isCampaignActive() {
  const supabase = await createClient()

  try {
    const { data: campaign, error } = await supabase
      .from("promotional_campaigns")
      .select("*")
      .eq("is_active", true)
      .single()

    if (error || !campaign) {
      return false
    }

    // Check if campaign has reached max redemptions
    const { count } = await supabase
      .from("unique_promo_codes")
      .select("*", { count: "exact", head: true })
      .eq("campaign_id", campaign.id)
      .eq("is_redeemed", true)

    if (count && count >= campaign.max_redemptions) {
      return false
    }

    return true
  } catch (error) {
    console.error("[v0] Error checking campaign active status:", error)
    return false
  }
}

export async function submitCampaignFeedback(data: {
  email: string
  fullName: string
  feedback: string
  socialShareLink: string
}) {
  const supabase = await createClient()

  try {
    // Get active campaign
    const { data: campaign, error: campaignError } = await supabase
      .from("promotional_campaigns")
      .select("*")
      .eq("is_active", true)
      .single()

    if (campaignError || !campaign) {
      return {
        success: false,
        message: "No active campaign found.",
      }
    }

    // Check if user already submitted
    const { data: existingShare } = await supabase
      .from("social_shares")
      .select("*")
      .eq("user_email", data.email)
      .eq("campaign_id", campaign.id)
      .single()

    if (existingShare) {
      return {
        success: false,
        message: "You have already participated in this campaign.",
      }
    }

    // Get an available promo code
    const { data: availableCode, error: codeError } = await supabase
      .from("unique_promo_codes")
      .select("*")
      .eq("campaign_id", campaign.id)
      .eq("is_redeemed", false)
      .is("issued_to_email", null)
      .limit(1)
      .single()

    if (codeError || !availableCode) {
      return {
        success: false,
        message: "Sorry, all promo codes have been claimed!",
      }
    }

    // Mark code as issued
    const { error: updateError } = await supabase
      .from("unique_promo_codes")
      .update({
        issued_to_email: data.email,
        issued_to_name: data.fullName,
        issued_at: new Date().toISOString(),
      })
      .eq("id", availableCode.id)

    if (updateError) {
      console.error("[v0] Error updating promo code:", updateError)
      return {
        success: false,
        message: "Failed to issue promo code. Please try again.",
      }
    }

    // Track social share
    await supabase.from("social_shares").insert({
      user_email: data.email,
      user_name: data.fullName,
      campaign_id: campaign.id,
      promo_code: availableCode.code,
      platform: "general",
      share_link: data.socialShareLink,
      feedback_text: data.feedback,
    })

    return {
      success: true,
      message: "Thank you for your feedback!",
      promoCode: availableCode.code,
    }
  } catch (error) {
    console.error("[v0] Error submitting campaign feedback:", error)
    return {
      success: false,
      message: "An error occurred. Please try again.",
    }
  }
}
