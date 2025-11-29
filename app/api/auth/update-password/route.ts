import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { token, newPassword } = await request.json()

    if (!token || !newPassword) {
      return NextResponse.json({ error: "Token and new password are required" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Validate token
    const { data: tokenRecord, error: tokenError } = await supabase
      .from("password_reset_tokens")
      .select("*")
      .eq("token", token)
      .eq("is_active", true)
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .single()

    if (tokenError || !tokenRecord) {
      console.error("[v0] Invalid or expired token:", tokenError)
      return NextResponse.json({ error: "Invalid or expired reset token" }, { status: 400 })
    }

    // Update password using admin client
    const { error: updateError } = await supabase.auth.admin.updateUserById(tokenRecord.user_id, {
      password: newPassword,
    })

    if (updateError) {
      console.error("[v0] Error updating password:", updateError)
      return NextResponse.json({ error: "Failed to update password" }, { status: 500 })
    }

    // Mark token as used
    await supabase
      .from("password_reset_tokens")
      .update({
        used_at: new Date().toISOString(),
        is_active: false,
      })
      .eq("token", token)

    console.log("[v0] Password updated successfully for user:", tokenRecord.user_email)

    return NextResponse.json({
      success: true,
      message: "Password updated successfully",
    })
  } catch (error) {
    console.error("[v0] API route error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}
