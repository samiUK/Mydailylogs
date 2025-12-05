import Stripe from "stripe"

const stripeKey = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY_MYDAYLOGS

if (!stripeKey) {
  throw new Error("Stripe API key not found. Please set STRIPE_SECRET_KEY or STRIPE_SECRET_KEY_MYDAYLOGS")
}

const stripe = new Stripe(stripeKey, {
  apiVersion: "2024-12-18.acacia",
})

export async function createBillingPortalSession(): Promise<string> {
  try {
    const session = await stripe.billingPortal.sessions.create({
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/admin/billing`,
    })

    return session.url
  } catch (error) {
    console.error("[v0] Error creating billing portal session:", error)
    throw new Error("Failed to create billing portal session")
  }
}
