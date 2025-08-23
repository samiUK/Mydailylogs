import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  console.log("[v0] API route called")

  try {
    const { userEmail } = await request.json()
    console.log("[v0] Received userEmail:", userEmail)

    if (!userEmail) {
      return NextResponse.json({ error: "User email is required" }, { status: 400 })
    }

    console.log("[v0] Creating admin Supabase client")
    const supabase = createAdminClient()

    console.log("[v0] Looking up user by email")
    const { data: userData, error: userError } = await supabase.auth.admin.listUsers()

    if (userError) {
      console.error("[v0] Error listing users:", userError)
      return NextResponse.json({ error: `Failed to find user: ${userError.message}` }, { status: 500 })
    }

    const user = userData.users.find((u) => u.email === userEmail)
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Generate secure temporary password
    const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8).toUpperCase()

    console.log("[v0] Updating user password")
    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      password: tempPassword,
    })

    if (updateError) {
      console.error("[v0] Error updating password:", updateError)
      return NextResponse.json({ error: `Failed to update password: ${updateError.message}` }, { status: 500 })
    }

    console.log("[v0] Password reset successful")
    return NextResponse.json({
      success: true,
      tempPassword,
      userEmail,
    })
  } catch (error) {
    console.error("[v0] API route error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
