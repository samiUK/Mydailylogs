import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

// GET - List all promo campaign submissions with campaign details
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const campaignId = searchParams.get("campaign_id")

    let query = supabase
      .from("promo_campaign_submissions")
      .select(
        `
        *,
        promo_campaigns (
          name,
          discount_type,
          discount_value
        )
      `,
      )
      .order("created_at", { ascending: false })

    if (campaignId) {
      query = query.eq("campaign_id", campaignId)
    }

    const { data: submissions, error } = await query

    if (error) throw error

    return NextResponse.json({ submissions })
  } catch (error: any) {
    console.error("[v0] Error fetching promo submissions:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
