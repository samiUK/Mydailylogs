import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export const runtime = "edge"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!cronSecret) {
      console.warn("[v0] CRON_SECRET not set - running without authentication (development mode)")
    }

    const supabase = await createClient()
    const today = new Date().toISOString().split("T")[0]

    console.log(`[v0] Starting daily task recreation for ${today}`)

    const { data: templates, error: templatesError } = await supabase
      .from("checklist_templates")
      .select(`
        *,
        template_assignments!inner(
          id,
          assigned_to,
          profiles!inner(id, organization_id)
        )
      `)
      .eq("is_recurring", true)
      .in("recurrence_type", ["daily", "weekly", "monthly"])

    if (templatesError) {
      console.error("[v0] Error fetching templates:", templatesError)
      return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 })
    }

    let createdTasks = 0
    const errors: string[] = []

    for (const template of templates || []) {
      try {
        const shouldRunToday = await checkIfShouldRunToday(template, today, supabase)

        if (!shouldRunToday) {
          console.log(`[v0] Skipping template ${template.id} - not scheduled for today`)
          continue
        }

        for (const assignment of template.template_assignments) {
          const { data: existingChecklist } = await supabase
            .from("daily_checklists")
            .select("id")
            .eq("template_id", template.id)
            .eq("assigned_to", assignment.assigned_to)
            .eq("date", today)
            .single()

          if (existingChecklist) {
            console.log(
              `[v0] Daily checklist already exists for template ${template.id}, user ${assignment.assigned_to}`,
            )
            continue
          }

          const { error: createError } = await supabase.from("daily_checklists").insert({
            template_id: template.id,
            assigned_to: assignment.assigned_to,
            date: today,
            status: "pending",
            organization_id: assignment.profiles.organization_id,
          })

          if (createError) {
            errors.push(
              `Failed to create task for template ${template.id}, user ${assignment.assigned_to}: ${createError.message}`,
            )
          } else {
            createdTasks++
            console.log(`[v0] Created daily checklist for template ${template.id}, user ${assignment.assigned_to}`)
          }
        }
      } catch (error) {
        errors.push(`Error processing template ${template.id}: ${error}`)
      }
    }

    console.log(`[v0] Daily task recreation completed. Created ${createdTasks} tasks with ${errors.length} errors`)

    return NextResponse.json({
      success: true,
      date: today,
      createdTasks,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error("[v0] Daily task recreation failed:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function checkIfShouldRunToday(template: any, today: string, supabase: any): Promise<boolean> {
  const todayDate = new Date(today)
  const dayOfWeek = todayDate.getDay() // 0 = Sunday, 6 = Saturday

  const { data: holidays } = await supabase
    .from("holidays")
    .select("date")
    .eq("organization_id", template.template_assignments[0]?.profiles?.organization_id)
    .eq("date", today)

  if (holidays && holidays.length > 0) {
    console.log(`[v0] Skipping template ${template.id} - today is a holiday`)
    return false
  }

  const { data: exclusions } = await supabase
    .from("template_schedule_exclusions")
    .select("*")
    .eq("template_id", template.id)

  if (exclusions && exclusions.length > 0) {
    const exclusion = exclusions[0]

    // Check if weekends are excluded
    if (exclusion.exclude_weekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
      console.log(`[v0] Skipping template ${template.id} - weekends excluded`)
      return false
    }

    // Check if today is in excluded dates
    if (exclusion.excluded_dates && exclusion.excluded_dates.includes(today)) {
      console.log(`[v0] Skipping template ${template.id} - today is excluded`)
      return false
    }
  }

  switch (template.recurrence_type) {
    case "daily":
      return true
    case "weekly":
      // Run on the same day of week as created
      const createdDate = new Date(template.created_at)
      return todayDate.getDay() === createdDate.getDay()
    case "monthly":
      // Run on the same date of month as created
      const createdDay = new Date(template.created_at).getDate()
      return todayDate.getDate() === createdDay
    default:
      return false
  }
}
