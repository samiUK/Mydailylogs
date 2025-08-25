import { createClient } from "@/lib/supabase/client"

export interface ReportPermissions {
  view: boolean
  export: boolean
  delete: boolean
  restore: boolean
  audit_access: boolean
}

export interface AuditLogEntry {
  id: string
  user_id: string
  organization_id: string
  report_id: string
  report_type: "submitted_report" | "daily_checklist" | "external_submission"
  action: "view" | "export" | "delete" | "restore" | "create" | "update"
  ip_address?: string
  user_agent?: string
  details: Record<string, any>
  risk_level: "low" | "medium" | "high" | "critical"
  created_at: string
}

export interface ReportBackup {
  id: string
  report_id: string
  report_type: "submitted_report" | "daily_checklist" | "external_submission"
  backup_data: any
  backup_reason: "scheduled" | "pre_deletion" | "manual" | "security"
  created_by: string
  organization_id: string
  created_at: string
  metadata?: {
    last_restored?: string
    restore_count?: number
  }
}

export class ReportSecurityManager {
  private supabase = createClient()

  // Check if user has specific permission for reports
  async checkReportPermission(permission: keyof ReportPermissions): Promise<boolean> {
    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser()
      if (!user) return false

      const { data: profile } = await this.supabase
        .from("profiles")
        .select("report_permissions, role")
        .eq("id", user.id)
        .single()

      if (!profile) return false

      // Master admins have all permissions
      if (profile.role === "master_admin") return true

      // Check specific permission
      const permissions = profile.report_permissions as ReportPermissions
      return permissions?.[permission] || false
    } catch (error) {
      console.error("Error checking report permission:", error)
      return false
    }
  }

  // Log report access with enhanced security context
  async logReportAccess(
    reportId: string,
    reportType: AuditLogEntry["report_type"],
    action: AuditLogEntry["action"],
    details: Record<string, any> = {},
  ): Promise<void> {
    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await this.supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single()

      // Determine risk level based on action
      let riskLevel: AuditLogEntry["risk_level"] = "low"
      if (action === "delete") riskLevel = "critical"
      else if (action === "export" || action === "restore") riskLevel = "medium"

      await this.supabase.from("report_audit_logs").insert({
        user_id: user.id,
        organization_id: profile?.organization_id,
        report_id: reportId,
        report_type: reportType,
        action,
        details: {
          ...details,
          timestamp: new Date().toISOString(),
          user_agent: navigator.userAgent,
        },
        risk_level: riskLevel,
      })
    } catch (error) {
      console.error("Error logging report access:", error)
    }
  }

  // Create secure session for sensitive report operations
  async createSecureSession(): Promise<string | null> {
    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser()
      if (!user) return null

      const sessionToken = crypto.randomUUID()
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000) // 30 minutes

      const { error } = await this.supabase.from("report_access_sessions").insert({
        user_id: user.id,
        session_token: sessionToken,
        expires_at: expiresAt.toISOString(),
      })

      if (error) throw error
      return sessionToken
    } catch (error) {
      console.error("Error creating secure session:", error)
      return null
    }
  }

  // Validate secure session for critical operations
  async validateSecureSession(sessionToken: string): Promise<boolean> {
    try {
      const { data: session } = await this.supabase
        .from("report_access_sessions")
        .select("*")
        .eq("session_token", sessionToken)
        .eq("is_active", true)
        .single()

      if (!session) return false

      // Check if session is expired
      if (new Date(session.expires_at) < new Date()) {
        // Deactivate expired session
        await this.supabase.from("report_access_sessions").update({ is_active: false }).eq("id", session.id)
        return false
      }

      // Update last activity
      await this.supabase
        .from("report_access_sessions")
        .update({ last_activity: new Date().toISOString() })
        .eq("id", session.id)

      return true
    } catch (error) {
      console.error("Error validating secure session:", error)
      return false
    }
  }

  // Get audit logs for reports (admin only)
  async getAuditLogs(
    filters: {
      reportId?: string
      action?: string
      riskLevel?: string
      dateFrom?: string
      dateTo?: string
    } = {},
  ): Promise<AuditLogEntry[]> {
    try {
      const hasPermission = await this.checkReportPermission("audit_access")
      if (!hasPermission) {
        throw new Error("Insufficient permissions to access audit logs")
      }

      let query = this.supabase
        .from("report_audit_logs")
        .select(`
          *,
          profiles!report_audit_logs_user_id_fkey(full_name, email)
        `)
        .order("created_at", { ascending: false })

      if (filters.reportId) query = query.eq("report_id", filters.reportId)
      if (filters.action) query = query.eq("action", filters.action)
      if (filters.riskLevel) query = query.eq("risk_level", filters.riskLevel)
      if (filters.dateFrom) query = query.gte("created_at", filters.dateFrom)
      if (filters.dateTo) query = query.lte("created_at", filters.dateTo)

      const { data, error } = await query.limit(1000)
      if (error) throw error

      return data || []
    } catch (error) {
      console.error("Error fetching audit logs:", error)
      return []
    }
  }

  // Create manual backup of report
  async createReportBackup(
    reportId: string,
    reportType: AuditLogEntry["report_type"],
    reason: "scheduled" | "pre_deletion" | "manual" | "security" = "manual",
  ): Promise<boolean> {
    try {
      const hasPermission = await this.checkReportPermission("export")
      if (!hasPermission) {
        throw new Error("Insufficient permissions to create backup")
      }

      // Fetch the report data
      let reportData: any = null
      if (reportType === "submitted_report") {
        const { data } = await this.supabase.from("submitted_reports").select("*").eq("id", reportId).single()
        reportData = data
      } else if (reportType === "daily_checklist") {
        const { data } = await this.supabase.from("daily_checklists").select("*").eq("id", reportId).single()
        reportData = data
      }

      if (!reportData) {
        throw new Error("Report not found")
      }

      const {
        data: { user },
      } = await this.supabase.auth.getUser()
      const { data: profile } = await this.supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user?.id)
        .single()

      const { error } = await this.supabase.from("report_backups").insert({
        report_id: reportId,
        report_type: reportType,
        backup_data: reportData,
        backup_reason: reason,
        created_by: user?.id,
        organization_id: profile?.organization_id,
      })

      if (error) throw error

      await this.logReportAccess(reportId, reportType, "create", {
        backup_reason: reason,
        backup_created: true,
      })

      return true
    } catch (error) {
      console.error("Error creating report backup:", error)
      return false
    }
  }

  // Backup management methods
  async getReportBackups(filters?: any): Promise<ReportBackup[]> {
    const { data, error } = await this.supabase
      .from("report_backups")
      .select(`
        *,
        profiles!report_backups_created_by_fkey(full_name, email)
      `)
      .order("created_at", { ascending: false })

    if (error) throw error
    return data || []
  }

  async getBackupStats(): Promise<any> {
    const { data: backups, error } = await this.supabase
      .from("report_backups")
      .select("backup_type, backup_data, created_at")

    if (error) throw error

    const totalBackups = backups?.length || 0
    const totalSize =
      backups?.reduce((acc, backup) => {
        return acc + JSON.stringify(backup.backup_data).length
      }, 0) || 0

    const formatSize = (bytes: number) => {
      if (bytes < 1024) return `${bytes} B`
      if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
      return `${Math.round(bytes / (1024 * 1024))} MB`
    }

    const scheduledBackups = backups?.filter((b) => b.backup_type === "scheduled").length || 0
    const criticalBackups =
      backups?.filter((b) => b.backup_type === "security" || b.backup_type === "pre_deletion").length || 0
    const lastBackup = backups?.[0]?.created_at || null

    return {
      totalBackups,
      totalSize: formatSize(totalSize),
      lastBackup: lastBackup ? new Date(lastBackup).toISOString() : "Never",
      scheduledBackups,
      criticalBackups,
    }
  }

  async restoreFromBackup(backupId: string): Promise<void> {
    const { data: backup, error: backupError } = await this.supabase
      .from("report_backups")
      .select("*")
      .eq("id", backupId)
      .single()

    if (backupError) throw backupError
    if (!backup) throw new Error("Backup not found")

    // Log the restore operation
    await this.logReportAccess(backup.report_id, backup.report_type, "restore", {
      backup_id: backupId,
      backup_type: backup.backup_type,
      restore_timestamp: new Date().toISOString(),
    })

    // Restore the report data based on report type
    if (backup.report_type === "submitted_report") {
      const { error: restoreError } = await this.supabase.from("submitted_reports").upsert({
        id: backup.report_id,
        ...backup.backup_data,
        updated_at: new Date().toISOString(),
      })

      if (restoreError) throw restoreError
    }
    // Add other report types as needed

    // Update backup metadata
    await this.supabase
      .from("report_backups")
      .update({
        metadata: {
          ...backup.metadata,
          last_restored: new Date().toISOString(),
          restore_count: (backup.metadata?.restore_count || 0) + 1,
        },
      })
      .eq("id", backupId)
  }
}

// Export singleton instance
export const reportSecurity = new ReportSecurityManager()
