import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { issueCodeToUser } from "@/lib/unique-code-generator"

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient()

    const { campaignId, feedbackId, socialSharePlatform, userEmail } = await request.json()

    console.log("[v0] Issue code request:", { campaignId, feedbackId, socialSharePlatform, userEmail })

    if (!campaignId || !feedbackId || !socialSharePlatform || !userEmail) {
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

    const result = await issueCodeToUser(campaignId, userEmail)

    console.log("[v0] Issue code result:", result)

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to issue code" }, { status: 400 })
    }

    const { error: updateError } = await supabase
      .from("social_shares")
      .update({ promo_code: result.code })
      .eq("id", share.id)

    if (updateError) {
      console.error("[v0] Failed to update social share:", updateError)
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
