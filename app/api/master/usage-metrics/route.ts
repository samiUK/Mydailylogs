import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { cookies } from "next/headers"

export const dynamic = "force-dynamic"

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

    const [{ data: profiles }, { data: templates }, { data: reports }, { data: organizations }, { data: storage }] =
      await Promise.all([
        supabase.from("profiles").select("*", { count: "exact" }),
        supabase.from("checklist_templates").select("*", { count: "exact" }),
        supabase.from("submitted_reports").select("created_at", { count: "exact" }),
        supabase.from("organizations").select("*", { count: "exact" }),
        supabase.from("checklist_responses").select("photo_url").not("photo_url", "is", null),
      ])

    // Calculate database size estimate
    const estimatedDbSize =
      (profiles?.length || 0) * 2 + // ~2KB per profile
      (templates?.length || 0) * 3 + // ~3KB per template
      (reports?.length || 0) * 5 + // ~5KB per report
      (organizations?.length || 0) * 1 // ~1KB per org

    const estimatedDbSizeKB = estimatedDbSize
    const estimatedDbSizeMB = estimatedDbSize / 1024
    const estimatedDbSizeBytes = estimatedDbSize * 1024

    // Calculate storage size
    const photoCount = storage?.length || 0
    const estimatedStorageBytes = photoCount * 500 * 1024 // Average 500KB per photo
    const estimatedStorageMB = estimatedStorageBytes / (1024 * 1024)

    // Calculate monthly email usage (reports created this month)
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const reportsThisMonth = reports?.filter((r) => new Date(r.created_at) >= startOfMonth).length || 0
    const estimatedEmailsSent = reportsThisMonth * 2 // Estimate 2 emails per report

    // Estimate bandwidth (very rough: 2x storage size + API calls)
    const estimatedBandwidthBytes = estimatedStorageBytes * 2 + reports?.length * 10000 // 10KB per API call
    const estimatedBandwidthMB = estimatedBandwidthBytes / (1024 * 1024)
    const estimatedBandwidthGB = estimatedBandwidthMB / 1024

    // Define free tier limits
    const FREE_TIER_LIMITS = {
      supabaseDb: 500, // 500 MB
      supabaseStorage: 1024, // 1 GB (in MB)
      resendEmails: 3000, // 3,000 emails/month
      vercelBandwidth: 100, // 100 GB/month
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      supabase: {
        database: {
          usedMB: estimatedDbSizeMB,
          usedBytes: estimatedDbSizeBytes,
          limitMB: FREE_TIER_LIMITS.supabaseDb,
          percentUsed: (estimatedDbSizeMB / FREE_TIER_LIMITS.supabaseDb) * 100,
          status:
            estimatedDbSizeMB > FREE_TIER_LIMITS.supabaseDb * 0.9
              ? "critical"
              : estimatedDbSizeMB > FREE_TIER_LIMITS.supabaseDb * 0.7
                ? "warning"
                : "healthy",
        },
        storage: {
          usedMB: estimatedStorageMB,
          usedBytes: estimatedStorageBytes,
          photoCount: photoCount,
          limitMB: FREE_TIER_LIMITS.supabaseStorage,
          percentUsed: (estimatedStorageMB / FREE_TIER_LIMITS.supabaseStorage) * 100,
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
          percentUsed: (estimatedEmailsSent / FREE_TIER_LIMITS.resendEmails) * 100,
          status:
            estimatedEmailsSent > FREE_TIER_LIMITS.resendEmails * 0.9
              ? "critical"
              : estimatedEmailsSent > FREE_TIER_LIMITS.resendEmails * 0.7
                ? "warning"
                : "healthy",
        },
      },
      vercel: {
        bandwidth: {
          usedGB: estimatedBandwidthGB,
          limitGB: FREE_TIER_LIMITS.vercelBandwidth,
          percentUsed: (estimatedBandwidthGB / FREE_TIER_LIMITS.vercelBandwidth) * 100,
          status:
            estimatedBandwidthGB > FREE_TIER_LIMITS.vercelBandwidth * 0.9
              ? "critical"
              : estimatedBandwidthGB > FREE_TIER_LIMITS.vercelBandwidth * 0.7
                ? "warning"
                : "healthy",
        },
      },
      counts: {
        profiles: profiles?.length || 0,
        templates: templates?.length || 0,
        reports: reports?.length || 0,
        organizations: organizations?.length || 0,
        reportsThisMonth: reportsThisMonth,
      },
      note: "Metrics are estimates based on database records. Connect Supabase Management API, Vercel API, and Resend API for accurate real-time data.",
    })
  } catch (error: any) {
    console.error("[v0] Usage metrics error:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch usage metrics" }, { status: 500 })
  }
}
