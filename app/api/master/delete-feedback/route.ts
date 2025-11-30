import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/admin"

export async function POST(request: Request) {
  try {
    const cookieHeader = request.headers.get("cookie") || ""
    const isMasterAdmin = cookieHeader.includes("masterAdminImpersonation=true")

    if (!isMasterAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { feedbackId } = await request.json()

    if (!feedbackId) {
      return NextResponse.json({ error: "Feedback ID required" }, { status: 400 })
    }

    const supabase = createClient()
    const { error } = await supabase.from("feedback").delete().eq("id", feedbackId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[v0] Delete feedback error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
