import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const [
      { count: profilesCount },
      { count: templatesCount },
      { count: reportsCount },
      { count: organizationsCount },
    ] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("checklist_templates").select("*", { count: "exact", head: true }),
      supabase.from("submitted_reports").select("*", { count: "exact", head: true }),
      supabase.from("organizations").select("*", { count: "exact", head: true }),
    ])

    // Estimate database size based on row counts
    const estimatedDbSize =
      (profilesCount || 0) * 2 + // ~2KB per profile
      (templatesCount || 0) * 3 + // ~3KB per template
      (reportsCount || 0) * 5 + // ~5KB per report
      (organizationsCount || 0) * 1 // ~1KB per org

    const estimatedDbSizeKB = estimatedDbSize
    const estimatedDbSizeMB = estimatedDbSize / 1024

    const { data: responsesWithPhotos } = await supabase
      .from("checklist_responses")
      .select("photo_url")
      .not("photo_url", "is", null)

    const photoCount = responsesWithPhotos?.length || 0

    // Estimate storage (average 500KB per photo)
    const estimatedStorageBytes = photoCount * 500 * 1024
    const estimatedStorageMB = estimatedStorageBytes / (1024 * 1024)

    // For free tier limits
    const FREE_TIER_LIMITS = {
      databaseSize: 500 * 1024 * 1024, // 500 MB
      storage: 1 * 1024 * 1024 * 1024, // 1 GB
      apiRequests: 500000, // 500k per month
      bandwidth: 5 * 1024 * 1024 * 1024, // 5 GB per month
    }

    // Estimate API requests (very rough estimate: 10 API calls per report submission)
    const estimatedApiRequests = (reportsCount || 0) * 10

    return NextResponse.json({
      databaseSize: estimatedDbSizeKB,
      databaseSizeMB: estimatedDbSizeMB,
      databaseLimit: FREE_TIER_LIMITS.databaseSize,
      storageSize: estimatedStorageBytes,
      storageSizeMB: estimatedStorageMB,
      storageLimit: FREE_TIER_LIMITS.storage,
      photoCount: photoCount,
      apiRequests: estimatedApiRequests,
      apiRequestsLimit: FREE_TIER_LIMITS.apiRequests,
      bandwidth: estimatedStorageBytes * 2, // Rough estimate: 2x storage
      bandwidthLimit: FREE_TIER_LIMITS.bandwidth,
      counts: {
        profiles: profilesCount,
        templates: templatesCount,
        reports: reportsCount,
        organizations: organizationsCount,
      },
      note: "Metrics are estimates. Connect Supabase Management API for accurate real-time data.",
    })
  } catch (error) {
    console.error("[v0] Error fetching Supabase metrics:", error)
    return NextResponse.json({ error: "Failed to fetch metrics" }, { status: 500 })
  }
}
