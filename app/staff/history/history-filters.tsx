"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Eye, Search, Calendar } from "lucide-react"
import { PDFDownloadButton } from "./pdf-download-button"

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
      name: string
      task_type: string
      is_required: boolean
      validation_rules: any
    }>
  }
  is_daily_instance?: boolean
  submission_date?: string
}

interface Response {
  id: string
  item_id: string
  notes: string
  completed_at: string
  is_completed: boolean
  photo_url?: string
}

interface HistoryFiltersProps {
  assignments: Assignment[]
  responses: Response[]
}

export function HistoryFilters({ assignments, responses }: HistoryFiltersProps) {
  const [filteredAssignments, setFilteredAssignments] = useState<Assignment[]>(assignments)
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest")
  const [dateFilter, setDateFilter] = useState("")
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    let filtered = [...assignments]

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter((assignment) =>
        assignment.checklist_templates?.name?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Apply date filter
    if (dateFilter) {
      const filterDate = new Date(dateFilter)
      filtered = filtered.filter((assignment) => {
        const assignmentDate = new Date(assignment.completed_at)
        return assignmentDate.toDateString() === filterDate.toDateString()
      })
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const dateA = new Date(a.completed_at).getTime()
      const dateB = new Date(b.completed_at).getTime()
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB
    })

    setFilteredAssignments(filtered)
  }, [assignments, sortOrder, dateFilter, searchTerm])

  return (
    <>
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Reports</CardTitle>
          <CardDescription>Search and sort your completed reports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by template name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="pl-10 bg-white"
                />
              </div>
              <Select value={sortOrder} onValueChange={(value: "newest" | "oldest") => setSortOrder(value)}>
                <SelectTrigger className="w-40 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* History */}
      {filteredAssignments.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Completed Reports ({filteredAssignments.length})</CardTitle>
            <CardDescription>Your submission history</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-200">
              {filteredAssignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 truncate">
                          {assignment.checklist_templates?.name}
                          {assignment.is_daily_instance && assignment.submission_date && (
                            <span className="text-sm text-gray-500 ml-2">
                              ({new Date(assignment.submission_date).toLocaleDateString()})
                            </span>
                          )}
                        </h3>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                          <span>
                            Completed: {new Date(assignment.completed_at).toLocaleDateString()} at{" "}
                            {new Date(assignment.completed_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          <span>{assignment.checklist_templates?.checklist_items?.length || 0} tasks</span>
                          <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                            Completed
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-1" />
                          View Report
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle className="flex items-center justify-between">
                            <span>{assignment.checklist_templates?.name}</span>
                            <PDFDownloadButton
                              assignment={assignment}
                              responses={responses.filter((r) =>
                                assignment.checklist_templates?.checklist_items?.some(
                                  (item: any) => item.id === r.item_id,
                                ),
                              )}
                            />
                          </DialogTitle>
                          <DialogDescription>
                            Completed on {new Date(assignment.completed_at).toLocaleString()}
                            {assignment.is_daily_instance && assignment.submission_date && (
                              <span className="block mt-1">
                                Daily report for {new Date(assignment.submission_date).toLocaleDateString()}
                              </span>
                            )}
                          </DialogDescription>
                        </DialogHeader>

                        <div className="mt-4 space-y-4">
                          {assignment.checklist_templates?.checklist_items?.map((task: any) => {
                            const taskResponse = responses.find((r) => r.item_id === task.id)
                            return (
                              <div key={task.id} className="border rounded-lg p-4 bg-gray-50">
                                <div className="flex items-start justify-between mb-2">
                                  <h5 className="font-medium text-gray-900">{task.name}</h5>
                                  <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                                    ✓ Completed
                                  </Badge>
                                </div>

                                <div className="text-sm text-gray-600 mt-2">
                                  {task.task_type === "boolean" && (
                                    <p>
                                      <strong>Response:</strong> Yes
                                    </p>
                                  )}
                                  {task.task_type === "text" && taskResponse?.notes && (
                                    <p>
                                      <strong>Response:</strong> {taskResponse.notes}
                                    </p>
                                  )}
                                  {task.task_type === "number" && taskResponse?.notes && (
                                    <p>
                                      <strong>Value:</strong> {taskResponse.notes}
                                    </p>
                                  )}
                                  {task.task_type === "photo" && taskResponse?.photo_url && (
                                    <div>
                                      <p>
                                        <strong>Photo:</strong>
                                      </p>
                                      <img
                                        src={taskResponse.photo_url || "/placeholder.svg"}
                                        alt="Task photo"
                                        className="max-w-xs max-h-48 rounded-lg mt-2 border"
                                      />
                                    </div>
                                  )}
                                  {task.task_type === "options" && taskResponse?.notes && (
                                    <p>
                                      <strong>Selected:</strong> {taskResponse.notes}
                                    </p>
                                  )}

                                  {taskResponse?.completed_at && (
                                    <p className="text-xs text-gray-500 mt-2">
                                      Completed: {new Date(taskResponse.completed_at).toLocaleString()}
                                    </p>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchTerm || dateFilter ? "No reports match your search criteria" : "No completed reports yet"}
            </h3>
            <p className="text-gray-600">
              {searchTerm || dateFilter
                ? "Try adjusting your search terms or date filter"
                : "Your completed reports will appear here once you finish them"}
            </p>
          </CardContent>
        </Card>
      )}
    </>
  )
}
