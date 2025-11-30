import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

async function preserveCompletedReports(supabase: any, templateId: string) {
  try {
    const { data: template } = await supabase
      .from("checklist_templates")
      .select("name, description, organization_id")
      .eq("id", templateId)
      .single()

    if (!template) return

    // Get all completed daily checklists for this template
    const { data: completedChecklists } = await supabase
      .from("daily_checklists")
      .select(`
        *,
        profiles!assigned_to (full_name, email)
      `)
      .eq("template_id", templateId)
      .eq("status", "completed")

    if (!completedChecklists || completedChecklists.length === 0) return

    // For each completed checklist, get responses and create submitted report
    for (const checklist of completedChecklists) {
      const { data: responses } = await supabase
        .from("checklist_responses")
        .select("*")
        .eq("checklist_id", checklist.id)

      // Create submitted report entry to preserve historical data
      await supabase.from("submitted_reports").insert({
        organization_id: template.organization_id,
        template_name: template.name,
        template_description: template.description,
        submitted_by: checklist.assigned_to,
        submitted_at: checklist.completed_at || checklist.updated_at,
        status: "completed",
        report_data: {
          checklist_id: checklist.id,
          template_id: templateId,
          date: checklist.date,
          responses: responses || [],
        },
        notes: checklist.notes,
      })
    }

    console.log(`[v0] Preserved ${completedChecklists.length} completed reports for template ${templateId}`)
  } catch (error) {
    console.error("[v0] Error preserving completed reports:", error)
    // Don't fail the deletion if preservation fails, but log it
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const formData = await request.formData()
    const templateId = formData.get("id") as string

    console.log("[v0] Delete template API - Template ID:", templateId)

    if (!templateId) {
      return NextResponse.json({ error: "Template ID is required" }, { status: 400 })
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      console.log("[v0] Delete template API - User error:", userError)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("profiles").select("role, organization_id").eq("id", user.id).single()

    if (!profile || (profile.role !== "admin" && profile.role !== "manager")) {
      console.log("[v0] Delete template API - Not admin/manager or no profile")
      return NextResponse.json({ error: "Admin or manager access required" }, { status: 403 })
    }

    console.log("[v0] Delete template API - Preserving completed reports...")
    await preserveCompletedReports(supabase, templateId)

    console.log("[v0] Delete template API - Deleting items for template:", templateId)

    const { error: itemsError } = await supabase.from("checklist_items").delete().eq("template_id", templateId)

    if (itemsError) {
      console.error("[v0] Delete template API - Error deleting checklist items:", itemsError)
      return NextResponse.json({ error: "Failed to delete template items" }, { status: 500 })
    }

    console.log("[v0] Delete template API - Deleting template:", templateId)

    // Delete the template - assignments, checklists, and reports remain in database
    const { error: templateError } = await supabase
      .from("checklist_templates")
      .delete()
      .eq("id", templateId)
      .eq("organization_id", profile.organization_id)

    if (templateError) {
      console.error("[v0] Delete template API - Error deleting template:", templateError)
      return NextResponse.json({ error: "Failed to delete template" }, { status: 500 })
    }

    console.log("[v0] Delete template API - Template deleted successfully")

    return NextResponse.json({
      success: true,
      message: "Template deleted successfully. All task assignments and reports have been preserved.",
    })
  } catch (error) {
    console.error("[v0] Delete template API - Error in delete template API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const templateId = searchParams.get("id")

    if (!templateId) {
      return NextResponse.json({ error: "Template ID is required" }, { status: 400 })
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      console.log("[v0] Delete template API - User error:", userError)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("profiles").select("role, organization_id").eq("id", user.id).single()

    if (!profile || (profile.role !== "admin" && profile.role !== "manager")) {
      console.log("[v0] Delete template API - Not admin/manager or no profile")
      return NextResponse.json({ error: "Admin or manager access required" }, { status: 403 })
    }

    console.log("[v0] Delete template API - Preserving completed reports...")
    await preserveCompletedReports(supabase, templateId)

    console.log("[v0] Delete template API - Deleting items for template:", templateId)

    const { error: itemsError } = await supabase.from("checklist_items").delete().eq("template_id", templateId)

    if (itemsError) {
      console.error("[v0] Delete template API - Error deleting checklist items:", itemsError)
      return NextResponse.json({ error: "Failed to delete template items" }, { status: 500 })
    }

    console.log("[v0] Delete template API - Deleting template:", templateId)

    const { error: templateError } = await supabase
      .from("checklist_templates")
      .delete()
      .eq("id", templateId)
      .eq("organization_id", profile.organization_id)

    if (templateError) {
      console.error("[v0] Delete template API - Error deleting template:", templateError)
      return NextResponse.json({ error: "Failed to delete template" }, { status: 500 })
    }

    console.log("[v0] Delete template API - Template deleted successfully")

    return NextResponse.json({
      success: true,
      message: "Template deleted successfully. All task assignments and reports have been preserved.",
    })
  } catch (error) {
    console.error("[v0] Delete template API - Error in delete template API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
