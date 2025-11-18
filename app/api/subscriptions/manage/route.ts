import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("organization_id", profile.organization_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (subError && subError.code !== "PGRST116") {
      throw subError
    }

    const { data: payments, error: payError } = await supabase
      .from("payments")
      .select("*")
      .eq("subscription_id", subscription?.id || "")
      .order("created_at", { ascending: false })
      .limit(10)

    if (payError) {
      console.error("[v0] Error fetching payments:", payError)
    }

    return NextResponse.json({
      subscription: subscription || null,
      payments: payments || [],
    })
  } catch (error) {
    console.error("[v0] Error fetching subscription data:", error)
    return NextResponse.json({ error: "Failed to fetch subscription data" }, { status: 500 })
  }
}
