import { createClient } from "@/lib/supabase/server"

export interface DatabaseResult<T> {
  data: T | null
  error: string | null
  loading: boolean
}

export class DatabaseError extends Error {
  constructor(
    message: string,
    public originalError?: any,
  ) {
    super(message)
    this.name = "DatabaseError"
  }
}

const profileCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 15 * 60 * 1000 // 15 minutes for better performance

export async function getUserProfile(userId: string, useCache = true): Promise<DatabaseResult<any>> {
  try {
    // Check cache first
    if (useCache) {
      const cached = profileCache.get(userId)
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return { data: cached.data, error: null, loading: false }
      }
    }

    const supabase = await createClient()
    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single()

    if (error) {
      return { data: null, error: error.message, loading: false }
    }

    // Cache the result
    if (data && useCache) {
      profileCache.set(userId, { data, timestamp: Date.now() })
    }

    return { data, error: null, loading: false }
  } catch (error) {
    return { data: null, error: "Failed to fetch user profile", loading: false }
  }
}

export async function executeQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  errorMessage = "Database operation failed",
): Promise<DatabaseResult<T>> {
  try {
    const { data, error } = await queryFn()

    if (error) {
      return { data: null, error: error.message || errorMessage, loading: false }
    }

    return { data, error: null, loading: false }
  } catch (error) {
    return { data: null, error: errorMessage, loading: false }
  }
}

export async function batchQuery<T>(
  queries: Array<() => Promise<{ data: T | null; error: any }>>,
  errorMessage = "Batch query failed",
): Promise<DatabaseResult<T[]>> {
  try {
    const results = await Promise.allSettled(queries.map((query) => query()))

    const data: T[] = []
    const errors: string[] = []

    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        if (result.value.error) {
          errors.push(`Query ${index}: ${result.value.error.message}`)
        } else if (result.value.data) {
          data.push(result.value.data)
        }
      } else {
        errors.push(`Query ${index}: ${result.reason}`)
      }
    })

    if (errors.length > 0) {
      return { data, error: errors.join("; "), loading: false }
    }

    return { data, error: null, loading: false }
  } catch (error) {
    return { data: [], error: errorMessage, loading: false }
  }
}

export function clearExpiredCache() {
  const now = Date.now()
  for (const [key, value] of profileCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      profileCache.delete(key)
    }
  }
}

setInterval(clearExpiredCache, 30 * 60 * 1000)
