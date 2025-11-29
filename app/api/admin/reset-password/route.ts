import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"
import { sendPasswordResetEmail } from "@/lib/email/resend"

function generateResetToken() {
  return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("")
}

export async function POST(request: NextRequest) {
  console.log("[v0] Admin password reset API route called")

  try {
    const { userEmail } = await request.json()
    console.log("[v0] Received userEmail:", userEmail)

    if (!userEmail) {
      return NextResponse.json({ error: "User email is required" }, { status: 400 })
    }

    const supabase = createAdminClient()
    console.log("[v0] Admin client created")

    // Get user details for personalized email
    const { data: users, error: getUserError } = await supabase.auth.admin.listUsers()

    if (getUserError) {
      console.error("[v0] Error fetching users:", getUserError)
      return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 })
    }

    const user = users.users.find((u) => u.email === userEmail)

    if (!user) {
      console.log("[v0] User not found with email:", userEmail)
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    console.log("[v0] User found:", user.id)

    const token = generateResetToken()
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 12) // 12 hour expiration

    console.log("[v0] Generated token, expires at:", expiresAt)
    console.log("[v0] Attempting to insert into password_reset_tokens...")

    const { error: insertError } = await supabase.from("password_reset_tokens").insert({
      user_id: user.id,
      user_email: userEmail,
      token,
      expires_at: expiresAt.toISOString(),
      is_active: true,
    })

    if (insertError) {
      console.error("[v0] Error storing reset token:", insertError)
      console.error("[v0] Error details:", JSON.stringify(insertError, null, 2))
      return NextResponse.json(
        {
          error: `Failed to store reset token: ${insertError.message}`,
          details: insertError,
        },
        { status: 500 },
      )
    }

    console.log("[v0] Token stored successfully in database")

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.mydaylogs.co.uk"
    const cleanBaseUrl = baseUrl.replace(/\/$/, "")
    const resetUrl = cleanBaseUrl.startsWith("http")
      ? `${cleanBaseUrl}/auth/reset-password?token=${token}`
      : `https://${cleanBaseUrl}/auth/reset-password?token=${token}`

    console.log("[v0] Generated reset URL (valid for 12 hours):", resetUrl)

    // Get first name for personalized email
    const firstName = user.user_metadata?.first_name || user.user_metadata?.full_name?.split(" ")[0] || "there"

    console.log("[v0] Sending custom branded password reset email to:", userEmail, "with name:", firstName)

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
    console.error("[v0] Error stack:", error instanceof Error ? error.stack : "No stack trace")
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
        type: error instanceof Error ? error.constructor.name : typeof error,
      },
      { status: 500 },
    )
  }
}
