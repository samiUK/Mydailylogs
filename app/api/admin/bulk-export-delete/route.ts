import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient()
    const adminSupabase = createAdminClient()

    // Check authentication
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user profile and verify admin role
    const { data: profile } = await supabase.from("profiles").select("role, organization_id").eq("id", user.id).single()

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 403 })
    }

    const { reportIds, exportBeforeDelete } = await request.json()

    if (!reportIds || !Array.isArray(reportIds) || reportIds.length === 0) {
      return NextResponse.json({ error: "No report IDs provided" }, { status: 400 })
    }

    // Fetch reports with full data
    const { data: reports, error: reportsError } = await supabase
      .from("submitted_reports")
      .select("*")
      .in("id", reportIds)
      .eq("organization_id", profile.organization_id)

    if (reportsError || !reports) {
      return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 })
    }

    let exportedData = null

    if (exportBeforeDelete) {
      exportedData = {
        exportDate: new Date().toISOString(),
        organizationId: profile.organization_id,
        reportCount: reports.length,
        reports: reports.map((report) => ({
          id: report.id,
          templateName: report.template_name,
          assigneeName: report.assignee_name,
          submittedAt: report.submitted_at,
          assignedDate: report.assigned_date,
          status: report.status,
          reportData: report.report_data,
          photos: extractPhotosFromReport(report),
        })),
      }
    }

    let deletedPhotosCount = 0
    for (const report of reports) {
      if (report.report_data?.responses) {
        for (const response of report.report_data.responses) {
          if (response.type === "photo" && response.value) {
            try {
              const photoData = JSON.parse(response.value)
              if (Array.isArray(photoData)) {
                for (const photo of photoData) {
                  if (photo.url) {
                    const urlParts = photo.url.split("/report-photos/")
                    if (urlParts.length > 1) {
                      const filePath = urlParts[1]
                      const { error: storageError } = await adminSupabase.storage
                        .from("report-photos")
                        .remove([filePath])
                      if (!storageError) {
                        deletedPhotosCount++
                      }
                    }
                  }
                }
              }
            } catch (err) {
              console.error("[v0] Error deleting photo:", err)
            }
          }
        }
      }
    }

    // Delete report records from database
    const { error: deleteError } = await supabase
      .from("submitted_reports")
      .delete()
      .in("id", reportIds)
      .eq("organization_id", profile.organization_id)

    if (deleteError) {
      return NextResponse.json({ error: "Failed to delete reports" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      deletedCount: reports.length,
      deletedPhotosCount,
      exportedData,
    })
  } catch (error) {
    console.error("[v0] Bulk export/delete error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

function extractPhotosFromReport(report: any): string[] {
  const photos: string[] = []
  if (report.report_data?.responses) {
    for (const response of report.report_data.responses) {
      if (response.type === "photo" && response.value) {
        try {
          const photoData = JSON.parse(response.value)
          if (Array.isArray(photoData)) {
            photos.push(...photoData.map((p: any) => p.url).filter(Boolean))
          }
        } catch (err) {
          // Skip invalid photo data
        }
      }
    }
  }
  return photos
}
