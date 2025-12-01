import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
})

export async function createBillingPortalSession(): Promise<string> {
  try {
    const session = await stripe.billingPortal.sessions.create({
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/admin/profile/billing`,
    })

    return session.url
  } catch (error) {
    console.error("[v0] Error creating billing portal session:", error)
    throw new Error("Failed to create billing portal session")
  }
}
