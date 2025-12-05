import { type NextRequest, NextResponse } from "next/server"
import { createAdminServerClient } from "@/lib/supabase-server"

export async function DELETE(request: NextRequest) {
  try {
    console.log("[v0] Remove superuser API called")

    const supabase = createAdminServerClient()
    const { superuserId } = await request.json()

    console.log("[v0] Remove superuser request:", { superuserId })

    if (!superuserId) {
      console.log("[v0] Missing superuserId")
      return NextResponse.json({ error: "Superuser ID required" }, { status: 400 })
    }

    // Update profile to remove superuser role
    const { error: profileError } = await supabase.from("profiles").update({ role: "user" }).eq("id", superuserId)

    if (profileError) {
      console.log("[v0] Profile update failed:", profileError)
      return NextResponse.json({ error: profileError.message }, { status: 400 })
    }

    // Delete auth user
    const { error: authError } = await supabase.auth.admin.deleteUser(superuserId)

    if (authError) {
      console.log("[v0] Auth user deletion failed:", authError)
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    console.log("[v0] Superuser removed successfully")

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.log("[v0] Remove superuser error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
