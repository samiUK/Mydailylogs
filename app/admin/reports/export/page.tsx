"use client"

import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import Link from "next/link"

export default function ExportPage() {
  const [exportType, setExportType] = useState("")
  const [dateRange, setDateRange] = useState("30")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    setIsExporting(true)

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      // Get user's organization
      const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single()

      // Calculate date range
      let fromDate: string
      let toDate: string

      if (dateRange === "custom") {
        fromDate = startDate
        toDate = endDate
      } else {
        const days = Number.parseInt(dateRange)
        const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        const to = new Date()
        fromDate = from.toISOString().split("T")[0]
        toDate = to.toISOString().split("T")[0]
      }

      // Fetch data based on export type
      let data: any[] = []

      if (exportType === "checklists") {
        const { data: checklists } = await supabase
          .from("daily_checklists")
          .select(
            `
            *,
            checklist_templates(name, description),
            profiles!daily_checklists_assigned_to_fkey(full_name, email)
          `,
          )
          .eq("organization_id", profile?.organization_id)
          .gte("date", fromDate)
          .lte("date", toDate)
          .order("date", { ascending: false })

        data = checklists || []
      } else if (exportType === "responses") {
        // Get checklist responses with details
        const { data: responses } = await supabase
          .from("checklist_responses")
          .select(
            `
            *,
            checklist_items(title, description, is_required),
            daily_checklists!checklist_responses_checklist_id_fkey(
              date,
              checklist_templates(name),
              profiles!daily_checklists_assigned_to_fkey(full_name, email)
            )
          `,
          )
          .gte("created_at", fromDate)
          .lte("created_at", toDate)

        data = responses || []
      }

      // Convert to CSV
      if (data.length > 0) {
        const csv = convertToCSV(data, exportType)
        downloadCSV(csv, `${exportType}-export-${fromDate}-to-${toDate}.csv`)
      } else {
        alert("No data found for the selected criteria")
      }
    } catch (error) {
      console.error("Export error:", error)
      alert("Failed to export data")
    } finally {
      setIsExporting(false)
    }
  }

  const convertToCSV = (data: any[], type: string): string => {
    if (data.length === 0) return ""

    if (type === "checklists") {
      const headers = ["Date", "Template", "Assigned To", "Email", "Status", "Completed At", "Notes"]
      const rows = data.map((item) => [
        item.date,
        item.checklist_templates?.name || "",
        item.profiles?.full_name || "",
        item.profiles?.email || "",
        item.status,
        item.completed_at || "",
        item.notes || "",
      ])

      return [headers, ...rows].map((row) => row.map((field) => `"${field}"`).join(",")).join("\n")
    } else if (type === "responses") {
      const headers = [
        "Date",
        "Template",
        "Assigned To",
        "Email",
        "Item Title",
        "Item Description",
        "Required",
        "Completed",
        "Notes",
        "Completed At",
      ]
      const rows = data.map((item) => [
        item.daily_checklists?.date || "",
        item.daily_checklists?.checklist_templates?.name || "",
        item.daily_checklists?.profiles?.full_name || "",
        item.daily_checklists?.profiles?.email || "",
        item.checklist_items?.title || "",
        item.checklist_items?.description || "",
        item.checklist_items?.is_required ? "Yes" : "No",
        item.is_completed ? "Yes" : "No",
        item.notes || "",
        item.completed_at || "",
      ])

      return [headers, ...rows].map((row) => row.map((field) => `"${field}"`).join(",")).join("\n")
    }

    return ""
  }

  const downloadCSV = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", filename)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Export Data</h1>
        <p className="text-gray-600 mt-2">Export your compliance data for external analysis</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Export Configuration</CardTitle>
          <CardDescription>Choose what data to export and the date range</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-2">
            <Label htmlFor="exportType">Export Type</Label>
            <Select value={exportType} onValueChange={setExportType}>
              <SelectTrigger>
                <SelectValue placeholder="Select what to export" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="checklists">Checklist Summary</SelectItem>
                <SelectItem value="responses">Detailed Item Responses</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="dateRange">Date Range</Label>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger>
                <SelectValue placeholder="Select date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="custom">Custom range</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {dateRange === "custom" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
          )}

          <div className="flex gap-4">
            <Button onClick={handleExport} disabled={!exportType || isExporting}>
              {isExporting ? "Exporting..." : "Export CSV"}
            </Button>
            <Link href="/admin/reports">
              <Button variant="outline">Cancel</Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Export Info */}
      <Card>
        <CardHeader>
          <CardTitle>Export Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold">Checklist Summary</h4>
            <p className="text-sm text-gray-600">
              Exports high-level checklist data including dates, templates, assignments, and completion status.
            </p>
          </div>
          <div>
            <h4 className="font-semibold">Detailed Item Responses</h4>
            <p className="text-sm text-gray-600">
              Exports individual checklist item responses with completion status, notes, and timestamps.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
