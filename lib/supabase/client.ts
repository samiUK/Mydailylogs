import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      get(name: string) {
        return document.cookie
          .split("; ")
          .find((row) => row.startsWith(`${name}=`))
          ?.split("=")[1]
      },
      set(name: string, value: string, options: any) {
        document.cookie = `${name}=${value}; path=/; ${options?.maxAge ? `max-age=${options.maxAge};` : ""} ${options?.sameSite ? `samesite=${options.sameSite};` : "samesite=lax;"} ${options?.secure ? "secure;" : ""}`
      },
      remove(name: string, options: any) {
        document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; ${options?.sameSite ? `samesite=${options.sameSite};` : "samesite=lax;"}`
      },
    },
  })
}

export const supabase = createClient()
