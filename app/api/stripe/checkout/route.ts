import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { priceId, organizationId } = await request.json()

    if (!priceId || !organizationId) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user profile
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    // Get organization
    const { data: organization } = await supabase.from("organizations").select("*").eq("id", organizationId).single()

    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    // Create or get Stripe customer
    let customer
    const existingCustomer = await stripe.customers.list({
      email: profile.email,
      limit: 1,
    })

    if (existingCustomer.data.length > 0) {
      customer = existingCustomer.data[0]
    } else {
      customer = await stripe.customers.create({
        email: profile.email,
        name: profile.full_name,
        metadata: {
          organizationId: organizationId,
          userId: user.id,
        },
      })
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${request.nextUrl.origin}/admin/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.nextUrl.origin}/admin/billing?canceled=true`,
      metadata: {
        organizationId: organizationId,
        userId: user.id,
      },
    })

    return NextResponse.json({ sessionId: session.id })
  } catch (error) {
    console.error("Stripe checkout error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
