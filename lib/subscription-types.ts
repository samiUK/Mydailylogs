export type SubscriptionPlan = "growth" | "scale"
export type BillingPeriod = "monthly" | "yearly"

// The 4 subscription types we store in the database
export type SubscriptionType = "growth-monthly" | "growth-yearly" | "scale-monthly" | "scale-yearly"

export function getSubscriptionType(plan: SubscriptionPlan, period: BillingPeriod): SubscriptionType {
  return `${plan}-${period}` as SubscriptionType
}

export function parseSubscriptionType(type: SubscriptionType): {
  plan: SubscriptionPlan
  period: BillingPeriod
} {
  const [plan, period] = type.split("-") as [SubscriptionPlan, BillingPeriod]
  return { plan, period }
}

// Additional functionality can be added here if needed
