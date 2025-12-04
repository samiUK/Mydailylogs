import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { cookies } from "next/headers"

export const dynamic = "force-dynamic"
export const revalidate = 60 // Cache for 60 seconds

export async function GET(request: NextRequest) {
  try {
    // Check master admin authentication
    const cookieStore = await cookies()
    const masterAdminAuth = cookieStore.get("master-admin-session")?.value
    const masterAdminEmail = cookieStore.get("masterAdminEmail")?.value

    if (masterAdminAuth !== "authenticated" || masterAdminEmail !== "arsami.uk@gmail.com") {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const supabase = createAdminClient()

    const [
      profilesCount,
      templatesCount,
      reportsResult,
      organizationsCount,
      storageResult,
      dailyChecklistsCount,
      responsesCount,
      notificationsResult,
      subscriptionsCount,
      paymentsCount,
      authUsersResult,
    ] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("checklist_templates").select("*", { count: "exact", head: true }),
      supabase.from("submitted_reports").select("created_at", { count: "exact" }),
      supabase.from("organizations").select("*", { count: "exact", head: true }),
      supabase.from("checklist_responses").select("photo_url").not("photo_url", "is", null),
      supabase.from("daily_checklists").select("*", { count: "exact", head: true }),
      supabase.from("checklist_responses").select("*", { count: "exact", head: true }),
      supabase.from("notifications").select("created_at", { count: "exact" }),
      supabase.from("subscriptions").select("*", { count: "exact", head: true }),
      supabase.from("payments").select("*", { count: "exact", head: true }),
      supabase.auth.admin.listUsers(),
    ])

    const counts = {
      profiles: profilesCount.count || 0,
      templates: templatesCount.count || 0,
      reports: reportsResult.count || 0,
      organizations: organizationsCount.count || 0,
      dailyChecklists: dailyChecklistsCount.count || 0,
      responses: responsesCount.count || 0,
      notifications: notificationsResult.count || 0,
      subscriptions: subscriptionsCount.count || 0,
      payments: paymentsCount.count || 0,
    }

    // Calculate total rows across all tables
    const totalRows = Object.values(counts).reduce((sum, count) => sum + count, 0)

    // Calculate this month's activity
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const reportsThisMonth = reportsResult.data?.filter((r) => new Date(r.created_at) >= startOfMonth).length || 0
    const notificationsThisMonth =
      notificationsResult.data?.filter((n) => new Date(n.created_at) >= startOfMonth).length || 0

    // Auth users calculations
    const totalAuthUsers = authUsersResult.data.users.length
    const activeUsersThisMonth = authUsersResult.data.users.filter((user) => {
      const lastSignIn = user.last_sign_in_at ? new Date(user.last_sign_in_at) : null
      return lastSignIn && lastSignIn >= startOfMonth
    }).length

    const estimatedDbSizeKB =
      counts.profiles * 2 +
      counts.templates * 5 +
      counts.reports * 8 +
      counts.organizations * 1 +
      counts.dailyChecklists * 3 +
      counts.responses * 2 +
      counts.notifications * 1 +
      counts.subscriptions * 1 +
      counts.payments * 1

    const estimatedDbSizeMB = estimatedDbSizeKB / 1024

    // Storage calculation
    const photoCount = storageResult.data?.length || 0
    const estimatedStorageMB = (photoCount * 500) / 1024 // 500KB avg per photo

    // Email estimation
    const estimatedEmailsSent = reportsThisMonth * 2 + notificationsThisMonth

    // Bandwidth estimation (more detailed)
    const estimatedBandwidthGB =
      (estimatedStorageMB * 1.5 + // Storage transfers
        counts.reports * 0.05 + // Report API calls
        counts.profiles * 0.01 + // Profile API calls
        counts.dailyChecklists * 0.02 + // Checklist API calls
        activeUsersThisMonth * 0.5) / // Active user sessions
      1024

    const LIMITS = {
      supabaseDb: 500, // 500MB
      supabaseStorage: 1024, // 1GB
      supabaseAuthMAU: 50000, // Monthly Active Users
      supabaseRows: 500000, // Approximate row limit warning
      resendEmails: 3000, // 3,000 emails/month
      resendApiRequests: 100000, // 100k API requests/month
      vercelBandwidth: 100, // 100GB/month
      vercelFunctionInvocations: 1000000, // 1M/month
      vercelBuildMinutes: 6000, // 6,000 minutes/month
      vercelImageOptimizations: 5000, // 5,000/month
    }

    const getStatus = (used: number, limit: number) => {
      const percent = (used / limit) * 100
      if (percent >= 90) return "critical"
      if (percent >= 70) return "warning"
      return "healthy"
    }

    const responseData = {
      success: true,
      timestamp: new Date().toISOString(),
      supabase: {
        database: {
          usedMB: Number(estimatedDbSizeMB.toFixed(2)),
          limitMB: LIMITS.supabaseDb,
          percentUsed: Number(((estimatedDbSizeMB / LIMITS.supabaseDb) * 100).toFixed(2)),
          status: getStatus(estimatedDbSizeMB, LIMITS.supabaseDb),
          breakdown: counts,
          totalRows,
          rowsLimit: LIMITS.supabaseRows,
          rowsPercentUsed: Number(((totalRows / LIMITS.supabaseRows) * 100).toFixed(2)),
          rowsStatus: getStatus(totalRows, LIMITS.supabaseRows),
        },
        storage: {
          usedMB: Number(estimatedStorageMB.toFixed(2)),
          photoCount,
          limitMB: LIMITS.supabaseStorage,
          percentUsed: Number(((estimatedStorageMB / LIMITS.supabaseStorage) * 100).toFixed(2)),
          status: getStatus(estimatedStorageMB, LIMITS.supabaseStorage),
        },
        auth: {
          totalUsers: totalAuthUsers,
          monthlyActiveUsers: activeUsersThisMonth,
          mauLimit: LIMITS.supabaseAuthMAU,
          mauPercentUsed: Number(((activeUsersThisMonth / LIMITS.supabaseAuthMAU) * 100).toFixed(2)),
          status: getStatus(activeUsersThisMonth, LIMITS.supabaseAuthMAU),
        },
      },
      resend: {
        emails: {
          sentThisMonth: estimatedEmailsSent,
          limit: LIMITS.resendEmails,
          percentUsed: Number(((estimatedEmailsSent / LIMITS.resendEmails) * 100).toFixed(2)),
          status: getStatus(estimatedEmailsSent, LIMITS.resendEmails),
          breakdown: {
            fromReports: reportsThisMonth * 2,
            fromNotifications: notificationsThisMonth,
          },
        },
        api: {
          estimatedRequests: estimatedEmailsSent * 1.2, // Estimate includes retries/validation
          limit: LIMITS.resendApiRequests,
          percentUsed: Number((((estimatedEmailsSent * 1.2) / LIMITS.resendApiRequests) * 100).toFixed(2)),
          status: getStatus(estimatedEmailsSent * 1.2, LIMITS.resendApiRequests),
        },
      },
      vercel: {
        bandwidth: {
          usedGB: Number(estimatedBandwidthGB.toFixed(2)),
          limitGB: LIMITS.vercelBandwidth,
          percentUsed: Number(((estimatedBandwidthGB / LIMITS.vercelBandwidth) * 100).toFixed(2)),
          status: getStatus(estimatedBandwidthGB, LIMITS.vercelBandwidth),
        },
        functions: {
          estimatedInvocations: activeUsersThisMonth * 50, // Estimate: 50 function calls per active user
          limit: LIMITS.vercelFunctionInvocations,
          percentUsed: Number((((activeUsersThisMonth * 50) / LIMITS.vercelFunctionInvocations) * 100).toFixed(2)),
          status: getStatus(activeUsersThisMonth * 50, LIMITS.vercelFunctionInvocations),
        },
        imageOptimizations: {
          estimated: photoCount * 2, // Estimate: 2 optimizations per photo (thumbnail + full)
          limit: LIMITS.vercelImageOptimizations,
          percentUsed: Number((((photoCount * 2) / LIMITS.vercelImageOptimizations) * 100).toFixed(2)),
          status: getStatus(photoCount * 2, LIMITS.vercelImageOptimizations),
        },
      },
      counts: {
        ...counts,
        reportsThisMonth,
        notificationsThisMonth,
        totalRows,
        authUsers: totalAuthUsers,
        activeUsersThisMonth,
      },
      note: "Real-time metrics from Supabase. Some Vercel metrics are estimates based on usage patterns.",
    }

    return NextResponse.json(responseData)
  } catch (error: any) {
    console.error("[Usage Metrics Error]:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch usage metrics" }, { status: 500 })
  }
}
