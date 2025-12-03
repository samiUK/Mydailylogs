import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const reportId = searchParams.get("id")
    const reportType = searchParams.get("type")

    if (!reportId || !reportType) {
      return NextResponse.json({ error: "Missing report ID or type" }, { status: 400 })
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("profiles").select("organization_id, role").eq("id", user.id).single()

    if (!profile || (profile.role !== "admin" && profile.role !== "manager")) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("plan_name")
      .eq("organization_id", profile.organization_id)
      .single()

    const isScalePlan = subscription?.plan_name === "scale"

    if (isScalePlan && reportType === "assignment") {
      const { error } = await supabase
        .from("submitted_reports")
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: user.id,
          status: "deleted",
        })
        .eq("assignment_id", reportId)
        .eq("organization_id", profile.organization_id)

      if (error) throw error

      // Also mark assignment as inactive
      const { error: assignmentError } = await supabase
        .from("template_assignments")
        .update({ is_active: false, status: "deleted" })
        .eq("id", reportId)
        .eq("organization_id", profile.organization_id)

      if (assignmentError) throw assignmentError

      return NextResponse.json({ success: true, recoverable: true })
    }

    if (reportType === "assignment") {
      const { error } = await supabase
        .from("template_assignments")
        .update({ is_active: false, status: "deleted" })
        .eq("id", reportId)
        .eq("organization_id", profile.organization_id)

      if (error) throw error
    } else if (reportType === "daily") {
      const { error } = await supabase
        .from("daily_checklists")
        .delete()
        .eq("id", reportId)
        .eq("organization_id", profile.organization_id)

      if (error) throw error
    }

    // Delete associated responses for non-Scale plans
    const { error: responsesError } = await supabase.from("checklist_responses").delete().eq("assignment_id", reportId)

    if (responsesError) console.error("Error deleting responses:", responsesError)

    // Delete from submitted_reports for non-Scale plans
    const { error: submittedError } = await supabase.from("submitted_reports").delete().eq("assignment_id", reportId)

    if (submittedError) console.error("Error deleting submitted report:", submittedError)

    return NextResponse.json({ success: true, recoverable: false })
  } catch (error) {
    console.error("Error deleting report:", error)
    return NextResponse.json({ error: "Failed to delete report" }, { status: 500 })
  }
}
