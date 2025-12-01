import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { checkCanCreateTemplate, getSubscriptionLimits } from "@/lib/subscription-limits"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

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
      return NextResponse.json({ error: "Only admins and managers can create templates" }, { status: 403 })
    }

    const templateCheck = await checkCanCreateTemplate(profile.organization_id)
    if (!templateCheck.canCreate) {
      return NextResponse.json(
        {
          error: "Template limit reached",
          message: templateCheck.reason,
          currentCount: templateCheck.currentCount,
          maxAllowed: templateCheck.maxAllowed,
        },
        { status: 403 },
      )
    }
    // </CHANGE>

    const limits = await getSubscriptionLimits(profile.organization_id)
    const { schedule_type, is_recurring, recurrence_type } = body

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

    if (schedule_type === "multi_day" && body.scheduled_dates) {
      if (limits.planName === "Starter") {
        const maxDate = new Date()
        maxDate.setDate(maxDate.getDate() + 30)

        const invalidDates = body.scheduled_dates.filter((date: string) => {
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

    // Create the template
    const { data: template, error: insertError } = await supabase
      .from("checklist_templates")
      .insert({
        ...body,
        organization_id: profile.organization_id,
        created_by: user.id,
      })
      .select()
      .single()

    if (insertError) {
      console.error("[v0] Error creating template:", insertError)
      return NextResponse.json({ error: "Failed to create template", details: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, template })
  } catch (error) {
    console.error("[v0] Error in create template API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
