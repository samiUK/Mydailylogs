import type { SubscriptionPlan, BillingPeriod } from "./subscription-types"

// Maps plan, billing period, and currency to Stripe price IDs
export const STRIPE_PRICES = {
  growth: {
    monthly: {
      GBP: "MISSING_CREATE_IN_STRIPE", // £8.00/month - CREATE THIS PRICE IN STRIPE
      USD: "MISSING_CREATE_IN_STRIPE", // $10.00/month - CREATE THIS PRICE IN STRIPE
    },
    yearly: {
      GBP: "price_1SazBKDMz3Bxx5pnyJ1e70gp", // £96.00/year (£8/month)
      USD: "MISSING_CREATE_IN_STRIPE", // $108.00/year ($9/month) - CREATE THIS PRICE IN STRIPE
    },
  },
  scale: {
    monthly: {
      GBP: "price_1SazCUDMz3Bxx5pneujlkdor", // £15.00/month
      USD: "MISSING_CREATE_IN_STRIPE", // $17.00/month - CREATE THIS PRICE IN STRIPE
    },
    yearly: {
      GBP: "price_1SazDQDMz3Bxx5pnjiYZTb6t", // £180.00/year (£15/month)
      USD: "MISSING_CREATE_IN_STRIPE", // $192.00/year ($16/month) - CREATE THIS PRICE IN STRIPE
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
