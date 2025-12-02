import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { sendVerificationEmail } from "@/lib/email/resend"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    // Get user profile for name
    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, full_name, is_email_verified")
      .eq("id", user.id)
      .single()

    if (profile?.is_email_verified) {
      return NextResponse.json({ success: true, message: "Email already verified" })
    }

    const verificationToken = crypto.randomUUID()
    const verificationLink = `${process.env.NEXT_PUBLIC_SITE_URL || "https://mydaylogs.co.uk"}/auth/verify-email?token=${verificationToken}&email=${encodeURIComponent(user.email!)}`

    console.log("[v0] Generating verification link for:", user.email)

    // Send verification email via Resend
    const emailResult = await sendVerificationEmail(
      user.email!,
      profile?.first_name || profile?.full_name || "there",
      verificationLink,
    )

    if (!emailResult.success) {
      console.error("[v0] Failed to send verification email:", emailResult.error)
      return NextResponse.json(
        { success: false, error: "Failed to send verification email. Please try again later." },
        { status: 500 },
      )
    }

    console.log("[v0] Verification email sent successfully via Resend to:", user.email)

    return NextResponse.json({
      success: true,
      message: "Verification email sent successfully. Please check your inbox.",
    })
  } catch (error) {
    console.error("[v0] Resend verification error:", error)
    return NextResponse.json({ success: false, error: "An unexpected error occurred" }, { status: 500 })
  }
}
