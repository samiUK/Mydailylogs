import { type NextRequest, NextResponse } from "next/server"
import { createAdminServerClient } from "@/lib/supabase-server"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Add superuser API called")

    const supabase = createAdminServerClient()
    const { email, password } = await request.json()

    console.log("[v0] Add superuser request:", { email, passwordLength: password?.length })

    if (!email || !password) {
      console.log("[v0] Missing email or password")
      return NextResponse.json({ error: "Email and password required" }, { status: 400 })
    }

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError) {
      console.log("[v0] Auth user creation failed:", authError.message)
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    console.log("[v0] Auth user created:", authData.user?.id)

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ role: "superuser" })
      .eq("id", authData.user.id)

    if (profileError) {
      console.log("[v0] Profile update failed:", profileError.message)
      return NextResponse.json({ error: profileError.message }, { status: 400 })
    }

    console.log("[v0] Superuser created successfully")

    return NextResponse.json({
      success: true,
      superuser: {
        id: authData.user.id,
        email: authData.user.email,
      },
    })
  } catch (error: any) {
    console.log("[v0] Add superuser error:", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
