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

    const { userEmail, userId, userRole } = await request.json()

    if (!userEmail || !userId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const adminClient = createAdminClient()

    const { data, error } = await adminClient.auth.admin.generateLink({
      type: "magiclink",
      email: userEmail,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || request.headers.get("origin")}${
          userRole === "admin" ? "/admin" : "/staff"
        }`,
      },
    })

    if (error || !data) {
      console.error("[v0] Error generating magic link:", error)
      return NextResponse.json({ error: "Failed to generate login link" }, { status: 500 })
    }

    // Log impersonation activity
    await adminClient.from("impersonation_logs").insert({
      master_admin_email: superuserSession || "master@mydaylogs.co.uk",
      target_user_id: userId,
      target_user_email: userEmail,
      target_user_role: userRole || "staff",
      action: "impersonation_started",
      ip_address: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
      user_agent: request.headers.get("user-agent"),
    })

    // Return the direct login URL
    return NextResponse.json({
      success: true,
      url: data.properties.action_link, // Direct magic link URL
      userEmail,
      userRole,
    })
  } catch (error) {
    console.error("[v0] Impersonation error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}
