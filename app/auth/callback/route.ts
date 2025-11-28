import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const next = requestUrl.searchParams.get("next") || "/auth/reset-password"

  const error = requestUrl.searchParams.get("error")
  const errorDescription = requestUrl.searchParams.get("error_description")

  console.log("[v0] Auth callback triggered:", {
    code: !!code,
    next,
    error,
    errorDescription,
    fullUrl: request.url,
  })

  if (error) {
    console.log("[v0] Auth error detected:", error, errorDescription)
    return NextResponse.redirect(
      `${requestUrl.origin}/auth/login?error=${encodeURIComponent(errorDescription || "Authentication failed. Please request a new password reset link.")}`,
    )
  }

  if (code) {
    const supabase = await createClient()

    // Exchange the code for a session
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    console.log("[v0] Code exchange result:", {
      success: !!data.session,
      error: exchangeError?.message,
    })

    if (exchangeError) {
      console.error("[v0] Error exchanging code:", exchangeError)
      return NextResponse.redirect(
        `${requestUrl.origin}/auth/login?error=Could not authenticate. Please request a new password reset link.`,
      )
    }

    if (data.session) {
      console.log("[v0] Session established, redirecting to:", next)
      return NextResponse.redirect(`${requestUrl.origin}${next}`)
    }
  }

  // Return HTML that will handle the hash fragment client-side
  return new NextResponse(
    `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Authenticating...</title>
      </head>
      <body>
        <script>
          // Extract tokens from hash fragment
          const hash = window.location.hash.substring(1);
          const params = new URLSearchParams(hash);
          
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');
          const error = params.get('error');
          const errorDescription = params.get('error_description');
          
          if (error) {
            console.error('[v0] Auth error in hash:', error, errorDescription);
            window.location.href = '/auth/login?error=' + encodeURIComponent(errorDescription || 'Authentication failed');
          } else if (accessToken) {
            // Redirect to reset password page - Supabase will handle the session
            window.location.href = '${next}';
          } else {
            // No tokens, redirect to login
            window.location.href = '/auth/login?error=' + encodeURIComponent('No authentication tokens found');
          }
        </script>
        <p>Authenticating, please wait...</p>
      </body>
    </html>
    `,
    {
      headers: { "Content-Type": "text/html" },
    },
  )
}
