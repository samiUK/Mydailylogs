export interface SubscriptionProduct {
  id: string;
  name: string;
  description: string;
  priceMonthly: number;
  trialDays: number;
  maxTemplates: number;
  maxTeamMembers: number;
  maxAdmins: number;
  features: {
    basicReporting?: boolean;
    manualTaskMonitoring?: boolean;
    advancedReporting?: boolean;
    advancedAnalytics?: boolean;
    prioritySupport?: boolean;
    dedicatedAccountManager?: boolean;
    aiTaskMonitoring?: boolean;
    smartNotifications?: boolean;
    advancedAiMonitoring?: boolean;
    predictiveNotifications?: boolean;
    aiPerformanceInsights?: boolean;
  };
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
    },
  },
  {
    id: "growth",
    name: "Growth",
    description: "Ideal for growing small-medium businesses",
    priceMonthly: 999, // £9.99 in pence
    trialDays: 30, // 30-day free trial
    maxTemplates: 10,
    maxTeamMembers: 30,
    maxAdmins: 3,
    features: {
      basicReporting: true,
      manualTaskMonitoring: true,
      advancedReporting: true,
      prioritySupport: true,
      aiTaskMonitoring: true, // Coming Soon
      smartNotifications: true, // Coming Soon
    },
  },
  {
    id: "scale",
    name: "Scale",
    description: "For established SMEs ready to scale",
    priceMonthly: 1999, // £19.99 in pence
    trialDays: 30, // 30-day free trial
    maxTemplates: 30,
    maxTeamMembers: 100,
    maxAdmins: 10,
    features: {
      basicReporting: true,
      manualTaskMonitoring: true,
      advancedReporting: true,
      advancedAnalytics: true,
      prioritySupport: true,
      dedicatedAccountManager: true,
      aiTaskMonitoring: true,
      smartNotifications: true,
      advancedAiMonitoring: true, // Coming Soon
      predictiveNotifications: true, // Coming Soon
      aiPerformanceInsights: true, // Coming Soon
    },
  },
];

export function getProduct(productId: string): SubscriptionProduct | undefined {
  return SUBSCRIPTION_PRODUCTS.find((p) => p.id === productId);
}

export function formatPrice(priceInPence: number): string {
  return `£${(priceInPence / 100).toFixed(2)}`;
}
