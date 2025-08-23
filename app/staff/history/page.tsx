import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { redirect } from "next/navigation"

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
}

export default async function HistoryPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
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
    .limit(50)

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

  const groupedAssignments =
    assignments?.reduce(
      (acc, assignment) => {
        const date = new Date(assignment.completed_at).toDateString()
        if (!acc[date]) {
          acc[date] = []
        }
        acc[date].push(assignment)
        return acc
      },
      {} as Record<string, Assignment[]>,
    ) || {}

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Checklist History</h1>
        <p className="text-gray-600 mt-2">View your completed checklists and tasks</p>
      </div>

      {/* History */}
      {Object.keys(groupedAssignments).length > 0 ? (
        <div className="space-y-8">
          {Object.entries(groupedAssignments).map(([date, assignments]) => (
            <div key={date}>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                {new Date(date).toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {assignments.map((assignment) => (
                  <Card key={assignment.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{assignment.checklist_templates?.name}</CardTitle>
                          <CardDescription>{assignment.checklist_templates?.description}</CardDescription>
                        </div>
                        <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
                          Completed
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm text-gray-600 mb-6">
                        <p>
                          Completed:{" "}
                          {new Date(assignment.completed_at).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: true,
                          })}
                        </p>
                        <p>
                          Assigned:{" "}
                          {new Date(assignment.assigned_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                        {assignment.checklist_templates?.frequency && (
                          <p>Frequency: {assignment.checklist_templates.frequency}</p>
                        )}
                      </div>

                      <div className="space-y-4">
                        <h4 className="font-medium text-gray-900 mb-3">Completed Tasks</h4>
                        {assignment.checklist_templates?.checklist_items?.map((task) => {
                          const taskResponse = responses.find((r) => r.item_id === task.id)
                          return (
                            <div key={task.id} className="bg-gray-50 p-4 rounded-lg opacity-75">
                              <div className="flex items-start justify-between mb-2">
                                <h5 className="font-medium text-gray-700">{task.name}</h5>{" "}
                                {/* Changed from task.title to task.name */}
                                <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                                  ✓ Completed
                                </Badge>
                              </div>

                              {/* Display response based on task type */}
                              <div className="text-sm text-gray-600 mt-2">
                                {task.task_type === "boolean" && (
                                  <p className="font-medium">
                                    Response: <span className="text-gray-800">Yes</span>
                                  </p>
                                )}
                                {task.task_type === "text" && taskResponse?.notes && (
                                  <p className="font-medium">
                                    Response: <span className="text-gray-800">{taskResponse.notes}</span>
                                  </p>
                                )}
                                {task.task_type === "number" && taskResponse?.notes && (
                                  <p className="font-medium">
                                    Value: <span className="text-gray-800">{taskResponse.notes}</span>
                                  </p>
                                )}
                                {task.task_type === "photo" && (
                                  <p className="font-medium text-blue-600">📷 Photo uploaded</p>
                                )}
                                {task.task_type === "options" && taskResponse?.notes && (
                                  <p className="font-medium">
                                    Selected: <span className="text-gray-800">{taskResponse.notes}</span>
                                  </p>
                                )}

                                {/* Show completion timestamp */}
                                {taskResponse?.completed_at && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    Completed: {new Date(taskResponse.completed_at).toLocaleString()}
                                  </p>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No completed tasks yet</h3>
            <p className="text-gray-600">Your completed checklists will appear here once you finish them</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
