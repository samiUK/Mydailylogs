import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: NextRequest) {
  try {
    const { userEmail } = await request.json()

    if (!userEmail) {
      return NextResponse.json({ error: "User email is required" }, { status: 400 })
    }

    console.log("[v0] Manual email verification for:", userEmail)

    const supabaseAdmin = createAdminClient()

    // Get user by email
    const { data: users, error: userError } = await supabaseAdmin.auth.admin.listUsers()

    if (userError) {
      console.error("[v0] Error fetching users:", userError)
      return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 })
    }

    const user = users.users.find((u) => u.email === userEmail)

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Update user to mark email as verified
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      email_confirm: true,
    })

    if (error) {
      console.error("[v0] Error verifying email:", error)
      return NextResponse.json({ error: "Failed to verify email" }, { status: 500 })
    }

    console.log("[v0] Email verified successfully for:", userEmail)

    return NextResponse.json({
      success: true,
      message: "Email verified successfully",
      userEmail,
    })
  } catch (error: any) {
    console.error("[v0] Verify email error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
