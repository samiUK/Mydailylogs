export interface SubscriptionProduct {
  id: string
  name: string
  description: string
  priceMonthly: number
  maxTemplates: number
  maxTeamMembers: number
  features: {
    customBranding?: boolean
    prioritySupport?: boolean
    advancedAnalytics?: boolean
    apiAccess?: boolean
  }
}

// This is the source of truth for all subscription products
// All UI to display products should pull from this array
// IDs passed to the checkout session should match IDs from this array
export const SUBSCRIPTION_PRODUCTS: SubscriptionProduct[] = [
  {
    id: "free",
    name: "Free",
    description: "Perfect for getting started",
    priceMonthly: 0,
    maxTemplates: 3,
    maxTeamMembers: 5,
    features: {},
  },
  {
    id: "professional",
    name: "Professional",
    description: "For growing teams",
    priceMonthly: 2900, // £29.00 in pence
    maxTemplates: 20,
    maxTeamMembers: 25,
    features: {
      customBranding: true,
      prioritySupport: true,
    },
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "For large organizations",
    priceMonthly: 9900, // £99.00 in pence
    maxTemplates: -1, // unlimited
    maxTeamMembers: -1, // unlimited
    features: {
      customBranding: true,
      prioritySupport: true,
      advancedAnalytics: true,
      apiAccess: true,
    },
  },
]

export function getProduct(productId: string): SubscriptionProduct | undefined {
  return SUBSCRIPTION_PRODUCTS.find((p) => p.id === productId)
}

export function formatPrice(priceInPence: number): string {
  return `£${(priceInPence / 100).toFixed(2)}`
}
