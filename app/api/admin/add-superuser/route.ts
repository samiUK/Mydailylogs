import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Add superuser API called")

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
        .select("role")
        .eq("email", masterAdminEmail)
        .maybeSingle()

      if (roleError || !superuserData || superuserData.role !== "masteradmin") {
        return NextResponse.json({ error: "Unauthorized: Only master admins can add superusers" }, { status: 403 })
      }
    }

    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role: "superuser",
        is_master_admin: true,
      },
    })

    if (authError) {
      console.error("[v0] Auth error:", authError)
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    const { data: superuser, error: dbError } = await supabase
      .from("superusers")
      .insert({
        id: authUser.user.id,
        email: email,
        created_at: new Date().toISOString(),
        is_active: true,
      })
      .select()
      .single()

    if (dbError) {
      console.error("[v0] Database error:", dbError)
      // Clean up auth user if database insert fails
      await supabase.auth.admin.deleteUser(authUser.user.id)
      return NextResponse.json({ error: dbError.message }, { status: 400 })
    }

    console.log("[v0] Superuser created successfully:", superuser)
    return NextResponse.json({ success: true, superuser })
  } catch (error) {
    console.error("[v0] Add superuser error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
