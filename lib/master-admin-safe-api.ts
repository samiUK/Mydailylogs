/**
 * Fail-Safe Master Admin API
 * Implements retry logic, error handling, and request deduplication
 */

// Request cache to prevent duplicate simultaneous requests
const requestCache = new Map<string, Promise<any>>()

// Simple retry wrapper
async function retryFetch(fn: () => Promise<any>, retries = 2): Promise<any> {
  try {
    return await fn()
  } catch (error) {
    if (retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      return retryFetch(fn, retries - 1)
    }
    throw error
  }
}

// Deduplicated fetch - prevents multiple simultaneous requests to the same endpoint
export async function safeFetch(url: string, options?: RequestInit): Promise<any> {
  const cacheKey = `${url}-${JSON.stringify(options)}`

  // If request is already in flight, return the existing promise
  if (requestCache.has(cacheKey)) {
    console.log("[v0] Deduplicating request to:", url)
    return requestCache.get(cacheKey)
  }

  // Create new request promise
  const requestPromise = retryFetch(async () => {
    try {
      const response = await fetch(url, options)

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`${response.status}: ${errorText}`)
      }

      return await response.json()
    } finally {
      // Remove from cache after completion
      requestCache.delete(cacheKey)
    }
  })

  requestCache.set(cacheKey, requestPromise)
  return requestPromise
}

// Batch data fetcher - fetches all dashboard data in one API call
export async function fetchDashboardDataSafe() {
  try {
    return await safeFetch("/api/master/dashboard-data")
  } catch (error: any) {
    console.error("[v0] Dashboard data fetch failed:", error)
    // Return empty data structure so UI doesn't break
    return {
      organizations: [],
      profiles: [],
      subscriptions: [],
      payments: [],
      feedback: [],
      templates: [],
    }
  }
}

// Safe auth check - uses JWT, no database queries
export async function checkAuthSafe() {
  try {
    return await safeFetch("/api/admin/check-master-auth")
  } catch (error: any) {
    console.error("[v0] Auth check failed:", error)
    return { authenticated: false, role: null }
  }
}

// Usage metrics with 1-hour cache
let cachedUsageMetrics: any = null
let cacheTimestamp = 0
const CACHE_DURATION = 60 * 60 * 1000 // 1 hour

export async function fetchUsageMetricsSafe() {
  const now = Date.now()

  // Return cached data if still valid
  if (cachedUsageMetrics && now - cacheTimestamp < CACHE_DURATION) {
    console.log("[v0] Returning cached usage metrics")
    return cachedUsageMetrics
  }

  try {
    const data = await safeFetch("/api/master/usage-metrics")
    cachedUsageMetrics = data
    cacheTimestamp = now
    return data
  } catch (error: any) {
    console.error("[v0] Usage metrics fetch failed:", error)
    // Return cached data even if expired, better than nothing
    return cachedUsageMetrics || null
  }
}

// Database stats with error handling
export async function fetchDatabaseStatsSafe() {
  try {
    return await safeFetch("/api/admin/database-stats")
  } catch (error: any) {
    console.error("[v0] Database stats fetch failed:", error)
    return {
      databaseSize: "N/A",
      totalSizeBytes: 0,
      storageSize: 0,
      photoCount: 0,
    }
  }
}

// Activity logs with error handling
export async function fetchActivityLogsSafe() {
  try {
    return await safeFetch("/api/master/activity-logs")
  } catch (error: any) {
    console.error("[v0] Activity logs fetch failed:", error)
    return []
  }
}

// Clear cache function for manual refresh
export function clearUsageMetricsCache() {
  cachedUsageMetrics = null
  cacheTimestamp = 0
}
