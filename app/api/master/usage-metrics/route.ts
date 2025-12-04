import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { cookies } from "next/headers"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    console.log("[v0] Usage metrics API called")

    // Check master admin authentication
    const cookieStore = await cookies()
    const masterAdminAuth = cookieStore.get("master-admin-session")?.value
    const masterAdminEmail = cookieStore.get("masterAdminEmail")?.value

    console.log("[v0] Masteradmin auth cookie:", masterAdminAuth === "authenticated" ? "Valid" : "Invalid")
    console.log("[v0] Masteradmin email cookie:", masterAdminEmail || "None")

    if (masterAdminAuth !== "authenticated" || masterAdminEmail !== "arsami.uk@gmail.com") {
      console.log("[v0] Unauthorized access attempt to usage metrics")
      return new NextResponse("Unauthorized", { status: 401 })
    }

    console.log("[v0] Fetching usage data from database...")

    const supabase = createAdminClient()

    const [
      { data: profiles, count: profilesCount },
      { data: templates, count: templatesCount },
      { data: reports, count: reportsCount },
      { data: organizations, count: organizationsCount },
      { data: storage, count: storageCount },
      { data: dailyChecklists, count: dailyChecklistsCount },
      { data: checklistResponses, count: responsesCount },
      { data: notifications, count: notificationsCount },
      { data: subscriptions, count: subscriptionsCount },
      { data: payments, count: paymentsCount },
    ] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact" }),
      supabase.from("checklist_templates").select("*", { count: "exact" }),
      supabase.from("submitted_reports").select("created_at", { count: "exact" }),
      supabase.from("organizations").select("*", { count: "exact" }),
      supabase.from("checklist_responses").select("photo_url").not("photo_url", "is", null),
      supabase.from("daily_checklists").select("id", { count: "exact" }),
      supabase.from("checklist_responses").select("id", { count: "exact" }),
      supabase.from("notifications").select("id", { count: "exact" }),
      supabase.from("subscriptions").select("*", { count: "exact" }),
      supabase.from("payments").select("*", { count: "exact" }),
    ])

    console.log("[v0] Database query results:", {
      profiles: profilesCount,
      templates: templatesCount,
      reports: reportsCount,
      organizations: organizationsCount,
      storage: storageCount,
      dailyChecklists: dailyChecklistsCount,
      responses: responsesCount,
      notifications: notificationsCount,
      subscriptions: subscriptionsCount,
      payments: paymentsCount,
    })

    const estimatedDbSize =
      (profilesCount || 0) * 2 + // ~2KB per profile
      (templatesCount || 0) * 5 + // ~5KB per template (with items)
      (reportsCount || 0) * 8 + // ~8KB per report (with data)
      (organizationsCount || 0) * 1 + // ~1KB per org
      (dailyChecklistsCount || 0) * 3 + // ~3KB per daily checklist
      (responsesCount || 0) * 2 + // ~2KB per response
      (notificationsCount || 0) * 1 + // ~1KB per notification
      (subscriptionsCount || 0) * 1 + // ~1KB per subscription
      (paymentsCount || 0) * 1 // ~1KB per payment

    const estimatedDbSizeKB = estimatedDbSize
    const estimatedDbSizeMB = estimatedDbSize / 1024
    const estimatedDbSizeBytes = estimatedDbSize * 1024

    // Calculate storage size
    const photoCount = storage?.length || 0
    const estimatedStorageBytes = photoCount * 500 * 1024 // Average 500KB per photo
    const estimatedStorageMB = estimatedStorageBytes / (1024 * 1024)

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const reportsThisMonth = reports?.filter((r) => new Date(r.created_at) >= startOfMonth).length || 0
    // Estimate: 2 emails per report (submission + follow-up) + 1 per notification
    const notificationsThisMonth = notifications?.filter((n) => new Date(n.created_at) >= startOfMonth).length || 0
    const estimatedEmailsSent = reportsThisMonth * 2 + notificationsThisMonth

    const estimatedBandwidthBytes =
      estimatedStorageBytes * 1.5 + // Storage transfers (photos viewed)
      (reportsCount || 0) * 50000 + // ~50KB per report API call (with data)
      (profilesCount || 0) * 10000 + // ~10KB per profile API call
      (dailyChecklistsCount || 0) * 20000 // ~20KB per checklist API call
    const estimatedBandwidthMB = estimatedBandwidthBytes / (1024 * 1024)
    const estimatedBandwidthGB = estimatedBandwidthMB / 1024

    // Define free tier limits
    const FREE_TIER_LIMITS = {
      supabaseDb: 500, // 500 MB
      supabaseStorage: 1024, // 1 GB (in MB)
      resendEmails: 3000, // 3,000 emails/month
      vercelBandwidth: 100, // 100 GB/month
    }

    const responseData = {
      success: true,
      timestamp: new Date().toISOString(),
      supabase: {
        database: {
          usedMB: Number.parseFloat(estimatedDbSizeMB.toFixed(2)),
          usedBytes: estimatedDbSizeBytes,
          limitMB: FREE_TIER_LIMITS.supabaseDb,
          percentUsed: Number.parseFloat(((estimatedDbSizeMB / FREE_TIER_LIMITS.supabaseDb) * 100).toFixed(2)),
          status:
            estimatedDbSizeMB > FREE_TIER_LIMITS.supabaseDb * 0.9
              ? "critical"
              : estimatedDbSizeMB > FREE_TIER_LIMITS.supabaseDb * 0.7
                ? "warning"
                : "healthy",
          breakdown: {
            profiles: profilesCount || 0,
            templates: templatesCount || 0,
            reports: reportsCount || 0,
            organizations: organizationsCount || 0,
            dailyChecklists: dailyChecklistsCount || 0,
            responses: responsesCount || 0,
            notifications: notificationsCount || 0,
            subscriptions: subscriptionsCount || 0,
            payments: paymentsCount || 0,
          },
        },
        storage: {
          usedMB: Number.parseFloat(estimatedStorageMB.toFixed(2)),
          usedBytes: estimatedStorageBytes,
          photoCount: photoCount,
          limitMB: FREE_TIER_LIMITS.supabaseStorage,
          percentUsed: Number.parseFloat(((estimatedStorageMB / FREE_TIER_LIMITS.supabaseStorage) * 100).toFixed(2)),
          status:
            estimatedStorageMB > FREE_TIER_LIMITS.supabaseStorage * 0.9
              ? "critical"
              : estimatedStorageMB > FREE_TIER_LIMITS.supabaseStorage * 0.7
                ? "warning"
                : "healthy",
        },
      },
      resend: {
        emails: {
          sentThisMonth: estimatedEmailsSent,
          limit: FREE_TIER_LIMITS.resendEmails,
          percentUsed: Number.parseFloat(((estimatedEmailsSent / FREE_TIER_LIMITS.resendEmails) * 100).toFixed(2)),
          status:
            estimatedEmailsSent > FREE_TIER_LIMITS.resendEmails * 0.9
              ? "critical"
              : estimatedEmailsSent > FREE_TIER_LIMITS.resendEmails * 0.7
                ? "warning"
                : "healthy",
          breakdown: {
            fromReports: reportsThisMonth * 2,
            fromNotifications: notificationsThisMonth,
          },
        },
      },
      vercel: {
        bandwidth: {
          usedGB: Number.parseFloat(estimatedBandwidthGB.toFixed(2)),
          limitGB: FREE_TIER_LIMITS.vercelBandwidth,
          percentUsed: Number.parseFloat(((estimatedBandwidthGB / FREE_TIER_LIMITS.vercelBandwidth) * 100).toFixed(2)),
          status:
            estimatedBandwidthGB > FREE_TIER_LIMITS.vercelBandwidth * 0.9
              ? "critical"
              : estimatedBandwidthGB > FREE_TIER_LIMITS.vercelBandwidth * 0.7
                ? "warning"
                : "healthy",
        },
      },
      counts: {
        profiles: profilesCount || 0,
        templates: templatesCount || 0,
        reports: reportsCount || 0,
        organizations: organizationsCount || 0,
        reportsThisMonth: reportsThisMonth,
        dailyChecklists: dailyChecklistsCount || 0,
        responses: responsesCount || 0,
        notifications: notificationsCount || 0,
        notificationsThisMonth: notificationsThisMonth,
        subscriptions: subscriptionsCount || 0,
        payments: paymentsCount || 0,
      },
      note: "Metrics are estimates based on database records. For accurate real-time data, connect Supabase Management API, Vercel API, and Resend API.",
    }

    console.log("[v0] Returning usage metrics:", JSON.stringify(responseData, null, 2))

    return NextResponse.json(responseData)
  } catch (error: any) {
    console.error("[v0] Usage metrics error:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch usage metrics" }, { status: 500 })
  }
}
