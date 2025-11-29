import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    console.log("[v0] Impersonate login API called")

    const { userEmail, profileId, accessType } = await request.json()

    console.log("[v0] Impersonate login request:", { userEmail, profileId, accessType })

    if (!userEmail || !profileId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const adminClient = createAdminClient()

    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: "magiclink",
      email: userEmail,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      },
    })

    if (linkError || !linkData) {
      console.error("[v0] Error generating link:", linkError)
      return NextResponse.json({ error: "Failed to generate session" }, { status: 500 })
    }

    console.log("[v0] Magic link generated for user:", userEmail)

    // Extract tokens from the action link URL
    const actionUrl = new URL(linkData.properties.action_link)
    const accessToken = actionUrl.searchParams.get("access_token")
    const refreshToken = actionUrl.searchParams.get("refresh_token")

    if (!accessToken || !refreshToken) {
      console.error("[v0] Missing tokens in action link")
      return NextResponse.json({ error: "Failed to extract tokens" }, { status: 500 })
    }

    console.log("[v0] Tokens extracted successfully")

    const serverClient = createClient()
    const { error: sessionError } = await serverClient.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    })

    if (sessionError) {
      console.error("[v0] Error setting session:", sessionError)
      return NextResponse.json({ error: "Failed to set session" }, { status: 500 })
    }

    console.log("[v0] Session set successfully for user:", userEmail)

    // Log the access in audit logs
    const { error: auditError } = await adminClient.from("audit_logs").insert({
      action: `${accessType}_access`,
      user_id: linkData.user.id,
      details: {
        accessed_by: accessType,
        target_email: userEmail,
        profile_id: profileId,
        timestamp: new Date().toISOString(),
      },
    })

    if (auditError) {
      console.error("[v0] Audit log error:", auditError)
    }

    console.log("[v0] Admin access logged successfully")

    return NextResponse.json({
      success: true,
      message: `Successfully authenticated as ${userEmail} using ${accessType} credentials`,
      redirectUrl: linkData.user.user_metadata?.role === "admin" ? "/admin" : "/staff",
    })
  } catch (error) {
    console.error("[v0] Impersonate login error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}
