import { createClient } from "@/lib/supabase/server"
import { Card, CardContent } from "@/components/ui/card"
import { HistoryFilters } from "./history-filters"

console.log("[v0] Staff History page - File loaded and parsing")

export default async function HistoryPage() {
  console.log("[v0] Staff History page - Component function called")

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    console.log("[v0] Staff History page - No user found, returning null")
    return null
  }

  console.log("[v0] Staff History page - User found:", user.id)

  // Get user's organization
  const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single()

  if (!profile) {
    console.log("[v0] Staff History page - No profile found, returning null")
    return null
  }

  console.log("[v0] Staff History page - Profile found, organization_id:", profile.organization_id)

  const { data: templateAssignments, error: assignmentsError } = await supabase
    .from("template_assignments")
    .select(`
      id,
      status,
      completed_at,
      assigned_to,
      template_id,
      assigned_at,
      checklist_templates(id, name, description, frequency, checklist_items(*))
    `)
    .eq("assigned_to", user.id)
    .eq("status", "completed")
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(50)

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
      checklist_templates(id, name, description, frequency, checklist_items(*))
    `)
    .eq("assigned_to", user.id)
    .eq("status", "completed")
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(50)

  if (assignmentsError || dailyError) {
    console.log("[v0] Staff History page - Error loading data:", assignmentsError || dailyError)
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Report History</h1>
          <p className="text-red-600 mt-2">Error loading report history</p>
        </div>
      </div>
    )
  }

  const historyItems = []

  if (templateAssignments) {
    historyItems.push(
      ...templateAssignments.map((item) => ({
        ...item,
        is_daily_instance: false,
        submission_date: undefined,
      })),
    )
  }

  if (dailyChecklists) {
    historyItems.push(
      ...dailyChecklists.map((item) => ({
        ...item,
        is_daily_instance: true,
        assigned_at: item.created_at,
        submission_date: item.date,
      })),
    )
  }

  historyItems.sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())

  console.log("[v0] Staff History page - Template assignments:", templateAssignments?.length || 0)
  console.log("[v0] Staff History page - Daily checklists:", dailyChecklists?.length || 0)
  console.log("[v0] Staff History page - Total history items:", historyItems.length)

  let responsesData = []
  if (historyItems.length > 0) {
    const allTemplateIds = [
      ...(templateAssignments?.map((a) => a.template_id) || []),
      ...(dailyChecklists?.map((d) => d.template_id) || []),
    ]

    if (allTemplateIds.length > 0) {
      const { data: responses } = await supabase
        .from("checklist_responses")
        .select("*")
        .in("checklist_id", allTemplateIds)
        .eq("is_completed", true)
        .limit(500)

      responsesData = responses || []
    }
  }

  console.log("[v0] Staff History page - Total responses:", responsesData.length)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Report History</h1>
        <p className="text-muted-foreground mt-2">View your completed reports and download PDFs</p>
      </div>

      {historyItems && historyItems.length > 0 ? (
        <HistoryFilters assignments={historyItems} responses={responsesData} />
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <h3 className="text-lg font-semibold text-foreground mb-2">No completed reports found</h3>
            <p className="text-muted-foreground">Complete some reports to see them here</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
