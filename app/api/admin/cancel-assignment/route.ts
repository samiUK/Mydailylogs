import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("profiles").select("role, organization_id").eq("id", user.id).single()

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { assignmentId } = await request.json()

    if (!assignmentId) {
      return NextResponse.json({ error: "Assignment ID is required" }, { status: 400 })
    }

    // Cancel the assignment by setting is_active to false
    const { error: updateError } = await supabase
      .from("template_assignments")
      .update({
        is_active: false,
        status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", assignmentId)
      .eq("organization_id", profile.organization_id)

    if (updateError) {
      console.error("[v0] Error cancelling assignment:", updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Assignment cancelled successfully" })
  } catch (error) {
    console.error("[v0] Cancel assignment error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}
