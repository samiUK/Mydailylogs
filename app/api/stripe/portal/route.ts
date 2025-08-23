import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { organizationId } = await request.json()

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get organization subscription
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("organization_id", organizationId)
      .single()

    if (!subscription?.stripe_customer_id) {
      return NextResponse.json({ error: "No subscription found" }, { status: 404 })
    }

    // Create portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${request.nextUrl.origin}/admin/billing`,
    })

    return NextResponse.json({ url: portalSession.url })
  } catch (error) {
    console.error("Portal session error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
