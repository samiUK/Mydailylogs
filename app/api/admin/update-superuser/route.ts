import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function PUT(request: NextRequest) {
  try {
    console.log("[v0] Update superuser API called")

    const { superuserId, newPassword } = await request.json()

    if (!superuserId || !newPassword) {
      return NextResponse.json({ error: "Superuser ID and new password are required" }, { status: 400 })
    }

    const { error: authError } = await supabase.auth.admin.updateUserById(superuserId, {
      password: newPassword,
    })

    if (authError) {
      console.error("[v0] Auth error:", authError)
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    const { error: dbError } = await supabase
      .from("superusers")
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq("id", superuserId)

    if (dbError) {
      console.error("[v0] Database error:", dbError)
      return NextResponse.json({ error: dbError.message }, { status: 400 })
    }

    console.log("[v0] Superuser password updated successfully")
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Update superuser error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
