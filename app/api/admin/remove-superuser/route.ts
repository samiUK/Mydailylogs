import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function DELETE(request: NextRequest) {
  try {
    console.log("[v0] Remove superuser API called")

    const cookieStore = await cookies()
    const masterAdminEmail = cookieStore.get("masterAdminEmail")?.value
    
    if (!masterAdminEmail) {
      return NextResponse.json({ error: "Unauthorized: Master admin access required" }, { status: 403 })
    }

    // Hardcoded master admin check for arsami.uk@gmail.com
    if (masterAdminEmail !== "arsami.uk@gmail.com") {
      // Check if user has masteradmin role in database
      const { data: superuserData, error: roleError } = await supabase
        .from("superusers")
        .eq("email", masterAdminEmail)
        .select("role")
        .maybeSingle()

      if (roleError || !superuserData || superuserData.role !== "masteradmin") {
        return NextResponse.json({ error: "Unauthorized: Only master admins can remove superusers" }, { status: 403 })
      }
    }

    const { superuserId } = await request.json()

    if (!superuserId) {
      return NextResponse.json({ error: "Superuser ID is required" }, { status: 400 })
    }

    const { data: targetUser } = await supabase
      .from("superusers")
      .select("email")
      .eq("id", superuserId)
      .single()

    if (targetUser?.email === "arsami.uk@gmail.com") {
      return NextResponse.json({ error: "Cannot remove the primary master admin" }, { status: 403 })
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
