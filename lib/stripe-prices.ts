import type { SubscriptionPlan, BillingPeriod } from "./subscription-types"

// Maps plan, billing period, and currency to Stripe price IDs
export const STRIPE_PRICES = {
  growth: {
    monthly: {
      GBP: "price_1SZUmgDMz3Bxx5pnZ0hHfZfw", // £8.00/month
      USD: "price_1SZUpEDMz3Bxx5pn7NapiNbJ", // $9.00/month
    },
    yearly: {
      GBP: "price_1SZUo0DMz3Bxx5pnPjDAXHM0", // £96.00/year
      USD: "price_1SZUppDMz3Bxx5pnqugbX3Zd", // $108.00/year
    },
  },
  scale: {
    monthly: {
      GBP: "price_1SZUrPDMz3Bxx5pn57OmdGJR", // £16.00/month
      USD: "price_1SZUtIDMz3Bxx5pn6fYwxDBb", // $17.00/month
    },
    yearly: {
      GBP: "price_1SZUsXDMz3Bxx5pnH9Ji7JBz", // £180.00/year
      USD: "price_1SZUttDMz3Bxx5pnapZbXBqD", // $192.00/year
    },
  },
} as const

export type Currency = "GBP" | "USD"

export function getStripePriceId(plan: SubscriptionPlan, period: BillingPeriod, currency: Currency): string {
  const priceId = STRIPE_PRICES[plan]?.[period]?.[currency]
  if (!priceId) {
    throw new Error(`No Stripe price found for plan: ${plan}, period: ${period}, currency: ${currency}`)
  }
  return priceId
}

export function getSubscriptionTypeFromPriceId(
  priceId: string,
): { plan: SubscriptionPlan; period: BillingPeriod } | null {
  for (const [plan, periods] of Object.entries(STRIPE_PRICES)) {
    for (const [period, currencies] of Object.entries(periods)) {
      if (Object.values(currencies).includes(priceId)) {
        return {
          plan: plan as SubscriptionPlan,
          period: period as BillingPeriod,
        }
      }
    }
  }
  return null
}
