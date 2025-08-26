import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/_vercel")) {
    console.log("[v0] Middleware - Skipping Vercel internal route:", request.nextUrl.pathname)
    return NextResponse.next()
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  const sessionId = request.nextUrl.searchParams.get("session") || "default"
  const sessionPrefix = sessionId !== "default" ? `${sessionId}_` : ""

  const isMasterAdminImpersonating =
    request.cookies.get(`${sessionPrefix}masterAdminImpersonation`)?.value === "true" ||
    request.cookies.get("masterAdminImpersonation")?.value === "true"

  console.log("[v0] Middleware - Path:", request.nextUrl.pathname)
  console.log("[v0] Middleware - Session ID:", sessionId)
  console.log(
    "[v0] Middleware - masterAdminImpersonation cookie:",
    request.cookies.get(`${sessionPrefix}masterAdminImpersonation`)?.value ||
      request.cookies.get("masterAdminImpersonation")?.value,
  )
  console.log("[v0] Middleware - isMasterAdminImpersonating:", isMasterAdminImpersonating)

  if (request.nextUrl.pathname.startsWith("/masterdashboard")) {
    if (!isMasterAdminImpersonating) {
      console.log("[v0] Middleware - No master admin authentication, redirecting to masterlogin")
      const url = request.nextUrl.clone()
      url.pathname = "/masterlogin"
      if (sessionId !== "default") {
        url.searchParams.set("session", sessionId)
      }
      return NextResponse.redirect(url)
    }
    console.log("[v0] Middleware - Master admin authenticated, allowing access to masterdashboard")
    return supabaseResponse
  }

  // Master admin routes - only accessible during impersonation or master login
  if (request.nextUrl.pathname.startsWith("/master-admin/")) {
    if (!isMasterAdminImpersonating) {
      const url = request.nextUrl.clone()
      url.pathname = "/masterlogin"
      if (sessionId !== "default") {
        url.searchParams.set("session", sessionId)
      }
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  // Admin routes - separate from staff routes
  if (request.nextUrl.pathname.startsWith("/admin/")) {
    // Allow impersonation access
    if (isMasterAdminImpersonating) {
      return supabaseResponse
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll().map((cookie) => ({
              ...cookie,
              name: cookie.name.startsWith(`${sessionPrefix}sb-`)
                ? cookie.name
                : cookie.name.startsWith("sb-")
                  ? `${sessionPrefix}${cookie.name}`
                  : cookie.name,
            }))
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => {
              const prefixedName = name.startsWith("sb-") ? `${sessionPrefix}${name}` : name
              request.cookies.set(prefixedName, value)
            })
            supabaseResponse = NextResponse.next({
              request,
            })
            cookiesToSet.forEach(({ name, value, options }) => {
              const prefixedName = name.startsWith("sb-") ? `${sessionPrefix}${name}` : name
              supabaseResponse.cookies.set(prefixedName, value, options)
            })
          },
        },
      },
    )

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = "/auth/login"
      url.searchParams.set("redirect", request.nextUrl.pathname)
      if (sessionId !== "default") {
        url.searchParams.set("session", sessionId)
      }
      return NextResponse.redirect(url)
    }

    return supabaseResponse
  }

  // Staff routes - separate from admin routes
  if (request.nextUrl.pathname.startsWith("/staff/")) {
    // Allow impersonation access
    if (isMasterAdminImpersonating) {
      return supabaseResponse
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll().map((cookie) => ({
              ...cookie,
              name: cookie.name.startsWith(`${sessionPrefix}sb-`)
                ? cookie.name
                : cookie.name.startsWith("sb-")
                  ? `${sessionPrefix}${cookie.name}`
                  : cookie.name,
            }))
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => {
              const prefixedName = name.startsWith("sb-") ? `${sessionPrefix}${name}` : name
              request.cookies.set(prefixedName, value)
            })
            supabaseResponse = NextResponse.next({
              request,
            })
            cookiesToSet.forEach(({ name, value, options }) => {
              const prefixedName = name.startsWith("sb-") ? `${sessionPrefix}${name}` : name
              supabaseResponse.cookies.set(prefixedName, value, options)
            })
          },
        },
      },
    )

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = "/auth/login"
      url.searchParams.set("redirect", request.nextUrl.pathname)
      if (sessionId !== "default") {
        url.searchParams.set("session", sessionId)
      }
      return NextResponse.redirect(url)
    }

    return supabaseResponse
  }

  let user = null
  if (!isMasterAdminImpersonating) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll().map((cookie) => ({
              ...cookie,
              name: cookie.name.startsWith(`${sessionPrefix}sb-`)
                ? cookie.name
                : cookie.name.startsWith("sb-")
                  ? `${sessionPrefix}${cookie.name}`
                  : cookie.name,
            }))
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => {
              const prefixedName = name.startsWith("sb-") ? `${sessionPrefix}${name}` : name
              request.cookies.set(prefixedName, value)
            })
            supabaseResponse = NextResponse.next({
              request,
            })
            cookiesToSet.forEach(({ name, value, options }) => {
              const prefixedName = name.startsWith("sb-") ? `${sessionPrefix}${name}` : name
              supabaseResponse.cookies.set(prefixedName, value, options)
            })
          },
        },
      },
    )

    const {
      data: { user: supabaseUser },
    } = await supabase.auth.getUser()
    user = supabaseUser
  }

  console.log("[v0] Middleware - User exists:", !!user)

  if (
    request.nextUrl.pathname !== "/" &&
    !user &&
    !isMasterAdminImpersonating &&
    !request.nextUrl.pathname.startsWith("/login") &&
    !request.nextUrl.pathname.startsWith("/auth") &&
    !request.nextUrl.pathname.startsWith("/masterlogin") &&
    !request.nextUrl.pathname.startsWith("/api/send-email") &&
    !request.nextUrl.pathname.startsWith("/api/admin/") &&
    !request.nextUrl.pathname.startsWith("/external/form/") &&
    !request.nextUrl.pathname.match(/^\/[^/]+\/reports\/external\/form\/[^/]+$/)
  ) {
    console.log("[v0] Middleware - Redirecting to auth/login")
    const url = request.nextUrl.clone()
    url.pathname = "/auth/login"
    if (sessionId !== "default") {
      url.searchParams.set("session", sessionId)
    }
    return NextResponse.redirect(url)
  }

  console.log("[v0] Middleware - Allowing access to:", request.nextUrl.pathname)

  return supabaseResponse
}
