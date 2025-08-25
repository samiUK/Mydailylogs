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

  const isMasterAdminImpersonating = request.cookies.get("masterAdminImpersonation")?.value === "true"

  console.log("[v0] Middleware - Path:", request.nextUrl.pathname)
  console.log(
    "[v0] Middleware - masterAdminImpersonation cookie:",
    request.cookies.get("masterAdminImpersonation")?.value,
  )
  console.log("[v0] Middleware - isMasterAdminImpersonating:", isMasterAdminImpersonating)

  // Master admin routes - only accessible during impersonation or master login
  if (request.nextUrl.pathname.startsWith("/master-admin/")) {
    if (!isMasterAdminImpersonating) {
      const url = request.nextUrl.clone()
      url.pathname = "/masterlogin"
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

    // Regular admin authentication
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            supabaseResponse = NextResponse.next({
              request,
            })
            cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
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

    // Regular staff authentication
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            supabaseResponse = NextResponse.next({
              request,
            })
            cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
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
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            supabaseResponse = NextResponse.next({
              request,
            })
            cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
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

  if (request.nextUrl.pathname.startsWith("/masterdashboard")) {
    if (!isMasterAdminImpersonating && user) {
      console.log("[v0] Middleware - Blocking regular user from masterdashboard, redirecting to admin")
      const url = request.nextUrl.clone()
      url.pathname = "/admin"
      return NextResponse.redirect(url)
    }
  }

  console.log(
    "[v0] Middleware - Should redirect:",
    request.nextUrl.pathname !== "/" &&
      !user &&
      !isMasterAdminImpersonating &&
      !request.nextUrl.pathname.startsWith("/login") &&
      !request.nextUrl.pathname.startsWith("/auth") &&
      !request.nextUrl.pathname.startsWith("/masterlogin") &&
      !request.nextUrl.pathname.startsWith("/api/send-email") &&
      !request.nextUrl.pathname.startsWith("/api/admin/") &&
      !request.nextUrl.pathname.match(/^\/admin\/[^/]+$/) &&
      !request.nextUrl.pathname.match(/^\/staff\/[^/]+$/) &&
      !request.nextUrl.pathname.startsWith("/external/form/") &&
      !request.nextUrl.pathname.match(/^\/[^/]+\/reports\/external\/form\/[^/]+$/),
  )

  if (
    request.nextUrl.pathname !== "/" &&
    !user &&
    !isMasterAdminImpersonating && // Allow access when master admin is impersonating
    !request.nextUrl.pathname.startsWith("/login") &&
    !request.nextUrl.pathname.startsWith("/auth") &&
    !request.nextUrl.pathname.startsWith("/masterlogin") &&
    !request.nextUrl.pathname.startsWith("/api/send-email") &&
    !request.nextUrl.pathname.startsWith("/api/admin/") &&
    !request.nextUrl.pathname.match(/^\/admin\/[^/]+$/) &&
    !request.nextUrl.pathname.match(/^\/staff\/[^/]+$/) &&
    !request.nextUrl.pathname.startsWith("/external/form/") &&
    !request.nextUrl.pathname.match(/^\/[^/]+\/reports\/external\/form\/[^/]+$/)
  ) {
    console.log("[v0] Middleware - Redirecting to auth/login")
    // no user, potentially respond by redirecting the user to the login page
    const url = request.nextUrl.clone()
    url.pathname = "/auth/login"
    return NextResponse.redirect(url)
  }

  console.log("[v0] Middleware - Allowing access to:", request.nextUrl.pathname)

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse
}
