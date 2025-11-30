import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/admin"

export async function POST(request: Request) {
  try {
    const cookieHeader = request.headers.get("cookie") || ""
    const isMasterAdmin = cookieHeader.includes("masterAdminImpersonation=true")

    if (!isMasterAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 })
    }

    const supabase = createClient()

    // Delete from auth
    const { error: authError } = await supabase.auth.admin.deleteUser(userId)
    if (authError) throw authError

    // Delete from profiles
    const { error: profileError } = await supabase.from("profiles").delete().eq("id", userId)
    if (profileError) throw profileError

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[v0] Delete user error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
