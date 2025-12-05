import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

export type SubscriptionActivityEvent =
  | "created"
  | "upgraded"
  | "downgraded"
  | "cancelled"
  | "renewed"
  | "trial_started"
  | "trial_ended"
  | "payment_failed"
  | "reactivated"
  | "status_changed"

export type TriggeredBy = "customer" | "admin" | "stripe_webhook" | "cron_job" | "system"

interface LogSubscriptionActivityParams {
  organizationId: string
  subscriptionId?: string
  stripeSubscriptionId?: string
  eventType: SubscriptionActivityEvent
  fromPlan?: string
  toPlan: string
  fromStatus?: string
  toStatus: string
  amount?: number
  currency?: string
  triggeredBy: TriggeredBy
  adminEmail?: string
  details?: Record<string, any>
}

export async function logSubscriptionActivity(params: LogSubscriptionActivityParams) {
  try {
    const { error } = await supabase.from("subscription_activity_logs").insert({
      organization_id: params.organizationId,
      subscription_id: params.subscriptionId,
      stripe_subscription_id: params.stripeSubscriptionId,
      event_type: params.eventType,
      from_plan: params.fromPlan,
      to_plan: params.toPlan,
      from_status: params.fromStatus,
      to_status: params.toStatus,
      amount: params.amount,
      currency: params.currency || "usd",
      triggered_by: params.triggeredBy,
      admin_email: params.adminEmail,
      details: params.details || {},
    })

    if (error) {
      console.error("[v0] Failed to log subscription activity:", error)
    }
  } catch (error) {
    console.error("[v0] Error logging subscription activity:", error)
  }
}
