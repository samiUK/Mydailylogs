import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"
import { sendPasswordResetEmail } from "@/lib/email/resend"
import crypto from "crypto"

export async function POST(request: NextRequest) {
  console.log("[v0] Admin password reset API route called")

  try {
    const { userEmail } = await request.json()
    console.log("[v0] Received userEmail:", userEmail)

    if (!userEmail) {
      return NextResponse.json({ error: "User email is required" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Get user details for personalized email
    const { data: users, error: getUserError } = await supabase.auth.admin.listUsers()

    if (getUserError) {
      console.error("[v0] Error fetching users:", getUserError)
      return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 })
    }

    const user = users.users.find((u) => u.email === userEmail)

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const token = crypto.randomBytes(32).toString("hex")
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 12) // 12 hour expiration

    // Store token in database
    const { error: insertError } = await supabase.from("password_reset_tokens").insert({
      user_id: user.id,
      user_email: userEmail,
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

    console.log("[v0] Generated reset URL with 12-hour token")

    const firstName = user.user_metadata?.first_name || user.user_metadata?.full_name?.split(" ")[0] || "there"

    console.log("[v0] Sending custom branded password reset email to:", userEmail, "with name:", firstName)

    // Send our custom branded email with the link
    const emailResult = await sendPasswordResetEmail(userEmail, firstName, resetUrl)

    if (!emailResult.success) {
      console.error("[v0] Failed to send password reset email:", emailResult.error)
      return NextResponse.json({ error: "Failed to send password reset email" }, { status: 500 })
    }

    console.log("[v0] Custom password reset email sent successfully via Resend")

    return NextResponse.json({
      success: true,
      message: "Password reset email sent successfully (valid for 12 hours)",
      userEmail,
    })
  } catch (error) {
    console.error("[v0] API route error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}
