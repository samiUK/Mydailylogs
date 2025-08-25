"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { reportSecurity, type ReportBackup } from "@/lib/report-security"
import { format } from "date-fns"
import {
  Database,
  Download,
  Upload,
  Shield,
  Clock,
  AlertTriangle,
  CheckCircle,
  RotateCcw,
  HardDrive,
  Settings,
  Crown,
  Lock,
} from "lucide-react"
import { toast } from "sonner"

interface BackupStats {
  totalBackups: number
  totalSize: string
  lastBackup: string
  scheduledBackups: number
  criticalBackups: number
}

export default function BackupRecoveryPage() {
  const [isPremium] = useState(false) // Set to false to show premium restriction
  const [backups, setBackups] = useState<ReportBackup[]>([])
  const [stats, setStats] = useState<BackupStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedBackup, setSelectedBackup] = useState<string | null>(null)
  const [backupType, setBackupType] = useState<string>("manual")
  const [reportId, setReportId] = useState("")
  const [reportType, setReportType] = useState("submitted_report")

  useEffect(() => {
    if (isPremium) {
      loadBackupData()
    } else {
      setLoading(false)
    }
  }, [isPremium])

  const loadBackupData = async () => {
    try {
      setLoading(true)
      const [backupData, statsData] = await Promise.all([
        reportSecurity.getReportBackups(),
        reportSecurity.getBackupStats(),
      ])

      setBackups(backupData)
      setStats(statsData)
    } catch (error) {
      console.error("Error loading backup data:", error)
      toast.error("Failed to load backup data")
    } finally {
      setLoading(false)
    }
  }

  const createManualBackup = async () => {
    if (!reportId.trim()) {
      toast.error("Please enter a report ID")
      return
    }

    try {
      await reportSecurity.createReportBackup(reportId, reportType as any, backupType as any)
      toast.success("Backup created successfully")
      loadBackupData()
      setReportId("")
    } catch (error) {
      console.error("Error creating backup:", error)
      toast.error("Failed to create backup")
    }
  }

  const restoreFromBackup = async (backupId: string) => {
    try {
      await reportSecurity.restoreFromBackup(backupId)
      toast.success("Report restored successfully from backup")
      loadBackupData()
    } catch (error) {
      console.error("Error restoring from backup:", error)
      toast.error("Failed to restore from backup")
    }
  }

  const downloadBackup = async (backup: ReportBackup) => {
    try {
      const backupData = {
        id: backup.id,
        report_id: backup.report_id,
        report_type: backup.report_type,
        backup_type: backup.backup_type,
        backup_data: backup.backup_data,
        created_at: backup.created_at,
        metadata: backup.metadata,
      }

      const blob = new Blob([JSON.stringify(backupData, null, 2)], {
        type: "application/json",
      })

      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `backup-${backup.report_id}-${format(new Date(backup.created_at), "yyyy-MM-dd-HHmm")}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success("Backup downloaded successfully")
    } catch (error) {
      console.error("Error downloading backup:", error)
      toast.error("Failed to download backup")
    }
  }

  const getBackupTypeColor = (type: string) => {
    switch (type) {
      case "scheduled":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "pre_deletion":
        return "bg-red-100 text-red-800 border-red-200"
      case "manual":
        return "bg-green-100 text-green-800 border-green-200"
      case "security":
        return "bg-purple-100 text-purple-800 border-purple-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getBackupTypeIcon = (type: string) => {
    switch (type) {
      case "scheduled":
        return <Clock className="h-4 w-4" />
      case "pre_deletion":
        return <AlertTriangle className="h-4 w-4" />
      case "manual":
        return <HardDrive className="h-4 w-4" />
      case "security":
        return <Shield className="h-4 w-4" />
      default:
        return <Database className="h-4 w-4" />
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
              Backup & Recovery
            </h1>
            <p className="text-gray-600 mt-2">Manage report backups and data recovery operations</p>
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
              Advanced Backup & Recovery is available with our Premium plan
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
              <div className="space-y-3">
                <h4 className="font-semibold text-amber-800 flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Automated Backup System
                </h4>
                <ul className="space-y-2 text-sm text-amber-700">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
                    Scheduled daily backups at 2:00 AM
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
                    Pre-deletion automatic backups
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
                    Manual backup creation on-demand
                  </li>
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="font-semibold text-amber-800 flex items-center gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Recovery & Restoration
                </h4>
                <ul className="space-y-2 text-sm text-amber-700">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
                    One-click report restoration
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
                    Backup download and export
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
                    Flexible retention policies
                  </li>
                </ul>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white/50 rounded-lg p-4 border border-amber-200">
                <div className="flex items-center gap-2 mb-2">
                  <HardDrive className="h-5 w-5 text-amber-600" />
                  <span className="font-semibold text-amber-800">Storage</span>
                </div>
                <p className="text-sm text-amber-700">Unlimited backup storage with encryption</p>
              </div>
              <div className="bg-white/50 rounded-lg p-4 border border-amber-200">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-5 w-5 text-amber-600" />
                  <span className="font-semibold text-amber-800">Security</span>
                </div>
                <p className="text-sm text-amber-700">End-to-end encrypted backups with audit trails</p>
              </div>
              <div className="bg-white/50 rounded-lg p-4 border border-amber-200">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-5 w-5 text-amber-600" />
                  <span className="font-semibold text-amber-800">Retention</span>
                </div>
                <p className="text-sm text-amber-700">Configurable retention up to 1 year</p>
              </div>
            </div>

            <div className="bg-white/50 rounded-lg p-4 border border-amber-200">
              <p className="text-amber-800 font-medium mb-2">
                Protect your business data with enterprise-grade backup solutions
              </p>
              <p className="text-sm text-amber-700">
                Never lose critical business reports again. Our automated backup system ensures your data is always safe
                and recoverable, with multiple retention policies and one-click restoration capabilities.
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
              Upgrade now to unlock advanced backup and recovery features for maximum data protection
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Backup & Recovery</h1>
          <p className="text-gray-600 mt-2">Manage report backups and data recovery operations</p>
        </div>
        <Button onClick={loadBackupData} variant="outline" className="flex items-center gap-2 bg-transparent">
          <RotateCcw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Database className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.totalBackups}</p>
                  <p className="text-sm text-gray-600">Total Backups</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <HardDrive className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.totalSize}</p>
                  <p className="text-sm text-gray-600">Storage Used</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Clock className="h-8 w-8 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.scheduledBackups}</p>
                  <p className="text-sm text-gray-600">Scheduled</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Shield className="h-8 w-8 text-red-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.criticalBackups}</p>
                  <p className="text-sm text-gray-600">Critical</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="backups" className="space-y-6">
        <TabsList>
          <TabsTrigger value="backups">Backup Management</TabsTrigger>
          <TabsTrigger value="create">Create Backup</TabsTrigger>
          <TabsTrigger value="settings">Backup Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="backups" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Report Backups ({backups.length})
              </CardTitle>
              <CardDescription>View and manage all report backups</CardDescription>
            </CardHeader>
            <CardContent>
              {backups.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Database className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No backups found</p>
                  <p className="text-sm">Create your first backup to get started</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {backups.map((backup) => (
                    <div key={backup.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            {getBackupTypeIcon(backup.backup_type)}
                            <Badge className={getBackupTypeColor(backup.backup_type)}>
                              {backup.backup_type.replace("_", " ").toUpperCase()}
                            </Badge>
                            <span className="text-sm text-gray-500">
                              {format(new Date(backup.created_at), "MMM dd, yyyy HH:mm")}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="font-medium text-gray-700">Report ID:</span>
                              <p className="text-gray-900 font-mono text-xs">{backup.report_id}</p>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Type:</span>
                              <p className="text-gray-900">{backup.report_type.replace("_", " ")}</p>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Size:</span>
                              <p className="text-gray-900">
                                {JSON.stringify(backup.backup_data).length > 1024
                                  ? `${Math.round(JSON.stringify(backup.backup_data).length / 1024)} KB`
                                  : `${JSON.stringify(backup.backup_data).length} bytes`}
                              </p>
                            </div>
                          </div>

                          {backup.metadata && (
                            <div className="mt-2 text-xs text-gray-500">
                              <span className="font-medium">Metadata:</span> {JSON.stringify(backup.metadata)}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadBackup(backup)}
                            className="flex items-center gap-1"
                          >
                            <Download className="h-4 w-4" />
                            Download
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => restoreFromBackup(backup.id)}
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
                          >
                            <RotateCcw className="h-4 w-4" />
                            Restore
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Create Manual Backup
              </CardTitle>
              <CardDescription>Create a backup of a specific report</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="reportId">Report ID</Label>
                  <Input
                    id="reportId"
                    placeholder="Enter report ID"
                    value={reportId}
                    onChange={(e) => setReportId(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reportType">Report Type</Label>
                  <Select value={reportType} onValueChange={setReportType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="submitted_report">Submitted Report</SelectItem>
                      <SelectItem value="checklist_template">Checklist Template</SelectItem>
                      <SelectItem value="daily_checklist">Daily Checklist</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="backupType">Backup Type</Label>
                  <Select value={backupType} onValueChange={setBackupType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="security">Security</SelectItem>
                      <SelectItem value="pre_deletion">Pre-Deletion</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={createManualBackup} className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                Create Backup
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Backup Configuration
              </CardTitle>
              <CardDescription>Configure automatic backup settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Automatic Backups</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Pre-deletion Backups</p>
                        <p className="text-sm text-gray-600">Automatically backup reports before deletion</p>
                      </div>
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Scheduled Backups</p>
                        <p className="text-sm text-gray-600">Daily automated backups at 2:00 AM</p>
                      </div>
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Retention Policy</h3>
                  <div className="space-y-3">
                    <div className="p-3 border rounded-lg">
                      <p className="font-medium">Manual Backups</p>
                      <p className="text-sm text-gray-600">Kept indefinitely</p>
                    </div>

                    <div className="p-3 border rounded-lg">
                      <p className="font-medium">Scheduled Backups</p>
                      <p className="text-sm text-gray-600">Kept for 90 days</p>
                    </div>

                    <div className="p-3 border rounded-lg">
                      <p className="font-medium">Pre-deletion Backups</p>
                      <p className="text-sm text-gray-600">Kept for 1 year</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Shield className="h-4 w-4" />
                  <span>All backups are encrypted and stored securely with audit logging enabled</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
