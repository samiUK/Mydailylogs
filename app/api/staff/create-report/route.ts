import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  console.log("[v0] Create Report API - Request received")

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    console.log("[v0] Create Report API - No user found")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { templateId } = await request.json()
    console.log("[v0] Create Report API - Template ID:", templateId)

    const { data: profile } = await supabase.from("profiles").select("id, organization_id").eq("id", user.id).single()

    if (!profile) {
      console.log("[v0] Create Report API - Profile not found")
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    console.log("[v0] Create Report API - Profile ID:", profile.id)

    // Get template details
    const { data: template, error: templateError } = await supabase
      .from("checklist_templates")
      .select("*")
      .eq("id", templateId)
      .single()

    if (templateError || !template) {
      console.log("[v0] Create Report API - Template error:", templateError)
      return NextResponse.json({ error: "Template not found or not assigned to you" }, { status: 404 })
    }

    console.log("[v0] Create Report API - Template found:", template.name)

    // Check if template is daily recurring
    if (template.is_recurring && template.recurrence_type === "daily") {
      // Create daily checklist instance
      const today = new Date().toISOString().split("T")[0]

      // Check if daily checklist already exists for today
      const { data: existingDaily } = await supabase
        .from("daily_checklists")
        .select("id")
        .eq("template_id", templateId)
        .eq("assigned_to", profile.id)
        .eq("date", today)
        .single()

      if (existingDaily) {
        console.log("[v0] Create Report API - Daily checklist already exists for today")
        return NextResponse.json({
          reportId: existingDaily.id,
          message: "A new Log has been added to your Staff Dashboard",
          type: "daily",
        })
      }

      const { data: dailyChecklist, error: dailyError } = await supabase
        .from("daily_checklists")
        .insert({
          template_id: templateId,
          assigned_to: profile.id,
          date: today,
          status: "pending",
        })
        .select()
        .single()

      if (dailyError) {
        console.log("[v0] Create Report API - Daily checklist creation error:", dailyError)
        return NextResponse.json({ error: "Failed to create daily report" }, { status: 500 })
      }

      console.log("[v0] Create Report API - Daily checklist created:", dailyChecklist.id)
      return NextResponse.json({
        reportId: dailyChecklist.id,
        message: "A new Log has been added to your Staff Dashboard",
        type: "daily",
      })
    } else {
      const { data: assignment, error: assignmentError } = await supabase
        .from("template_assignments")
        .insert({
          template_id: templateId,
          assigned_to: profile.id,
          assigned_by: profile.id, // Self-assigned
          status: "pending",
        })
        .select()
        .single()

      if (assignmentError) {
        console.log("[v0] Create Report API - Assignment creation error:", assignmentError)
        return NextResponse.json({ error: "Failed to create report" }, { status: 500 })
      }

      console.log("[v0] Create Report API - Assignment created:", assignment.id)
      return NextResponse.json({
        reportId: assignment.id,
        message: "A new Log has been added to your Staff Dashboard",
        type: "regular",
      })
    }
  } catch (error) {
    console.log("[v0] Create Report API - Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
