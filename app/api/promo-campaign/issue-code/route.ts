import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { issueCodeToUser } from "@/lib/unique-code-generator"

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()

    // Get user session
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { campaignId, feedbackId, socialSharePlatform } = await request.json()

    if (!campaignId || !feedbackId || !socialSharePlatform) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Verify user completed both feedback and social share
    const { data: feedback } = await supabase
      .from("feedback")
      .select("id")
      .eq("id", feedbackId)
      .eq("user_id", user.id)
      .single()

    if (!feedback) {
      return NextResponse.json({ error: "Feedback not found" }, { status: 404 })
    }

    const { data: share } = await supabase
      .from("social_shares")
      .select("id")
      .eq("feedback_id", feedbackId)
      .eq("platform", socialSharePlatform)
      .single()

    if (!share) {
      return NextResponse.json({ error: "Social share not completed" }, { status: 400 })
    }

    // Issue unique code to user
    const result = await issueCodeToUser(campaignId, user.email!)

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to issue code" }, { status: 400 })
    }

    // Update social share with issued code
    await supabase.from("social_shares").update({ unique_promo_code: result.code }).eq("id", share.id)

    // No sendPromoCodeEmail call - users must copy from modal

    return NextResponse.json({
      success: true,
      promoCode: result.code,
    })
  } catch (error) {
    console.error("[v0] Error issuing promo code:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
