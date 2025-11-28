import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    console.log("[v0] Master admin login attempt:", {
      email,
      isMasterEmail: email === "arsami.uk@gmail.com",
      passwordLength: password?.length,
    })

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    const MASTER_EMAIL = "arsami.uk@gmail.com"
    const MASTER_PASSWORD = process.env.MASTER_ADMIN_PASSWORD || "7286707$Bd"

    console.log("[v0] Checking master admin credentials:", {
      emailMatch: email === MASTER_EMAIL,
      passwordMatch: password === MASTER_PASSWORD,
      expectedPasswordLength: MASTER_PASSWORD.length,
      providedPasswordLength: password.length,
    })

    if (email === MASTER_EMAIL && password === MASTER_PASSWORD) {
      console.log("[v0] Master admin authenticated successfully")
      const response = NextResponse.json({
        success: true,
        userType: "master_admin",
        role: "masteradmin",
        message: "Master admin authenticated successfully",
      })

      response.cookies.set("master-admin-session", "authenticated", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
      })

      return response
    }

    console.log("[v0] Master admin credentials didn't match, checking superusers table")

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.log("[v0] Supabase environment variables not configured")
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

    const { data: superuser, error } = await supabase
      .from("superusers")
      .select("id, email, is_active, password_hash, role")
      .eq("email", email)
      .eq("is_active", true)
      .maybeSingle()

    if (error || !superuser) {
      console.log("[v0] Superuser not found or error:", error?.message)
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    if (!superuser.password_hash) {
      console.log("[v0] Superuser has no password hash")
      return NextResponse.json({ error: "Account setup incomplete" }, { status: 401 })
    }

    const bcrypt = await import("bcryptjs")
    const isValidPassword = await bcrypt.compare(password, superuser.password_hash)

    if (!isValidPassword) {
      console.log("[v0] Superuser password did not match")
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    console.log("[v0] Superuser authenticated successfully")
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
    console.error("[v0] Authentication error:", error)
    return NextResponse.json({ error: "Authentication failed", details: String(error) }, { status: 500 })
  }
}
