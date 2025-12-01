import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { getSubscriptionLimits } from "@/lib/subscription-limits"

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: "Template ID is required" }, { status: 400 })
    }

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user profile
    const { data: profile } = await supabase.from("profiles").select("organization_id, role").eq("id", user.id).single()

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    // Check authorization
    if (profile.role !== "admin" && profile.role !== "manager") {
      return NextResponse.json({ error: "Only admins and managers can update templates" }, { status: 403 })
    }

    // Verify template belongs to user's organization
    const { data: existingTemplate } = await supabase
      .from("checklist_templates")
      .select("organization_id")
      .eq("id", id)
      .single()

    if (!existingTemplate || existingTemplate.organization_id !== profile.organization_id) {
      return NextResponse.json({ error: "Template not found or access denied" }, { status: 404 })
    }

    const limits = await getSubscriptionLimits(profile.organization_id)
    const { schedule_type, is_recurring } = updates

    if (schedule_type === "recurring" || is_recurring) {
      if (!limits.hasTaskAutomation) {
        return NextResponse.json(
          {
            error: "Task automation not available",
            message:
              "Your current plan does not include recurring task automation. Upgrade to Growth or Scale to access this feature.",
          },
          { status: 403 },
        )
      }
    }
    // </CHANGE>

    if (schedule_type === "multi_day" && updates.scheduled_dates) {
      if (limits.planName === "Starter") {
        const maxDate = new Date()
        maxDate.setDate(maxDate.getDate() + 30)

        const invalidDates = updates.scheduled_dates.filter((date: string) => {
          return new Date(date) > maxDate
        })

        if (invalidDates.length > 0) {
          return NextResponse.json(
            {
              error: "Multi-day date limit exceeded",
              message:
                "Starter plan can only schedule multi-day dates within 30 days. Upgrade to Growth or Scale for unlimited scheduling.",
            },
            { status: 403 },
          )
        }
      }
    }
    // </CHANGE>

    // Update the template
    const { data: template, error: updateError } = await supabase
      .from("checklist_templates")
      .update(updates)
      .eq("id", id)
      .eq("organization_id", profile.organization_id)
      .select()
      .single()

    if (updateError) {
      console.error("[v0] Error updating template:", updateError)
      return NextResponse.json({ error: "Failed to update template", details: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, template })
  } catch (error) {
    console.error("[v0] Error in update template API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
