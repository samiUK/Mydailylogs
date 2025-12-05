import { type NextRequest, NextResponse } from "next/server"
import { getMasterAuthPayload } from "@/lib/master-auth-jwt"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const payload = await getMasterAuthPayload()

    if (payload) {
      return NextResponse.json({
        authenticated: true,
        email: payload.email,
        role: payload.role,
        superuserRole: payload.superuserRole,
        impersonating: payload.impersonating,
      })
    }

    return NextResponse.json({ authenticated: false }, { status: 401 })
  } catch (error: any) {
    console.error("[Auth Check Error]:", error)
    return NextResponse.json({ authenticated: false, error: error.message }, { status: 500 })
  }
}
