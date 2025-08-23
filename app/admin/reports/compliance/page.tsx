import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default async function ComplianceReportPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  // Get user's organization
  const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single()

  // Get compliance data for the last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const { data: checklists } = await supabase
    .from("daily_checklists")
    .select(
      `
      *,
      checklist_templates(name, description),
      profiles!daily_checklists_assigned_to_fkey(full_name)
    `,
    )
    .eq("organization_id", profile?.organization_id)
    .gte("date", thirtyDaysAgo.toISOString().split("T")[0])
    .order("date", { ascending: false })

  // Get checklist responses for completed checklists
  const completedChecklistIds = checklists?.filter((c) => c.status === "completed").map((c) => c.id) || []

  const { data: responses } = await supabase
    .from("checklist_responses")
    .select("*, checklist_items(title, is_required)")
    .in("checklist_id", completedChecklistIds)

  // Calculate compliance metrics
  const totalChecklists = checklists?.length || 0
  const completedChecklists = checklists?.filter((c) => c.status === "completed").length || 0
  const overduePending = checklists?.filter((c) => c.status === "pending" && new Date(c.date) < new Date()).length || 0

  // Group by template
  const templateStats = checklists?.reduce(
    (acc, checklist) => {
      const templateName = checklist.checklist_templates?.name || "Unknown"
      if (!acc[templateName]) {
        acc[templateName] = { total: 0, completed: 0, pending: 0, overdue: 0 }
      }
      acc[templateName].total++
      if (checklist.status === "completed") {
        acc[templateName].completed++
      } else if (checklist.status === "pending") {
        if (new Date(checklist.date) < new Date()) {
          acc[templateName].overdue++
        } else {
          acc[templateName].pending++
        }
      }
      return acc
    },
    {} as Record<string, { total: number; completed: number; pending: number; overdue: number }>,
  )

  // Calculate item completion rates
  const itemStats = responses?.reduce(
    (acc, response) => {
      const itemTitle = response.checklist_items?.title || "Unknown"
      const isRequired = response.checklist_items?.is_required || false
      if (!acc[itemTitle]) {
        acc[itemTitle] = { total: 0, completed: 0, isRequired }
      }
      acc[itemTitle].total++
      if (response.is_completed) {
        acc[itemTitle].completed++
      }
      return acc
    },
    {} as Record<string, { total: number; completed: number; isRequired: boolean }>,
  )

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Compliance Report</h1>
          <p className="text-gray-600 mt-2">30-day compliance overview and detailed analysis</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Export PDF</Button>
          <Link href="/admin/reports">
            <Button variant="outline">Back to Reports</Button>
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Compliance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalChecklists > 0 ? Math.round((completedChecklists / totalChecklists) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {completedChecklists} of {totalChecklists} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completedChecklists}</div>
            <p className="text-xs text-muted-foreground">Checklists completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overduePending}</div>
            <p className="text-xs text-muted-foreground">Past due date</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {checklists?.filter((c) => c.status === "in_progress").length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>
      </div>

      {/* Template Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Template Performance</CardTitle>
          <CardDescription>Completion rates by checklist template</CardDescription>
        </CardHeader>
        <CardContent>
          {templateStats && Object.keys(templateStats).length > 0 ? (
            <div className="space-y-4">
              {Object.entries(templateStats).map(([templateName, stats]) => {
                const rate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0
                return (
                  <div key={templateName} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold">{templateName}</h4>
                      <Badge variant={rate >= 80 ? "default" : rate >= 60 ? "secondary" : "destructive"}>
                        {rate}% Complete
                      </Badge>
                    </div>
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Total:</span> {stats.total}
                      </div>
                      <div>
                        <span className="text-green-600">Completed:</span> {stats.completed}
                      </div>
                      <div>
                        <span className="text-yellow-600">Pending:</span> {stats.pending}
                      </div>
                      <div>
                        <span className="text-red-600">Overdue:</span> {stats.overdue}
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                      <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${rate}%` }}></div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-gray-500">No template data available</p>
          )}
        </CardContent>
      </Card>

      {/* Item Completion Analysis */}
      {itemStats && Object.keys(itemStats).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Item Completion Analysis</CardTitle>
            <CardDescription>Individual checklist item performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(itemStats)
                .sort(([, a], [, b]) => {
                  const rateA = a.total > 0 ? a.completed / a.total : 0
                  const rateB = b.total > 0 ? b.completed / b.total : 0
                  return rateB - rateA
                })
                .map(([itemTitle, stats]) => {
                  const rate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0
                  return (
                    <div key={itemTitle} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{itemTitle}</span>
                        {stats.isRequired && <Badge variant="destructive">Required</Badge>}
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-600">
                          {stats.completed}/{stats.total}
                        </span>
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${rate}%` }}></div>
                        </div>
                        <span className="text-sm font-medium w-12">{rate}%</span>
                      </div>
                    </div>
                  )
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest checklist completions and updates</CardDescription>
        </CardHeader>
        <CardContent>
          {checklists && checklists.length > 0 ? (
            <div className="space-y-3">
              {checklists.slice(0, 10).map((checklist) => (
                <div key={checklist.id} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <h4 className="font-medium">{checklist.checklist_templates?.name}</h4>
                    <p className="text-sm text-gray-600">
                      Assigned to: {checklist.profiles?.full_name} • Date: {checklist.date}
                    </p>
                  </div>
                  <Badge
                    variant={
                      checklist.status === "completed"
                        ? "default"
                        : checklist.status === "in_progress"
                          ? "secondary"
                          : "outline"
                    }
                    className={
                      checklist.status === "completed"
                        ? "bg-green-100 text-green-800 hover:bg-green-100"
                        : checklist.status === "in_progress"
                          ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                          : new Date(checklist.date) < new Date()
                            ? "bg-red-100 text-red-800 hover:bg-red-100"
                            : ""
                    }
                  >
                    {checklist.status === "completed"
                      ? "Completed"
                      : checklist.status === "in_progress"
                        ? "In Progress"
                        : new Date(checklist.date) < new Date()
                          ? "Overdue"
                          : "Pending"}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No recent activity</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
