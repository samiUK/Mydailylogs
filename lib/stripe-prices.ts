import type { SubscriptionPlan, BillingPeriod } from "./subscription-types"

// Maps plan, billing period, and currency to Stripe price IDs
export const STRIPE_PRICES = {
  growth: {
    monthly: {
      GBP: "price_1SZXjcDMz3Bxx5pnyucBd9S3", // £8.00/month
      USD: "price_1SZXjWDMz3Bxx5pn5A7WjoU8", // $9.00/month
    },
    yearly: {
      GBP: "price_1SZXjZDMz3Bxx5pnDgM7e1Wz", // £96.00/year
      USD: "price_1SZXjRDMz3Bxx5pnmCJmfXSu", // $108.00/year
    },
  },
  scale: {
    monthly: {
      GBP: "price_1SZXjODMz3Bxx5pnpK8GB5gS", // £16.00/month
      USD: "price_1SZXjGDMz3Bxx5pnFfskR582", // $17.00/month
    },
    yearly: {
      GBP: "price_1SZXjKDMz3Bxx5pnZRkM09Hg", // £180.00/year
      USD: "price_1SZXhpDMz3Bxx5pnxMZyMkRj", // $192.00/year
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
