import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ success: false, error: "Email is required" }, { status: 400 })
    }

    const supabaseAdmin = createAdminClient()

    const { data: users, error: getUserError } = await supabaseAdmin.auth.admin.listUsers()

    if (getUserError) {
      console.error("[v0] Error fetching users:", getUserError)
      return NextResponse.json({ success: false, error: "Failed to fetch user" }, { status: 500 })
    }

    const user = users.users.find((u) => u.email === email)

    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
    }

    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email)

    if (error) {
      console.error("[v0] Error sending verification email:", error)
      return NextResponse.json({ success: false, error: "Failed to send verification email" }, { status: 500 })
    }

    console.log("[v0] Verification email queued by Supabase")
    console.log(
      "[v0] To receive emails, configure Custom SMTP in Supabase Dashboard > Authentication > Email Templates",
    )

    return NextResponse.json({ success: true, message: "Verification email sent successfully" })
  } catch (error) {
    console.error("[v0] Resend verification error:", error)
    return NextResponse.json({ success: false, error: "An unexpected error occurred" }, { status: 500 })
  }
}
