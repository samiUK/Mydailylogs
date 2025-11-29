export interface SubscriptionProduct {
  id: string
  name: string
  description: string
  priceMonthly: number
  trialDays: number
  maxTemplates: number
  maxTeamMembers: number
  maxAdmins: number
  features: {
    basicReporting?: boolean
    manualTaskMonitoring?: boolean
    taskAutomation?: boolean
    advancedReporting?: boolean
    advancedAnalytics?: boolean
    prioritySupport?: boolean
    dedicatedAccountManager?: boolean
    aiTaskMonitoring?: boolean
    smartNotifications?: boolean
    advancedAiMonitoring?: boolean
    predictiveNotifications?: boolean
    aiPerformanceInsights?: boolean
    customBranding?: boolean
  }
}

export const SUBSCRIPTION_PRODUCTS: SubscriptionProduct[] = [
  {
    id: "starter",
    name: "Starter",
    description: "Perfect for micro-businesses and startups",
    priceMonthly: 0,
    trialDays: 0, // No trial for free plan
    maxTemplates: 3,
    maxTeamMembers: 5,
    maxAdmins: 1,
    features: {
      basicReporting: true,
      manualTaskMonitoring: true,
      taskAutomation: false, // Free plan does NOT have task automation
    },
  },
  {
    id: "growth",
    name: "Growth",
    description: "Ideal for growing small-medium businesses",
    priceMonthly: 900, // Updated from £7.99 to £9.00 for monthly billing
    trialDays: 30, // 30-day free trial
    maxTemplates: 10,
    maxTeamMembers: 25, // Reduced from 30 to 25 team members
    maxAdmins: 3,
    features: {
      basicReporting: true,
      manualTaskMonitoring: true,
      advancedReporting: true,
      prioritySupport: true,
      taskAutomation: true, // Task automation available on Growth plan
      aiTaskMonitoring: true, // Coming Soon
      smartNotifications: true, // Coming Soon
      customBranding: true,
    },
  },
  {
    id: "scale",
    name: "Scale",
    description: "For established SMEs ready to scale",
    priceMonthly: 1600, // Updated from £14.99 to £16.00 for monthly billing
    trialDays: 30, // 30-day free trial
    maxTemplates: 20, // Reduced from 30 to 20 templates
    maxTeamMembers: 75, // Reduced from 100 to 75 team members
    maxAdmins: 10,
    features: {
      basicReporting: true,
      manualTaskMonitoring: true,
      taskAutomation: true, // Task automation available on Scale plan
      advancedReporting: true,
      advancedAnalytics: true,
      prioritySupport: true,
      dedicatedAccountManager: true,
      aiTaskMonitoring: true,
      smartNotifications: true,
      advancedAiMonitoring: true, // Coming Soon
      predictiveNotifications: true, // Coming Soon
      aiPerformanceInsights: true, // Coming Soon
      customBranding: true,
    },
  },
]

export function getProduct(productId: string): SubscriptionProduct | undefined {
  return SUBSCRIPTION_PRODUCTS.find((p) => p.id === productId)
}

export function formatPrice(priceInPence: number): string {
  return `£${(priceInPence / 100).toFixed(2)}`
}
