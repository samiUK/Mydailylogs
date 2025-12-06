import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { issueCodeToUser } from "@/lib/unique-code-generator"

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient()

    const { campaignId, feedbackId, socialSharePlatform, userEmail } = await request.json()

    console.log("[v0] Issue code request:", { campaignId, feedbackId, socialSharePlatform, userEmail })

    if (!campaignId || !feedbackId || !userEmail) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const { data: feedback, error: feedbackError } = await supabase
      .from("feedback")
      .select("id, email")
      .eq("id", feedbackId)
      .single()

    console.log("[v0] Feedback lookup:", { feedback, feedbackError })

    if (feedbackError || !feedback) {
      return NextResponse.json({ error: "Feedback not found" }, { status: 404 })
    }

    if (socialSharePlatform) {
      const { data: share, error: shareError } = await supabase
        .from("social_shares")
        .select("id")
        .eq("feedback_id", feedbackId)
        .eq("share_platform", socialSharePlatform)
        .single()

      console.log("[v0] Share lookup:", { share, shareError })

      if (shareError || !share) {
        return NextResponse.json({ error: "Social share not completed" }, { status: 400 })
      }

      // Update social share with promo code later
    }

    const result = await issueCodeToUser(campaignId, userEmail)

    console.log("[v0] Issue code result:", result)

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to issue code" }, { status: 400 })
    }

    if (socialSharePlatform) {
      const { data: share } = await supabase
        .from("social_shares")
        .select("id")
        .eq("feedback_id", feedbackId)
        .eq("share_platform", socialSharePlatform)
        .single()

      if (share) {
        const { error: updateError } = await supabase
          .from("social_shares")
          .update({ promo_code: result.code })
          .eq("id", share.id)

        if (updateError) {
          console.error("[v0] Failed to update social share:", updateError)
        }
      }
    }

    const { data: campaign } = await supabase
      .from("promotional_campaigns")
      .select("id, max_redemptions, promo_code_template")
      .eq("id", campaignId)
      .single()

    if (campaign) {
      const { count: redemptionCount } = await supabase
        .from("unique_promo_codes")
        .select("*", { count: "exact", head: true })
        .eq("campaign_id", campaignId)
        .eq("is_used", true)

      console.log("[v0] Redemption check:", {
        used: redemptionCount,
        max: campaign.max_redemptions,
      })

      // Auto-disable campaign when all codes are used
      if (redemptionCount && redemptionCount >= campaign.max_redemptions) {
        console.log("[v0] Campaign reached max redemptions, auto-disabling...")
        await supabase.from("promotional_campaigns").update({ is_active: false }).eq("id", campaignId)
        console.log("[v0] Campaign auto-disabled successfully")
      }
    }

    return NextResponse.json({
      success: true,
      promoCode: result.code,
    })
  } catch (error) {
    console.error("[v0] Error issuing promo code:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
