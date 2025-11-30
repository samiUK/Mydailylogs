import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { stripe } from "@/lib/stripe"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  try {
    const cookieStore = await cookies()
    const masterAdminEmail = cookieStore.get("masterAdminEmail")?.value
    const masterAdminImpersonation = cookieStore.get("masterAdminImpersonation")?.value

    if (!masterAdminEmail || masterAdminEmail !== "arsami.uk@gmail.com" || masterAdminImpersonation !== "true") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] Fetching payments from Stripe...")

    const paymentIntents = await stripe.paymentIntents.list({
      limit: 100,
      expand: ["data.customer"],
    })

    const charges = await stripe.charges.list({
      limit: 100,
    })

    const supabase = createAdminClient()
    const { data: subscriptions } = await supabase
      .from("subscriptions")
      .select("*, organizations(organization_id, organization_name, slug)")

    const subscriptionMap = new Map()
    subscriptions?.forEach((sub) => {
      if (sub.stripe_subscription_id) {
        subscriptionMap.set(sub.stripe_subscription_id, sub)
      }
    })

    const payments = paymentIntents.data.map((intent) => {
      const charge = charges.data.find((c) => c.payment_intent === intent.id)
      const subscription = subscriptionMap.get(intent.metadata?.subscription_id || "")

      return {
        id: intent.id,
        stripe_payment_id: intent.id,
        amount: (intent.amount / 100).toFixed(2),
        currency: intent.currency.toUpperCase(),
        status: intent.status,
        created_at: new Date(intent.created * 1000).toISOString(),
        customer_email: typeof intent.customer === "object" ? intent.customer?.email : null,
        customer_name: typeof intent.customer === "object" ? intent.customer?.name : null,
        payment_method: charge?.payment_method_details?.type || "unknown",
        receipt_url: charge?.receipt_url || null,
        refunded: intent.amount_refunded > 0,
        refunded_amount: intent.amount_refunded ? (intent.amount_refunded / 100).toFixed(2) : "0.00",
        organization: subscription?.organizations
          ? {
              organization_id: subscription.organizations.organization_id,
              organization_name: subscription.organizations.organization_name,
              slug: subscription.organizations.slug,
            }
          : null,
        plan_name: subscription?.plan_name || "Unknown",
        subscription_id: subscription?.id || null,
      }
    })

    console.log("[v0] Fetched", payments.length, "payments from Stripe")

    return NextResponse.json({ payments })
  } catch (error: any) {
    console.error("[v0] Error syncing Stripe payments:", error)
    return NextResponse.json({ error: error.message || "Failed to sync payments" }, { status: 500 })
  }
}
