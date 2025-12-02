import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { checkReportSubmissionLimit, checkCanUploadPhotos } from "@/lib/subscription-limits"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { checklistId, responses, notes } = body

    // Get user profile
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single()

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    const limitCheck = await checkReportSubmissionLimit(profile.organization_id)
    if (!limitCheck.canSubmit) {
      return NextResponse.json(
        {
          error: "Submission limit reached",
          message: limitCheck.message,
          currentCount: limitCheck.currentCount,
          limit: limitCheck.limit,
        },
        { status: 403 },
      )
    }
    // </CHANGE>

    const hasPhotoResponses = responses?.some((r: any) => r.type === "photo" && r.value)

    if (hasPhotoResponses) {
      const photoCheck = await checkCanUploadPhotos(profile.organization_id)
      if (!photoCheck.canUpload) {
        return NextResponse.json(
          {
            error: "Photo upload not available",
            message: photoCheck.reason,
          },
          { status: 403 },
        )
      }
    }
    // </CHANGE>

    // Get template data
    const { data: template } = await supabase.from("checklist_templates").select("*").eq("id", checklistId).single()

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 })
    }

    // Check if this is a recurring template
    if (template.is_recurring || template.schedule_type === "recurring") {
      // For recurring templates, update daily_checklists
      const today = new Date().toISOString().split("T")[0]

      const { error: updateError } = await supabase
        .from("daily_checklists")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("template_id", checklistId)
        .eq("assigned_to", user.id)
        .eq("date", today)

      if (updateError) {
        console.error("[v0] Error updating daily checklist:", updateError)
      }
    } else {
      // For non-recurring templates, update template_assignments
      const { error: updateError } = await supabase
        .from("template_assignments")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("template_id", checklistId)
        .eq("assigned_to", user.id)

      if (updateError) {
        console.error("[v0] Error updating assignment:", updateError)
      }
    }

    // Save responses
    if (responses && responses.length > 0) {
      const responsesToInsert = responses.map((response: any) => ({
        template_id: checklistId,
        task_id: response.taskId,
        user_id: user.id,
        organization_id: profile.organization_id,
        response_type: response.type,
        boolean_response: response.type === "boolean" ? response.value : null,
        text_response: response.type === "text" ? response.value : null,
        number_response: response.type === "number" ? response.value : null,
        photo_url: response.type === "photo" ? response.value : null,
      }))

      const { error: responsesError } = await supabase.from("checklist_responses").insert(responsesToInsert)

      if (responsesError) {
        console.error("[v0] Error saving responses:", responsesError)
      }
    }

    // Create submitted report
    const { error: reportError } = await supabase.from("submitted_reports").insert({
      template_id: checklistId,
      template_name: template.name,
      template_description: template.description,
      submitted_by: user.id,
      organization_id: profile.organization_id,
      report_data: responses,
      notes: notes,
      status: "completed",
      submitted_at: new Date().toISOString(),
    })

    if (reportError) {
      console.error("[v0] Error creating report:", reportError)
      return NextResponse.json({ error: "Failed to create report" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error submitting checklist:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
