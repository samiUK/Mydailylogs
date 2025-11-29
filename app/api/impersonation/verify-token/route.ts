import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  console.log("[v0] Impersonation verify-token API called")

  try {
    const body = await request.json()
    const { token } = body

    console.log("[v0] Received token:", token?.substring(0, 10) + "...")

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Fetch and verify token
    const { data: tokenData, error: tokenError } = await adminClient
      .from("impersonation_tokens")
      .select("*")
      .eq("token", token.toUpperCase())
      .eq("is_active", true)
      .gt("expires_at", new Date().toISOString())
      .is("used_at", null)
      .single()

    console.log("[v0] Token verification result:", { found: !!tokenData, error: tokenError })

    if (tokenError || !tokenData) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 })
    }

    // Mark token as used
    await adminClient
      .from("impersonation_tokens")
      .update({
        used_at: new Date().toISOString(),
        is_active: false,
      })
      .eq("id", tokenData.id)

    const { data: sessionData, error: sessionError } = await adminClient.auth.admin.createSession({
      user_id: tokenData.target_user_id,
    })

    console.log("[v0] Session creation result:", { success: !!sessionData, error: sessionError })

    if (sessionError || !sessionData) {
      console.error("[v0] Failed to create session:", sessionError)
      throw new Error("Failed to create session")
    }

    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      },
    )

    await supabase.auth.setSession({
      access_token: sessionData.session.access_token,
      refresh_token: sessionData.session.refresh_token,
    })

    console.log("[v0] Session established successfully for impersonation")

    const response = NextResponse.json({
      success: true,
      impersonationData: {
        userId: tokenData.target_user_id,
        userEmail: tokenData.target_user_email,
        userRole: tokenData.target_user_role,
        organizationId: tokenData.organization_id,
        masterAdminEmail: tokenData.master_admin_email,
      },
      redirectPath: `/${tokenData.target_user_role}`,
    })

    console.log("[v0] Impersonation verification successful")

    return response
  } catch (error) {
    console.error("[v0] Token verification error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
