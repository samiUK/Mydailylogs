import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  console.log("[v0] Password reset API route called")

  try {
    const { userEmail } = await request.json()
    console.log("[v0] Received userEmail:", userEmail)

    if (!userEmail) {
      return NextResponse.json({ error: "User email is required" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // This bypasses the auth hooks that require authorization tokens
    const { data, error } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email: userEmail,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset-password`,
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
    console.log(
      "[v0] To send emails automatically, configure Custom SMTP in Supabase Dashboard > Authentication > Email Templates",
    )
    console.log("[v0] For now, you can manually send this link to the user or copy it from console")

    return NextResponse.json({
      success: true,
      message: "Password reset link generated. Configure SMTP in Supabase to send emails automatically.",
      recoveryLink: data.properties.action_link,
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
