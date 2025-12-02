import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { sendVerificationEmail } from "@/lib/email/resend"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const supabaseAdmin = createAdminClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    // Get user profile for name
    const { data: profile } = await supabase.from("profiles").select("first_name, full_name").eq("id", user.id).single()

    const { data: verificationData, error: verificationError } = await supabaseAdmin.auth.admin.generateLink({
      type: "signup",
      email: user.email!,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "https://mydaylogs.co.uk"}/auth/callback`,
      },
    })

    if (verificationError || !verificationData.properties?.action_link) {
      console.error("[v0] Failed to generate verification link:", verificationError)
      return NextResponse.json({ success: false, error: "Failed to generate verification link" }, { status: 500 })
    }

    console.log("[v0] Verification link generated:", verificationData.properties.action_link)

    // Send verification email via Resend
    const emailResult = await sendVerificationEmail(
      user.email!,
      profile?.first_name || profile?.full_name || "there",
      verificationData.properties.action_link,
    )

    if (!emailResult.success) {
      console.error("[v0] Failed to send verification email:", emailResult.error)
      return NextResponse.json({ success: false, error: "Failed to send verification email" }, { status: 500 })
    }

    console.log("[v0] Verification email sent successfully via Resend to:", user.email)

    return NextResponse.json({ success: true, message: "Verification email sent successfully" })
  } catch (error) {
    console.error("[v0] Resend verification error:", error)
    return NextResponse.json({ success: false, error: "An unexpected error occurred" }, { status: 500 })
  }
}
