import { NextResponse } from "next/server"
import { createAdminServerClient } from "@/lib/supabase-server"

export async function DELETE(request: Request) {
  try {
    const { organizationId } = await request.json()

    if (!organizationId) {
      return NextResponse.json({ error: "Organization ID required" }, { status: 400 })
    }

    const supabase = createAdminServerClient()

    // Get all users in the organization
    const { data: profiles } = await supabase.from("profiles").select("id").eq("organization_id", organizationId)

    const userIds = profiles?.map((p) => p.id) || []

    // Delete auth users (this will cascade delete profiles due to FK constraints)
    for (const userId of userIds) {
      await supabase.auth.admin.deleteUser(userId)
    }

    // Delete organization (cascades to most tables via FK)
    const { error } = await supabase.from("organizations").delete().eq("organization_id", organizationId)

    if (error) {
      console.error("[v0] Error deleting organization:", error)
      return NextResponse.json({ error: "Failed to delete organization" }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Organization and all related data deleted" })
  } catch (error) {
    console.error("[v0] Delete organization error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
