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
    priceMonthly: 800, // £8/month GBP, $10/month USD
    priceYearly: 8400, // £84/year (£7/month) GBP, $108/year ($9/month) USD
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
    priceMonthly: 1500, // £15/month GBP, $17-18/month USD
    priceYearly: 16800, // £168/year (£14/month) GBP, $192/year ($16/month) USD
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
    // Growth: £8 → $10 monthly, £84 → $108 yearly
    // Scale: £15 → $17-18 monthly, £168 → $192 yearly
    const basePrice = priceInPence / 100
    let usdPrice: number

    // Monthly prices
    if (priceInPence === 800) {
      // Growth monthly
      usdPrice = 10
    } else if (priceInPence === 1500) {
      // Scale monthly
      usdPrice = 17 // You may need to confirm if this should be $17 or $18
    }
    // Yearly prices
    else if (priceInPence === 8400) {
      // Growth yearly
      usdPrice = 108
    } else if (priceInPence === 16800) {
      // Scale yearly
      usdPrice = 192
    }
    // Monthly equivalent for yearly (for display)
    else if (priceInPence === 700) {
      // Growth yearly monthly equivalent £7
      usdPrice = 9
    } else if (priceInPence === 1400) {
      // Scale yearly monthly equivalent £14
      usdPrice = 16
    } else {
      usdPrice = basePrice + 2 // fallback
    }

    return `$${usdPrice.toFixed(2)}`
  }
  return `£${(priceInPence / 100).toFixed(2)}`
}

export function getUSDPrice(priceInPence: number): number {
  if (priceInPence === 800) return 1000 // Growth monthly: $10
  if (priceInPence === 8400) return 10800 // Growth yearly: $108
  if (priceInPence === 1500) return 1700 // Scale monthly: $17
  if (priceInPence === 16800) return 19200 // Scale yearly: $192
  return priceInPence + 200 // fallback
}
