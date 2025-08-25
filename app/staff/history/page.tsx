import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { HistoryFilters } from "./history-filters"

export const dynamic = "force-dynamic"

console.log("[v0] Staff History page - File loaded and parsing")

interface HistoryItem {
  id: string
  template_id: string
  assigned_to: string
  status: string
  completed_at: string
  assigned_at: string
  submission_date?: string // For daily checklists
  is_daily_instance?: boolean
  checklist_templates: {
    name: string
    description: string
    frequency: string
    checklist_items: Array<{
      id: string
      name: string
      task_type: string
      is_required: boolean
      validation_rules: any
    }>
  }
}

interface Response {
  id: string
  item_id: string
  notes: string
  completed_at: string
  is_completed: boolean
  photo_url?: string
}

export default async function HistoryPage() {
  console.log("[v0] Staff History page - Component function called")

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    console.log("[v0] Staff History page - No user found, redirecting to login")
    redirect("/auth/login")
  }

  console.log("[v0] Staff History page - User found:", user.id)

  const { data: templateAssignments, error: assignmentsError } = await supabase
    .from("template_assignments")
    .select(`
      *,
      checklist_templates!inner(
        name, 
        description, 
        frequency,
        checklist_items(
          id,
          name,
          task_type,
          is_required,
          validation_rules
        )
      )
    `)
    .eq("assigned_to", user.id)
    .eq("status", "completed")
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(50)

  if (assignmentsError) {
    console.error("[v0] Staff History page - Template assignments error:", assignmentsError)
  }

  const { data: dailyChecklists, error: dailyError } = await supabase
    .from("daily_checklists")
    .select(`
      id,
      template_id,
      assigned_to,
      date,
      status,
      completed_at,
      created_at,
      checklist_templates!inner(
        name, 
        description, 
        frequency,
        checklist_items(
          id,
          name,
          task_type,
          is_required,
          validation_rules
        )
      )
    `)
    .eq("assigned_to", user.id)
    .eq("status", "completed")
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(50)

  if (dailyError) {
    console.error("[v0] Staff History page - Daily checklists error:", dailyError)
  }

  console.log("[v0] Staff History page - Template assignments found:", templateAssignments?.length || 0)
  console.log("[v0] Staff History page - Daily checklists found:", dailyChecklists?.length || 0)

  const allHistoryItems: HistoryItem[] = []

  if (templateAssignments) {
    allHistoryItems.push(
      ...templateAssignments.map((item) => ({
        ...item,
        is_daily_instance: false,
        submission_date: undefined,
      })),
    )
  }

  if (dailyChecklists) {
    allHistoryItems.push(
      ...dailyChecklists.map((item) => ({
        ...item,
        is_daily_instance: true,
        assigned_at: item.created_at,
        submission_date: item.date,
      })),
    )
  }

  allHistoryItems.sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())

  let responses: Response[] = []

  if (allHistoryItems.length > 0) {
    const allTemplateIds = [
      ...(templateAssignments?.map((a) => a.template_id) || []),
      ...(dailyChecklists?.map((d) => d.template_id) || []),
    ]

    if (allTemplateIds.length > 0) {
      const { data: responsesData, error: responsesError } = await supabase
        .from("checklist_responses")
        .select("*")
        .in("checklist_id", allTemplateIds)
        .eq("is_completed", true)
        .limit(500)

      if (responsesError) {
        console.error("[v0] Staff History page - Responses error:", responsesError)
      } else {
        responses = responsesData || []
      }
    }
  }

  console.log("[v0] Staff History page - Total history items:", allHistoryItems.length)
  console.log("[v0] Staff History page - Total responses:", responses.length)

  if (assignmentsError && dailyError) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Report History</h1>
          <p className="text-red-600 mt-2">Error loading report history</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Report History</h1>
        <p className="text-gray-600 mt-2">View your completed reports and download PDFs</p>
      </div>

      <HistoryFilters assignments={allHistoryItems} responses={responses} />
    </div>
  )
}
