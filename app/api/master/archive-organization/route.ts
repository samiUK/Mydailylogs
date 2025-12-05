import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

export async function POST(request: Request) {
  try {
    const { organizationId, archive } = await request.json()

    if (!organizationId || typeof archive !== "boolean") {
      return NextResponse.json({ error: "Invalid request parameters" }, { status: 400 })
    }

    const supabase = createServerClient()

    // Update organization archived status
    const { error } = await supabase
      .from("organizations")
      .update({ is_archived: archive, updated_at: new Date().toISOString() })
      .eq("organization_id", organizationId)

    if (error) {
      console.error("[v0] Error archiving organization:", error)
      return NextResponse.json({ error: "Failed to archive organization" }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: `Organization ${archive ? "archived" : "unarchived"}` })
  } catch (error) {
    console.error("[v0] Archive organization error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
