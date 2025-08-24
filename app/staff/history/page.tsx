import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { HistoryFilters } from "./history-filters"

console.log("[v0] Staff History page - File loaded and parsing")

interface Assignment {
  id: string
  template_id: string
  assigned_to: string
  status: string
  completed_at: string
  assigned_at: string
  checklist_templates: {
    name: string
    description: string
    frequency: string
    checklist_items: Array<{
      id: string
      name: string // Changed from title to name to match database schema
      task_type: string
      is_required: boolean
      validation_rules: any // Fixed column name
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

  console.log("[v0] History page - User ID:", user.id)

  const { data: assignments, error: assignmentsError } = await supabase
    .from("template_assignments")
    .select(`
      *,
      checklist_templates(
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

  console.log("[v0] History page - Assignments query error:", assignmentsError)
  console.log("[v0] History page - Assignments found:", assignments?.length || 0)
  console.log("[v0] History page - Assignments data:", assignments)

  let responses: Response[] = []

  if (assignments && assignments.length > 0) {
    const templateIds = assignments.map((a) => a.template_id)
    const { data: responsesData, error: responsesError } = await supabase
      .from("checklist_responses")
      .select("*")
      .in("checklist_id", templateIds)
      .eq("is_completed", true)

    console.log("[v0] History page - Responses query error:", responsesError)
    console.log("[v0] History page - Responses found:", responsesData?.length || 0)

    if (responsesData) {
      responses = responsesData
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Report History</h1>
        <p className="text-gray-600 mt-2">View your completed reports and download PDFs</p>
      </div>

      <HistoryFilters assignments={assignments || []} responses={responses} />
    </div>
  )
}
