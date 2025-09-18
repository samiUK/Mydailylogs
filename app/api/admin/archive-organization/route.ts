import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
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

    // For now, we'll add an 'archived_at' timestamp to indicate archival
    // Since the schema doesn't have an archived_at column, we'll use updated_at and a naming convention
    const { error: updateError } = await supabase
      .from("organizations")
      .update({
        organization_name: `[ARCHIVED] ${new Date().toISOString().split("T")[0]} - ` + organizationId.slice(0, 8),
        updated_at: new Date().toISOString(),
      })
      .eq("organization_id", organizationId)

    if (updateError) {
      console.error("Archive organization error:", updateError)
      return NextResponse.json({ error: "Failed to archive organization" }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Organization archived successfully" })
  } catch (error) {
    console.error("Archive organization error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
