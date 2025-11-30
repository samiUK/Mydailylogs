export interface SubscriptionProduct {
  id: string
  name: string
  description: string
  priceMonthly: number
  priceYearly: number // Added yearly pricing
  trialDays: number
  maxTemplates: number
  maxTeamMembers: number
  maxAdmins: number
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
    priceYearly: 0, // Added yearly price
    trialDays: 0,
    maxTemplates: 3,
    maxTeamMembers: 5,
    maxAdmins: 1,
    maxReportSubmissions: 50,
    maxStorage: 1,
    maxAPIRequests: 1000,
    features: {
      manualTaskMonitoring: true,
      taskAutomation: false,
      customBranding: false,
      contractorLinkShare: false,
      photoUpload: false,
      emailNotifications: false, // Added emailNotifications flag set to false for Starter plan
    },
  },
  {
    id: "growth",
    name: "Growth",
    description: "Ideal for growing small-medium businesses",
    priceMonthly: 900, // £9/month
    priceYearly: 9600, // £96/year (£8/month) - Added yearly price
    trialDays: 30,
    maxTemplates: 10,
    maxTeamMembers: 25,
    maxAdmins: 3,
    maxReportSubmissions: null,
    maxStorage: 10,
    maxAPIRequests: 10000,
    features: {
      manualTaskMonitoring: true,
      taskAutomation: true,
      customBranding: true,
      contractorLinkShare: true,
      photoUpload: true,
      emailNotifications: true, // Added emailNotifications flag set to true for Growth plan
    },
  },
  {
    id: "scale",
    name: "Scale",
    description: "For established SMEs ready to scale",
    priceMonthly: 1600, // £16/month
    priceYearly: 18000, // £180/year (£15/month) - Added yearly price
    trialDays: 30,
    maxTemplates: 20,
    maxTeamMembers: 75,
    maxAdmins: 10,
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
      emailNotifications: true, // Added emailNotifications flag set to true for Scale plan
    },
  },
]

export function getProduct(productId: string): SubscriptionProduct | undefined {
  return SUBSCRIPTION_PRODUCTS.find((p) => p.id === productId)
}

export function formatPrice(priceInPence: number): string {
  return `£${(priceInPence / 100).toFixed(2)}`
}
