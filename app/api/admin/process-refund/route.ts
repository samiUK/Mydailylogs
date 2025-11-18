import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { processRefund } from "@/app/actions/stripe"

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", user.id)
      .single()

    if (!profile || profile.email !== "arsami.uk@gmail.com") {
      const { data: superuser } = await supabase
        .from("superusers")
        .select("role")
        .eq("email", profile?.email || "")
        .single()

      if (!superuser || superuser.role !== "masteradmin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }

    const { paymentId, amount, reason } = await req.json()

    if (!paymentId) {
      return NextResponse.json({ error: "Payment ID required" }, { status: 400 })
    }

    const result = await processRefund(paymentId, amount, reason)

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("[v0] Error processing refund:", error)
    return NextResponse.json(
      { error: error.message || "Failed to process refund" },
      { status: 500 }
    )
  }
}
