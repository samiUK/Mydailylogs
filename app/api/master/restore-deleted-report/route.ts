import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { reportId } = await request.json()

    if (!reportId) {
      return NextResponse.json({ error: "Missing report ID" }, { status: 400 })
    }

    // Verify master admin access
    const masterAdminPassword = request.headers.get("x-master-admin-password")
    if (masterAdminPassword !== process.env.MASTER_ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized - Master admin access required" }, { status: 401 })
    }

    // Restore the submitted report
    const { error: reportError } = await supabase
      .from("submitted_reports")
      .update({
        deleted_at: null,
        deleted_by: null,
        status: "completed",
      })
      .eq("id", reportId)

    if (reportError) throw reportError

    // Get assignment_id to restore the assignment
    const { data: report } = await supabase
      .from("submitted_reports")
      .select("assignment_id")
      .eq("id", reportId)
      .single()

    if (report?.assignment_id) {
      // Restore the assignment
      const { error: assignmentError } = await supabase
        .from("template_assignments")
        .update({ is_active: true, status: "completed" })
        .eq("id", report.assignment_id)

      if (assignmentError) throw assignmentError
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error restoring report:", error)
    return NextResponse.json({ error: "Failed to restore report" }, { status: 500 })
  }
}
