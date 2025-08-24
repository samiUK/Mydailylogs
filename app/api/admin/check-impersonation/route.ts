import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const impersonationCookie = cookieStore.get("masterAdminImpersonation")
    const isImpersonating = impersonationCookie?.value === "true"

    return NextResponse.json({ isImpersonating })
  } catch (error) {
    console.error("Error checking impersonation status:", error)
    return NextResponse.json({ isImpersonating: false })
  }
}
