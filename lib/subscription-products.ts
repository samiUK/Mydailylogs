export interface SubscriptionProduct {
  id: string
  name: string
  description: string
  priceMonthly: number
  trialDays: number
  maxTemplates: number
  maxTeamMembers: number
  maxAdmins: number
  maxReportSubmissions: number | null // null means unlimited
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
  }
}

export const SUBSCRIPTION_PRODUCTS: SubscriptionProduct[] = [
  {
    id: "starter",
    name: "Starter",
    description: "Perfect for micro-businesses and startups",
    priceMonthly: 0,
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
    },
  },
  {
    id: "growth",
    name: "Growth",
    description: "Ideal for growing small-medium businesses",
    priceMonthly: 900,
    trialDays: 30,
    maxTemplates: 10,
    maxTeamMembers: 25,
    maxAdmins: 3,
    maxReportSubmissions: null,
    maxStorage: 10,
    maxAPIRequests: 10000,
    features: {
      manualTaskMonitoring: true,
      prioritySupport: true,
      taskAutomation: true,
      aiTaskMonitoring: true,
      smartNotifications: true,
      customBranding: true,
      contractorLinkShare: true,
      photoUpload: true,
    },
  },
  {
    id: "scale",
    name: "Scale",
    description: "For established SMEs ready to scale",
    priceMonthly: 1600,
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
      prioritySupport: true,
      dedicatedAccountManager: true,
      aiTaskMonitoring: true,
      smartNotifications: true,
      advancedAiMonitoring: true,
      predictiveNotifications: true,
      aiPerformanceInsights: true,
      customBranding: true,
      contractorLinkShare: true,
      photoUpload: true,
      reportDeletionRecovery: true,
    },
  },
]

export function getProduct(productId: string): SubscriptionProduct | undefined {
  return SUBSCRIPTION_PRODUCTS.find((p) => p.id === productId)
}

export function formatPrice(priceInPence: number): string {
  return `£${(priceInPence / 100).toFixed(2)}`
}
