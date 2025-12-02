import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { cookies } from "next/headers"

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const masterSession = cookieStore.get("master-admin-session")?.value
    const superuserSession = cookieStore.get("superuser-session")?.value

    // Only master admins and superusers can impersonate
    if (masterSession !== "authenticated" && !superuserSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { userEmail, userId, userRole, organizationId } = await request.json()

    if (!userEmail || !userId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Generate short, secure token (10 characters)
    const token = Array.from(crypto.getRandomValues(new Uint8Array(8)))
      .map((b) => b.toString(36))
      .join("")
      .substring(0, 10)
      .toUpperCase()

    const adminClient = createAdminClient()

    // Store token in database (expires in 10 minutes)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    const { error: tokenError } = await adminClient.from("impersonation_tokens").insert({
      token,
      master_admin_email: superuserSession || "master@mydaylogs.co.uk",
      target_user_id: userId,
      target_user_email: userEmail,
      target_user_role: userRole || "staff",
      organization_id: organizationId,
      expires_at: expiresAt,
      ip_address: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
      user_agent: request.headers.get("user-agent"),
    })

    if (tokenError) {
      console.error("[v0] Error creating impersonation token:", tokenError)
      return NextResponse.json({ error: "Failed to create token" }, { status: 500 })
    }

    // Return the impersonation URL
    const impersonateUrl = `${process.env.NEXT_PUBLIC_SITE_URL || request.headers.get("origin")}/impersonate/${token}`

    return NextResponse.json({
      success: true,
      url: impersonateUrl,
      token,
      expiresAt,
    })
  } catch (error) {
    console.error("[v0] Impersonation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
