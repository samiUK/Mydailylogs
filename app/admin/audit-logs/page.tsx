"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { reportSecurity, type AuditLogEntry } from "@/lib/report-security"
import { format } from "date-fns"
import { Search, Filter, Download, Shield, AlertTriangle, Info, Eye, Crown, Lock } from "lucide-react"
import { toast } from "sonner"

export default function AuditLogsPage() {
  const [isPremium] = useState(false) // Set to false to show premium restriction
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    action: "all",
    riskLevel: "all",
    dateFrom: "",
    dateTo: "",
    reportId: "",
  })

  useEffect(() => {
    if (isPremium) {
      loadAuditLogs()
    } else {
      setLoading(false)
    }
  }, [isPremium])

  const loadAuditLogs = async () => {
    try {
      setLoading(true)
      const logs = await reportSecurity.getAuditLogs(filters)
      setAuditLogs(logs)
    } catch (error) {
      console.error("Error loading audit logs:", error)
      toast.error("Failed to load audit logs")
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const applyFilters = () => {
    loadAuditLogs()
  }

  const clearFilters = () => {
    setFilters({
      action: "all",
      riskLevel: "all",
      dateFrom: "",
      dateTo: "",
      reportId: "",
    })
    setTimeout(loadAuditLogs, 100)
  }

  const exportAuditLogs = async () => {
    try {
      const csvContent = convertToCSV(auditLogs)
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const link = document.createElement("a")
      const url = URL.createObjectURL(blob)
      link.setAttribute("href", url)
      link.setAttribute("download", `audit-logs-${format(new Date(), "yyyy-MM-dd")}.csv`)
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success("Audit logs exported successfully")
    } catch (error) {
      toast.error("Failed to export audit logs")
    }
  }

  const convertToCSV = (logs: AuditLogEntry[]): string => {
    const headers = ["Timestamp", "User", "Action", "Report Type", "Report ID", "Risk Level", "IP Address", "Details"]
    const rows = logs.map((log) => [
      format(new Date(log.created_at), "yyyy-MM-dd HH:mm:ss"),
      (log as any).profiles?.full_name || "Unknown",
      log.action,
      log.report_type,
      log.report_id,
      log.risk_level,
      log.ip_address || "N/A",
      JSON.stringify(log.details),
    ])

    return [headers, ...rows].map((row) => row.map((field) => `"${field}"`).join(",")).join("\n")
  }

  const getRiskLevelIcon = (level: string) => {
    switch (level) {
      case "critical":
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case "high":
        return <AlertTriangle className="h-4 w-4 text-orange-500" />
      case "medium":
        return <Shield className="h-4 w-4 text-yellow-500" />
      default:
        return <Info className="h-4 w-4 text-blue-500" />
    }
  }

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case "critical":
        return "bg-red-100 text-red-800 border-red-200"
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-200"
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      default:
        return "bg-blue-100 text-blue-800 border-blue-200"
    }
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case "delete":
        return "bg-red-100 text-red-800 border-red-200"
      case "export":
        return "bg-purple-100 text-purple-800 border-purple-200"
      case "create":
        return "bg-green-100 text-green-800 border-green-200"
      case "update":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "restore":
        return "bg-indigo-100 text-indigo-800 border-indigo-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  if (!isPremium) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Crown className="h-8 w-8 text-amber-500" />
              Security Audit Logs
            </h1>
            <p className="text-gray-600 mt-2">Monitor all report access and security events</p>
          </div>
        </div>

        {/* Premium Restriction Card */}
        <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
              <Lock className="h-8 w-8 text-amber-600" />
            </div>
            <CardTitle className="text-2xl text-amber-800 flex items-center justify-center gap-2">
              <Crown className="h-6 w-6" />
              Premium Feature
            </CardTitle>
            <CardDescription className="text-amber-700 text-base">
              Security Audit Logs are available with our Premium plan
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
              <div className="space-y-3">
                <h4 className="font-semibold text-amber-800 flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Advanced Security Features
                </h4>
                <ul className="space-y-2 text-sm text-amber-700">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
                    Complete audit trail of all report activities
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
                    Risk level assessment for security events
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
                    IP address tracking and user identification
                  </li>
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="font-semibold text-amber-800 flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Monitoring & Compliance
                </h4>
                <ul className="space-y-2 text-sm text-amber-700">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
                    Advanced filtering and search capabilities
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
                    CSV export for compliance reporting
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
                    Real-time security event notifications
                  </li>
                </ul>
              </div>
            </div>

            <div className="bg-white/50 rounded-lg p-4 border border-amber-200">
              <p className="text-amber-800 font-medium mb-2">
                Protect your business with enterprise-grade security monitoring
              </p>
              <p className="text-sm text-amber-700">
                Get complete visibility into who accesses your reports, when they access them, and what actions they
                perform. Essential for compliance and security auditing.
              </p>
            </div>

            <Button
              onClick={() => (window.location.href = "/admin/billing")}
              className="bg-amber-600 hover:bg-amber-700 text-white px-8 py-3 text-lg font-semibold"
              size="lg"
            >
              <Crown className="mr-2 h-5 w-5" />
              Upgrade to Premium
            </Button>

            <p className="text-xs text-amber-600">
              Upgrade now to unlock advanced security features and protect your valuable business data
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Security Audit Logs</h1>
          <p className="text-gray-600 mt-2">Monitor all report access and security events</p>
        </div>
        <Button onClick={exportAuditLogs} className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
          <CardDescription>Filter audit logs by various criteria</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="action">Action</Label>
              <Select value={filters.action} onValueChange={(value) => handleFilterChange("action", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All actions</SelectItem>
                  <SelectItem value="view">View</SelectItem>
                  <SelectItem value="export">Export</SelectItem>
                  <SelectItem value="delete">Delete</SelectItem>
                  <SelectItem value="restore">Restore</SelectItem>
                  <SelectItem value="create">Create</SelectItem>
                  <SelectItem value="update">Update</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="riskLevel">Risk Level</Label>
              <Select value={filters.riskLevel} onValueChange={(value) => handleFilterChange("riskLevel", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All risk levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All risk levels</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reportId">Report ID</Label>
              <Input
                id="reportId"
                placeholder="Enter report ID"
                value={filters.reportId}
                onChange={(e) => handleFilterChange("reportId", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateFrom">From Date</Label>
              <Input
                id="dateFrom"
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateTo">To Date</Label>
              <Input
                id="dateTo"
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange("dateTo", e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button onClick={applyFilters} className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Apply Filters
            </Button>
            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Audit Log Entries ({auditLogs.length})
          </CardTitle>
          <CardDescription>Detailed log of all report security events</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Shield className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No audit logs found matching your criteria</p>
            </div>
          ) : (
            <div className="space-y-4">
              {auditLogs.map((log) => (
                <div key={log.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {getRiskLevelIcon(log.risk_level)}
                        <Badge className={getRiskLevelColor(log.risk_level)}>{log.risk_level.toUpperCase()}</Badge>
                        <Badge className={getActionColor(log.action)}>{log.action.toUpperCase()}</Badge>
                        <span className="text-sm text-gray-500">
                          {format(new Date(log.created_at), "MMM dd, yyyy HH:mm:ss")}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">User:</span>
                          <p className="text-gray-900">{(log as any).profiles?.full_name || "Unknown"}</p>
                          <p className="text-gray-500 text-xs">{(log as any).profiles?.email}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Report:</span>
                          <p className="text-gray-900">{log.report_type.replace("_", " ")}</p>
                          <p className="text-gray-500 text-xs font-mono">{log.report_id}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">IP Address:</span>
                          <p className="text-gray-900">{log.ip_address || "N/A"}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Details:</span>
                          <p className="text-gray-900 text-xs">
                            {JSON.stringify(log.details, null, 2).substring(0, 100)}...
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
