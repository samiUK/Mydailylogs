import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function DELETE(request: NextRequest) {
  try {
    console.log("[v0] Remove superuser API called")

    const { superuserId } = await request.json()

    if (!superuserId) {
      return NextResponse.json({ error: "Superuser ID is required" }, { status: 400 })
    }

    const { error: dbError } = await supabase.from("superusers").delete().eq("id", superuserId)

    if (dbError) {
      console.error("[v0] Database error:", dbError)
      return NextResponse.json({ error: dbError.message }, { status: 400 })
    }

    const { error: authError } = await supabase.auth.admin.deleteUser(superuserId)

    if (authError) {
      console.error("[v0] Auth error:", authError)
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    console.log("[v0] Superuser removed successfully")
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Remove superuser error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
