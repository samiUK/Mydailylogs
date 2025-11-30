export interface SubscriptionProduct {
  id: string
  name: string
  description: string
  priceMonthly: number
  priceYearly: number // Added yearly pricing
  trialDays: number
  maxTemplates: number
  maxTeamMembers: number
  maxAdminAccounts: number // Total admin + manager accounts
  maxReportSubmissions: number | null
  maxStorage: number
  maxAPIRequests: number
  features: {
    manualTaskMonitoring?: boolean
    taskAutomation?: boolean
    prioritySupport?: boolean
    dedicatedAccountManager?: boolean
    aiTaskMonitoring?: boolean
    smartNotifications?: boolean
    advancedAiMonitoring?: boolean
    predictiveNotifications?: boolean
    aiPerformanceInsights?: boolean
    customBranding?: boolean
    contractorLinkShare?: boolean
    photoUpload?: boolean
    reportDeletionRecovery?: boolean
    emailNotifications?: boolean // Added emailNotifications flag
  }
}

export const SUBSCRIPTION_PRODUCTS: SubscriptionProduct[] = [
  {
    id: "starter",
    name: "Starter",
    description: "Perfect for micro-businesses and startups",
    priceMonthly: 0,
    priceYearly: 0,
    trialDays: 0,
    maxTemplates: 3,
    maxTeamMembers: 5,
    maxAdminAccounts: 1,
    maxReportSubmissions: 50,
    maxStorage: 1,
    maxAPIRequests: 1000,
    features: {
      manualTaskMonitoring: true,
      taskAutomation: false,
      customBranding: false,
      contractorLinkShare: false,
      photoUpload: false,
      emailNotifications: false,
    },
  },
  {
    id: "growth",
    name: "Growth",
    description: "Ideal for growing small-medium businesses",
    priceMonthly: 900, // £9/month
    priceYearly: 9600, // £96/year (£8/month)
    trialDays: 30,
    maxTemplates: 10,
    maxTeamMembers: 25,
    maxAdminAccounts: 3,
    maxReportSubmissions: null,
    maxStorage: 10,
    maxAPIRequests: 10000,
    features: {
      manualTaskMonitoring: true,
      taskAutomation: true,
      customBranding: true,
      contractorLinkShare: true,
      photoUpload: true,
      emailNotifications: true,
    },
  },
  {
    id: "scale",
    name: "Scale",
    description: "For established SMEs ready to scale",
    priceMonthly: 1600, // £16/month
    priceYearly: 18000, // £180/year (£15/month)
    trialDays: 30,
    maxTemplates: 20,
    maxTeamMembers: 75,
    maxAdminAccounts: 7,
    maxReportSubmissions: null,
    maxStorage: 50,
    maxAPIRequests: 50000,
    features: {
      manualTaskMonitoring: true,
      taskAutomation: true,
      customBranding: true,
      contractorLinkShare: true,
      photoUpload: true,
      reportDeletionRecovery: true,
      emailNotifications: true,
    },
  },
]

export function getProduct(productId: string): SubscriptionProduct | undefined {
  return SUBSCRIPTION_PRODUCTS.find((p) => p.id === productId)
}

export function formatPrice(priceInPence: number, currency: "GBP" | "USD" = "GBP"): string {
  if (currency === "USD") {
    // Convert pence to dollars with +$1 markup
    const basePrice = priceInPence / 100
    const usdPrice = basePrice + 1
    return `$${usdPrice.toFixed(2)}`
  }
  return `£${(priceInPence / 100).toFixed(2)}`
}

export function getUSDPrice(priceInPence: number): number {
  // Base price in GBP converted to cents, then add $1 (100 cents)
  return priceInPence + 100
}
