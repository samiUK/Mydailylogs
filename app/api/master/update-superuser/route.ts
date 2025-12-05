import { type NextRequest, NextResponse } from "next/server"
import { createAdminServerClient } from "@/lib/supabase-server"

export async function PUT(request: NextRequest) {
  try {
    console.log("[v0] Update superuser API called")

    const supabase = createAdminServerClient()
    const { superuserId, newPassword } = await request.json()

    console.log("[v0] Update superuser request:", { superuserId, passwordLength: newPassword?.length })

    if (!superuserId || !newPassword) {
      console.log("[v0] Missing superuserId or newPassword")
      return NextResponse.json({ error: "Superuser ID and new password required" }, { status: 400 })
    }

    // Update auth user password
    const { error: authError } = await supabase.auth.admin.updateUserById(superuserId, {
      password: newPassword,
    })

    if (authError) {
      console.log("[v0] Password update failed:", authError)
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    console.log("[v0] Superuser password updated successfully")

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.log("[v0] Update superuser error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
