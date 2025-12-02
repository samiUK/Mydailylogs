import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { checkReportSubmissionLimit } from "@/lib/subscription-limits"

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

    // Check report submission limit
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

    // Continue with existing submission logic...
    // (rest of the submission code)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error submitting checklist:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
