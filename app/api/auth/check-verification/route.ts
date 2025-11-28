import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const supabaseAdmin = createAdminClient()

    // Get user by email
    const {
      data: { users },
      error,
    } = await supabaseAdmin.auth.admin.listUsers()

    if (error) {
      console.error("[v0] Error fetching users:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const user = users.find((u) => u.email === email)

    if (!user) {
      return NextResponse.json({ verified: false }, { status: 200 })
    }

    const isVerified = !!user.email_confirmed_at

    return NextResponse.json({ verified: isVerified }, { status: 200 })
  } catch (error: any) {
    console.error("[v0] Check verification error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
