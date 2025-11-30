import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const runtime = "edge"

export async function GET(request: Request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const supabase = await createClient()

    // Find all expired trials
    const { data: expiredTrials, error: fetchError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("is_trial", true)
      .eq("status", "active")
      .lt("trial_ends_at", new Date().toISOString())

    if (fetchError) {
      console.error("Error fetching expired trials:", fetchError)
      return NextResponse.json({ error: "Failed to fetch expired trials" }, { status: 500 })
    }

    if (!expiredTrials || expiredTrials.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No expired trials found",
        count: 0,
      })
    }

    // Downgrade each expired trial to Starter plan
    const updates = expiredTrials.map(async (trial) => {
      const { error } = await supabase
        .from("subscriptions")
        .update({
          plan_name: "starter",
          status: "active",
          is_trial: false,
          trial_ends_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", trial.id)

      if (error) {
        console.error(`Error downgrading trial ${trial.id}:`, error)
        return { success: false, id: trial.id, error: error.message }
      }

      return { success: true, id: trial.id }
    })

    const results = await Promise.all(updates)
    const successCount = results.filter((r) => r.success).length

    return NextResponse.json({
      success: true,
      message: `Processed ${expiredTrials.length} expired trials`,
      expired: expiredTrials.length,
      downgraded: successCount,
      results,
    })
  } catch (error) {
    console.error("Error in expire-trials cron:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
