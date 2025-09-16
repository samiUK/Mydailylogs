import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import bcrypt from "bcryptjs"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    console.log("[v0] Authenticating superuser:", email)

    const MASTER_EMAIL = "arsami.uk@gmail.com"
    const MASTER_PASSWORD = "7286707$Bd"

    if (email === MASTER_EMAIL && password === MASTER_PASSWORD) {
      console.log("[v0] Master admin authenticated successfully")
      return NextResponse.json({
        success: true,
        userType: "master_admin",
        message: "Master admin authenticated successfully",
      })
    }

    const { data: superuser, error } = await supabase
      .from("superusers")
      .select("id, email, password_hash, is_active")
      .eq("email", email)
      .eq("is_active", true)
      .single()

    if (error || !superuser) {
      console.log("[v0] Superuser not found or inactive:", email)
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    if (!superuser.password_hash) {
      console.log("[v0] No password hash found for superuser:", email)
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    const isValidPassword = await bcrypt.compare(password, superuser.password_hash)

    if (!isValidPassword) {
      console.log("[v0] Invalid password for superuser:", email)
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    supabase.from("superusers").update({ last_login: new Date().toISOString() }).eq("id", superuser.id)

    console.log("[v0] Superuser authenticated successfully:", email)
    return NextResponse.json({
      success: true,
      userType: "superuser",
      message: "Superuser authenticated successfully",
    })
  } catch (error) {
    console.error("[v0] Authentication error:", error)
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 })
  }
}
