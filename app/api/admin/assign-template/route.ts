import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { templateId, memberIds } = await request.json()

    if (!templateId || !memberIds || !Array.isArray(memberIds)) {
      return NextResponse.json({ error: "Template ID and member IDs are required" }, { status: 400 })
    }

    const supabase = await createClient()

    // Verify user is admin
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("profiles").select("role, organization_id").eq("id", user.id).single()

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const { data: existingAssignments } = await supabase
      .from("template_assignments")
      .select("assigned_to")
      .eq("template_id", templateId)
      .in("assigned_to", memberIds)

    const existingMemberIds = existingAssignments?.map((a) => a.assigned_to) || []
    const newMemberIds = memberIds.filter((id: string) => !existingMemberIds.includes(id))

    if (newMemberIds.length === 0) {
      return NextResponse.json({ success: true, message: "All members already assigned" })
    }

    // Create assignments for new members only
    const assignments = newMemberIds.map((memberId: string) => ({
      template_id: templateId,
      assigned_to: memberId,
      assigned_by: user.id,
      organization_id: profile.organization_id,
      assigned_at: new Date().toISOString(),
      is_active: true,
    }))

    const { error } = await supabase.from("template_assignments").insert(assignments)

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Failed to assign template" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error assigning template:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
