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

    const MASTER_EMAIL = "arsami.uk@gmail.com"
    const MASTER_PASSWORD = process.env.MASTER_ADMIN_PASSWORD || "7286707$Bd"

    if (email === MASTER_EMAIL && password === MASTER_PASSWORD) {
      const response = NextResponse.json({
        success: true,
        userType: "master_admin",
        role: "masteradmin",
        message: "Master admin authenticated successfully",
      })

      response.cookies.set("masteradmin-session", "true", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
      })

      return response
    }

    const { data: superuser, error } = await supabase
      .from("superusers")
      .select("id, email, is_active, password_hash, role")
      .eq("email", email)
      .eq("is_active", true)
      .single()

    if (error || !superuser) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    if (!superuser.password_hash) {
      return NextResponse.json({ error: "Account setup incomplete" }, { status: 401 })
    }

    const isValidPassword = await bcrypt.compare(password, superuser.password_hash)

    if (!isValidPassword) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    await supabase.from("superusers").update({ last_login: new Date().toISOString() }).eq("id", superuser.id)

    const response = NextResponse.json({
      success: true,
      userType: "superuser",
      role: superuser.role || "support",
      message: "Superuser authenticated successfully",
    })

    response.cookies.set("superuser-session", email, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    })

    return response
  } catch (error) {
    console.error("Authentication error:", error)
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 })
  }
}
