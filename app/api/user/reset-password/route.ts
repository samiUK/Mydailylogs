import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"
import { sendPasswordResetEmail } from "@/lib/email/resend"
import crypto from "crypto"

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: users, error: getUserError } = await supabase.auth.admin.listUsers()

    if (getUserError) {
      console.error("[v0] Error fetching users:", getUserError)
      return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 })
    }

    const user = users.users.find((u) => u.email === email)

    if (!user) {
      // Don't reveal if user exists for security
      return NextResponse.json({
        success: true,
        message: "If an account exists with that email, a password reset link has been sent.",
      })
    }

    const token = crypto.randomBytes(32).toString("hex")
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 12)

    // Store token in database
    const { error: insertError } = await supabase.from("password_reset_tokens").insert({
      user_id: user.id,
      user_email: email,
      token,
      expires_at: expiresAt.toISOString(),
      is_active: true,
    })

    if (insertError) {
      console.error("[v0] Error storing reset token:", insertError)
      return NextResponse.json({ error: "Failed to create reset token" }, { status: 500 })
    }

    // Build reset URL with custom token
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.mydaylogs.co.uk"
    const cleanBaseUrl = baseUrl.replace(/\/$/, "")
    const resetUrl = cleanBaseUrl.startsWith("http")
      ? `${cleanBaseUrl}/auth/reset-password?token=${token}`
      : `https://${cleanBaseUrl}/auth/reset-password?token=${token}`

    const firstName = user.user_metadata?.first_name || user.user_metadata?.full_name?.split(" ")[0] || "there"

    const emailResult = await sendPasswordResetEmail(email, firstName, resetUrl)

    if (!emailResult.success) {
      console.error("[v0] Failed to send password reset email:", emailResult.error)
      return NextResponse.json({ error: "Failed to send password reset email" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "If an account exists with that email, a password reset link has been sent.",
    })
  } catch (error) {
    console.error("[v0] Error in reset password:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}
