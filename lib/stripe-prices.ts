import type { SubscriptionPlan, BillingPeriod } from "./subscription-types"

// Maps plan, billing period, and currency to Stripe price IDs
export const STRIPE_PRICES = {
  growth: {
    monthly: {
      GBP: "price_1GrowthMonthlyGBP", // £8.00/month - UPDATE THIS PRICE IN STRIPE
      USD: "price_1GrowthMonthlyUSD", // $10.00/month - UPDATE THIS PRICE IN STRIPE
    },
    yearly: {
      GBP: "price_1SazBKDMz3Bxx5pnyJ1e70gp", // £96.00/year (£8/month)
      USD: "price_1GrowthYearlyUSD", // $108.00/year ($9/month) - UPDATE THIS PRICE IN STRIPE
    },
  },
  scale: {
    monthly: {
      GBP: "price_1SazCUDMz3Bxx5pneujlkdor", // £15.00/month
      USD: "price_1ScaleMonthlyUSD", // $17.00/month - UPDATE THIS PRICE IN STRIPE
    },
    yearly: {
      GBP: "price_1SazDQDMz3Bxx5pnjiYZTb6t", // £180.00/year (£15/month)
      USD: "price_1ScaleYearlyUSD", // $192.00/year ($16/month) - UPDATE THIS PRICE IN STRIPE
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

export const STRIPE_PRICE_CONFIG = {
  // Growth Plan
  [STRIPE_PRICES.growth.monthly.GBP]: {
    priceId: STRIPE_PRICES.growth.monthly.GBP,
    plan: "growth",
    interval: "month",
    amount: 800, // £8.00 in pence
    currency: "gbp",
  },
  [STRIPE_PRICES.growth.monthly.USD]: {
    priceId: STRIPE_PRICES.growth.monthly.USD,
    plan: "growth",
    interval: "month",
    amount: 1000, // $10.00 in cents
    currency: "usd",
  },
  [STRIPE_PRICES.growth.yearly.GBP]: {
    priceId: STRIPE_PRICES.growth.yearly.GBP,
    plan: "growth",
    interval: "year",
    amount: 8400, // £84.00 in pence (£7/month)
    currency: "gbp",
  },
  [STRIPE_PRICES.growth.yearly.USD]: {
    priceId: STRIPE_PRICES.growth.yearly.USD,
    plan: "growth",
    interval: "year",
    amount: 10800, // $108.00 in cents ($9/month)
    currency: "usd",
  },
  // Scale Plan
  [STRIPE_PRICES.scale.monthly.GBP]: {
    priceId: STRIPE_PRICES.scale.monthly.GBP,
    plan: "scale",
    interval: "month",
    amount: 1500, // £15.00 in pence
    currency: "gbp",
  },
  [STRIPE_PRICES.scale.monthly.USD]: {
    priceId: STRIPE_PRICES.scale.monthly.USD,
    plan: "scale",
    interval: "month",
    amount: 1700, // $17.00 in cents
    currency: "usd",
  },
  [STRIPE_PRICES.scale.yearly.GBP]: {
    priceId: STRIPE_PRICES.scale.yearly.GBP,
    plan: "scale",
    interval: "year",
    amount: 16800, // £168.00 in pence (£14/month)
    currency: "gbp",
  },
  [STRIPE_PRICES.scale.yearly.USD]: {
    priceId: STRIPE_PRICES.scale.yearly.USD,
    plan: "scale",
    interval: "year",
    amount: 19200, // $192.00 in cents ($16/month)
    currency: "usd",
  },
} as const
