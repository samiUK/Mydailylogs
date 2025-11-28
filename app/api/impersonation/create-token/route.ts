import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()

    const masterAdminSession = cookieStore.get("master-admin-session")?.value
    const isMasterAdmin = masterAdminSession === "authenticated"

    const superuserSession = cookieStore.get("superuser-session")?.value
    const superuserEmail = cookieStore.get("superuser-email")?.value
    const isSuperuser = superuserSession === "authenticated" && superuserEmail

    if (!isMasterAdmin && !isSuperuser) {
      return NextResponse.json(
        { error: "Unauthorized: Only master admin and support admins can create impersonation tokens" },
        { status: 403 },
      )
    }

    const masterAdminEmail = isMasterAdmin ? "master@mydaylogs.co.uk" : superuserEmail!

    const body = await request.json()
    const { userId, userEmail, userRole, organizationId } = body

    if (!userId || !userEmail || !userRole) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Generate a short, secure token (8 characters)
    const token = Array.from(crypto.getRandomValues(new Uint8Array(6)))
      .map((b) => b.toString(36))
      .join("")
      .substring(0, 8)
      .toUpperCase()

    // Token expires in 15 minutes
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()

    const supabase = createAdminClient()

    // Insert token into database
    const { data: tokenData, error: tokenError } = await supabase
      .from("impersonation_tokens")
      .insert({
        token,
        master_admin_email: masterAdminEmail,
        target_user_id: userId,
        target_user_email: userEmail,
        target_user_role: userRole,
        organization_id: organizationId,
        expires_at: expiresAt,
        ip_address: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
        user_agent: request.headers.get("user-agent"),
      })
      .select()
      .single()

    if (tokenError) {
      console.error("[v0] Error creating impersonation token:", tokenError)
      return NextResponse.json({ error: "Failed to create impersonation token" }, { status: 500 })
    }

    // Generate the short, clean URL
    const impersonationUrl = `${process.env.NEXT_PUBLIC_SITE_URL || request.headers.get("origin")}/impersonate/${token}`

    return NextResponse.json({
      success: true,
      token,
      url: impersonationUrl,
      expiresAt,
    })
  } catch (error) {
    console.error("[v0] Impersonation token creation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
