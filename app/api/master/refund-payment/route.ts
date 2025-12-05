import { type NextRequest, NextResponse } from "next/server"
import { getMasterAuthPayload } from "@/lib/master-auth-jwt"
import { createClient } from "@supabase/supabase-js"
import { processRefund } from "@/app/actions/stripe"
import { logSubscriptionActivity } from "@/lib/subscription-activity-logger"

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(req: NextRequest) {
  try {
    const masterAuth = getMasterAuthPayload(req)
    if (!masterAuth) {
      return NextResponse.json({ error: "Unauthorized - Master admin access required" }, { status: 403 })
    }

    const { paymentId, amount, reason } = await req.json()

    if (!paymentId) {
      return NextResponse.json({ error: "Payment ID is required" }, { status: 400 })
    }

    const { data: payment } = await supabaseAdmin
      .from("payments")
      .select("*, subscriptions(organization_id, organizations(name))")
      .eq("id", paymentId)
      .single()

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 })
    }

    if (payment.status === "refunded") {
      return NextResponse.json({ error: "Payment already refunded" }, { status: 400 })
    }

    const result = await processRefund(paymentId, amount, reason)

    if (!result.success) {
      return NextResponse.json({ error: "Failed to process refund" }, { status: 500 })
    }

    const refundAmount = amount || payment.amount / 100
    const refundType = amount ? "partial" : "full"

    await logSubscriptionActivity({
      subscription_id: payment.subscription_id,
      organization_id: payment.subscriptions.organization_id,
      activity_type: "refund_processed",
      old_value: null,
      new_value: null,
      metadata: {
        payment_id: paymentId,
        refund_amount: refundAmount,
        refund_type: refundType,
        reason: reason || "No reason provided",
        refund_id: result.refund.id,
        initiated_by: masterAuth.email,
      },
    })

    console.log(
      `[v0] Master admin ${masterAuth.email} processed ${refundType} refund of $${refundAmount} for payment ${paymentId}`,
    )

    return NextResponse.json({
      success: true,
      refund: result.refund,
      refundAmount,
      refundType,
    })
  } catch (error: any) {
    console.error("[v0] Error processing refund:", error)
    return NextResponse.json({ error: error.message || "Failed to process refund" }, { status: 500 })
  }
}
