import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: Request) {
  try {
    const { userId, masterAdminId } = await request.json()

    if (!userId || !masterAdminId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    console.log("[v0] Impersonation request - Target user:", userId, "By master:", masterAdminId)

    const adminClient = createAdminClient()

    const { data: masterProfile } = await adminClient.from("profiles").select("role").eq("id", masterAdminId).single()

    if (!masterProfile || masterProfile.role !== "master_admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { data: targetProfile } = await adminClient
      .from("profiles")
      .select("*, auth.users(email)")
      .eq("id", userId)
      .single()

    if (!targetProfile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const {
      data: { user: targetUser },
      error: userError,
    } = await adminClient.auth.admin.getUserById(userId)

    if (userError || !targetUser || !targetUser.email) {
      console.error("[v0] Error getting user:", userError)
      return NextResponse.json({ error: "Failed to get user details" }, { status: 500 })
    }

    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: "magiclink",
      email: targetUser.email,
      options: {
        redirectTo:
          targetProfile.role === "admin"
            ? `${process.env.NEXT_PUBLIC_SITE_URL}/admin`
            : `${process.env.NEXT_PUBLIC_SITE_URL}/staff`,
      },
    })

    if (linkError || !linkData) {
      console.error("[v0] Error generating magic link:", linkError)
      return NextResponse.json({ error: "Failed to generate login link" }, { status: 500 })
    }

    await adminClient.from("audit_logs").insert({
      action: "impersonation",
      user_id: userId,
      details: {
        impersonated_by: masterAdminId,
        target_email: targetUser.email,
        target_role: targetProfile.role,
        timestamp: new Date().toISOString(),
      },
    })

    console.log("[v0] Impersonation link generated successfully")

    return NextResponse.json({
      success: true,
      loginUrl: linkData.properties.action_link,
      userEmail: targetUser.email,
      userRole: targetProfile.role,
    })
  } catch (error) {
    console.error("[v0] Impersonation error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}
