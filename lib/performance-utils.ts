import { createClient } from "@/lib/supabase/server"

// Enhanced caching with longer durations for static data
const cache = new Map<string, { data: any; timestamp: number; ttl: number }>()

export function getCachedData<T>(key: string): T | null {
  const cached = cache.get(key)
  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    return cached.data
  }
  cache.delete(key)
  return null
}

export function setCachedData<T>(key: string, data: T, ttlMinutes = 30): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl: ttlMinutes * 60 * 1000,
  })
}

// Optimized database queries with proper indexing
export async function getOptimizedProfiles(organizationId: string) {
  const cacheKey = `profiles_${organizationId}`
  const cached = getCachedData(cacheKey)
  if (cached) return cached

  const supabase = await createClient()

  const { data, error } = await supabase
    .from("profiles")
    .select(`
      id,
      email,
      first_name,
      last_name,
      full_name,
      role,
      position,
      reports_to,
      avatar_url
    `)
    .eq("organization_id", organizationId)
    .order("full_name")
    .limit(50) // Add limit to prevent large queries

  if (error) throw error

  setCachedData(cacheKey, data, 15) // Cache for 15 minutes
  return data
}

export async function getOptimizedTemplateAssignments(organizationId: string, userId?: string) {
  const cacheKey = `assignments_${organizationId}_${userId || "all"}`
  const cached = getCachedData(cacheKey)
  if (cached) return cached

  const supabase = await createClient()

  let query = supabase
    .from("template_assignments")
    .select(`
      id,
      status,
      assigned_at,
      completed_at,
      template_id,
      assigned_to,
      checklist_templates!inner(
        id,
        name,
        description,
        is_active
      )
    `)
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .order("assigned_at", { ascending: false })
    .limit(25) // Reduced limit

  if (userId) {
    query = query.eq("assigned_to", userId)
  }

  const { data, error } = await query

  if (error) throw error

  setCachedData(cacheKey, data, 10) // Cache for 10 minutes
  return data
}

export async function getOptimizedReports(organizationId: string, limit = 25) {
  const cacheKey = `reports_${organizationId}_${limit}`
  const cached = getCachedData(cacheKey)
  if (cached) return cached

  const supabase = await createClient()

  const { data, error } = await supabase
    .from("submitted_reports")
    .select(`
      id,
      template_name,
      status,
      submitted_at,
      submitted_by,
      notes,
      profiles!inner(
        full_name,
        email
      )
    `)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("submitted_at", { ascending: false })
    .limit(limit) // Use parameter limit

  if (error) throw error

  setCachedData(cacheKey, data, 5) // Cache for 5 minutes
  return data
}

// Clear cache when data is updated
export function clearCache(pattern?: string) {
  if (pattern) {
    for (const key of cache.keys()) {
      if (key.includes(pattern)) {
        cache.delete(key)
      }
    }
  } else {
    cache.clear()
  }
}

export function cleanupMemory() {
  // Clear expired cache entries
  const now = Date.now()
  for (const [key, value] of cache.entries()) {
    if (now - value.timestamp > value.ttl) {
      cache.delete(key)
    }
  }

  // Force garbage collection if available
  if (global.gc) {
    global.gc()
  }
}

let cleanupInterval: NodeJS.Timeout | null = null

export function startMemoryCleanup() {
  if (cleanupInterval) return
  cleanupInterval = setInterval(cleanupMemory, 5 * 60 * 1000) // Every 5 minutes
}

export function stopMemoryCleanup() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval)
    cleanupInterval = null
  }
}
