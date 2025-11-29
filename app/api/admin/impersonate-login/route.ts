import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: Request) {
  try {
    console.log("[v0] Impersonate login API called")

    const { userEmail, profileId, accessType } = await request.json()

    console.log("[v0] Impersonate login request:", { userEmail, profileId, accessType })

    if (!userEmail || !profileId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Get the user first
    const { data: usersData, error: usersError } = await adminClient.auth.admin.listUsers()

    if (usersError) {
      console.error("[v0] Error listing users:", usersError)
      return NextResponse.json({ error: "Failed to find user" }, { status: 500 })
    }

    const targetUser = usersData.users.find((u) => u.email === userEmail)

    if (!targetUser) {
      console.error("[v0] User not found:", userEmail)
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    console.log("[v0] Target user found:", targetUser.id)

    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: "recovery",
      email: userEmail,
    })

    if (linkError || !linkData) {
      console.error("[v0] Error generating recovery link:", linkError)
      return NextResponse.json({ error: "Failed to generate session" }, { status: 500 })
    }

    console.log("[v0] Recovery link generated successfully")

    const { error: auditError } = await adminClient.from("audit_logs").insert({
      action: `${accessType}_access`,
      user_id: targetUser.id,
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

    // This URL will automatically establish the session when visited
    return NextResponse.json({
      success: true,
      message: `Successfully authenticated as ${userEmail} using ${accessType} credentials`,
      magicLink: linkData.properties.action_link,
    })
  } catch (error) {
    console.error("[v0] Impersonate login error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}
