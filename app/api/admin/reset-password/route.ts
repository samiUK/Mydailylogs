import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"
import { sendPasswordResetEmail } from "@/lib/email/resend"

export async function POST(request: NextRequest) {
  console.log("[v0] Password reset API route called")

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

    const { data, error } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email: userEmail,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.mydaylogs.co.uk"}/auth/reset-password`,
      },
    })

    if (error) {
      console.error("[v0] Error generating reset link:", error.message)
      return NextResponse.json({ error: `Failed to generate reset link: ${error.message}` }, { status: 500 })
    }

    if (!data.properties?.action_link) {
      console.error("[v0] No action link generated")
      return NextResponse.json({ error: "Failed to generate reset link" }, { status: 500 })
    }

    console.log("[v0] Recovery link generated successfully")
    console.log("[v0] Recovery URL:", data.properties.action_link)

    // Send password reset email via Resend
    const emailResult = await sendPasswordResetEmail(
      userEmail,
      user.user_metadata?.first_name || user.user_metadata?.full_name || "there",
      data.properties.action_link,
    )

    if (!emailResult.success) {
      console.error("[v0] Failed to send password reset email:", emailResult.error)
      return NextResponse.json({ error: "Failed to send password reset email" }, { status: 500 })
    }

    console.log("[v0] Password reset email sent successfully via Resend to:", userEmail)

    return NextResponse.json({
      success: true,
      message: "Password reset email sent successfully",
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
