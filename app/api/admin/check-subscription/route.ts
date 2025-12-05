import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()

    // Get current user's profile
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id, email, role")
      .eq("id", user.id)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 })
    }

    // Check for active or trialing subscription
    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("organization_id", profile.organization_id)
      .maybeSingle()

    console.log("[v0] Subscription check:", {
      email: profile.email,
      organizationId: profile.organization_id,
      subscription,
      error: subError,
    })

    return NextResponse.json({
      profile,
      subscription,
      hasActiveSubscription: subscription && (subscription.status === "active" || subscription.status === "trialing"),
    })
  } catch (error: any) {
    console.error("[v0] Error checking subscription:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
