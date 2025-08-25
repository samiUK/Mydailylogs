import { createServerClient as supabaseCreateServerClient } from "@supabase/ssr"

/**
 * Especially important if using Fluid compute: Don't put this client in a
 * global variable. Always create a new client within each function when using
 * it.
 */
export async function createClient() {
  try {
    const { cookies: getCookies } = await import("next/headers")
    const cookieStore = await getCookies()

    return supabaseCreateServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
            } catch {
              // The "setAll" method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      },
    )
  } catch (error) {
    console.error("[v0] Error creating Supabase client:", error)
    throw new Error("Failed to create database connection")
  }
}

export function createServerClient(cookieStore: any) {
  try {
    return supabaseCreateServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            try {
              cookieStore.set(name, value, options)
            } catch {
              // The "set" method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
          remove(name: string, options: any) {
            try {
              cookieStore.set(name, "", { ...options, maxAge: 0 })
            } catch {
              // The "remove" method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      },
    )
  } catch (error) {
    console.error("[v0] Error creating server client:", error)
    throw new Error("Failed to create server database connection")
  }
}
