import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function DELETE(request: NextRequest) {
  try {
    const { organizationId } = await request.json()

    if (!organizationId) {
      return NextResponse.json({ error: "Organization ID is required" }, { status: 400 })
    }

    const supabase = await createClient()

    // Check if user is authenticated and is a superuser
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is a superuser
    const { data: superuser } = await supabase
      .from("superusers")
      .select("*")
      .eq("email", user.email)
      .eq("is_active", true)
      .single()

    if (!superuser) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    // Delete organization (this will cascade to related records)
    const { error: deleteError } = await supabase.from("organizations").delete().eq("organization_id", organizationId)

    if (deleteError) {
      console.error("Delete organization error:", deleteError)
      return NextResponse.json({ error: "Failed to delete organization" }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Organization deleted successfully" })
  } catch (error) {
    console.error("Delete organization error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
