import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const templateId = searchParams.get("id")

    if (!templateId) {
      return NextResponse.json({ error: "Template ID is required" }, { status: 400 })
    }

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify user is admin
    const { data: profile } = await supabase.from("profiles").select("role, organization_id").eq("id", user.id).single()

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    // Delete associated checklist items first (due to foreign key constraints)
    const { error: itemsError } = await supabase.from("checklist_items").delete().eq("template_id", templateId)

    if (itemsError) {
      console.error("Error deleting checklist items:", itemsError)
      return NextResponse.json({ error: "Failed to delete template items" }, { status: 500 })
    }

    // Delete the template
    const { error: templateError } = await supabase
      .from("checklist_templates")
      .delete()
      .eq("id", templateId)
      .eq("organization_id", profile.organization_id) // Ensure user can only delete templates from their org

    if (templateError) {
      console.error("Error deleting template:", templateError)
      return NextResponse.json({ error: "Failed to delete template" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in delete template API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
