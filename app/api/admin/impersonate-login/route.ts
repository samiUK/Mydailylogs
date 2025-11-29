import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"

export async function POST(request: Request) {
  try {
    console.log("[v0] Impersonate login API called")

    const { userEmail, profileId, accessType } = await request.json()

    console.log("[v0] Impersonate login request:", { userEmail, profileId, accessType })

    if (!userEmail || !profileId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Create admin client
    const supabase = createClient()

    // Get the user by email using admin client
    const {
      data: { users },
      error: usersError,
    } = await supabase.auth.admin.listUsers()

    if (usersError) {
      console.error("[v0] Error fetching users:", usersError)
      return NextResponse.json({ error: "Failed to find user" }, { status: 500 })
    }

    const targetUser = users.find((u) => u.email === userEmail)

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    console.log("[v0] Target user found:", targetUser.id)

    // Create a session for the user using admin privileges
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.createSession({
      user_id: targetUser.id,
    })

    if (sessionError || !sessionData) {
      console.error("[v0] Session creation error:", sessionError)
      return NextResponse.json({ error: "Failed to create session" }, { status: 500 })
    }

    console.log("[v0] Session created successfully for user:", targetUser.id)

    // Set the session cookies
    const cookieStore = cookies()
    cookieStore.set({
      name: "sb-access-token",
      value: sessionData.session.access_token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: sessionData.session.expires_in,
      path: "/",
    })

    cookieStore.set({
      name: "sb-refresh-token",
      value: sessionData.session.refresh_token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    })

    // Log the access in audit logs
    const { error: auditError } = await supabase.from("audit_logs").insert({
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

    return NextResponse.json({
      success: true,
      message: `Successfully authenticated as ${userEmail} using ${accessType} credentials`,
    })
  } catch (error) {
    console.error("[v0] Impersonate login error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}
