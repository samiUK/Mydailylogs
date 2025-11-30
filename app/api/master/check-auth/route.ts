import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function GET() {
  try {
    const cookieStore = await cookies()
    const masterAdminImpersonation = cookieStore.get("masterAdminImpersonation")

    if (masterAdminImpersonation?.value === "true") {
      return NextResponse.json({ authenticated: true })
    }

    return NextResponse.json({ authenticated: false }, { status: 401 })
  } catch (error) {
    console.error("Auth check error:", error)
    return NextResponse.json({ authenticated: false }, { status: 500 })
  }
}
