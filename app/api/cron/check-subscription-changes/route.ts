import { type NextRequest, NextResponse } from "next"
import { createClient } from "@supabase/supabase-js"
import { handleSubscriptionDowngrade } from "@/lib/subscription-limits"

export const dynamic = "force-dynamic"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] Running subscription change check...")

    // Get all subscriptions that ended or were cancelled
    const now = new Date()
    const { data: expiredSubscriptions } = await supabase
      .from("subscriptions")
      .select("organization_id, plan_name, status")
      .or(`status.eq.cancelled,current_period_end.lt.${now.toISOString()}`)

    if (expiredSubscriptions && expiredSubscriptions.length > 0) {
      console.log(`[v0] Found ${expiredSubscriptions.length} expired/cancelled subscriptions`)

      for (const subscription of expiredSubscriptions) {
        // Check if organization now falls back to free tier
        const { data: activeSubscription } = await supabase
          .from("subscriptions")
          .select("plan_name")
          .eq("organization_id", subscription.organization_id)
          .eq("status", "active")
          .single()

        // If no active subscription, handle downgrade to free tier
        if (!activeSubscription) {
          console.log(`[v0] Handling downgrade for organization: ${subscription.organization_id}`)
          await handleSubscriptionDowngrade(subscription.organization_id)

          // Update expired subscription status
          await supabase
            .from("subscriptions")
            .update({ status: "expired" })
            .eq("organization_id", subscription.organization_id)
            .eq("status", "cancelled")
        }
      }
    }

    return NextResponse.json({
      success: true,
      checked: expiredSubscriptions?.length || 0,
      message: "Subscription changes processed",
    })
  } catch (error) {
    console.error("[v0] Error checking subscription changes:", error)
    return NextResponse.json({ error: "Failed to check subscriptions" }, { status: 500 })
  }
}
