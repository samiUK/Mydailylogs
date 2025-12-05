import { type NextRequest, NextResponse } from "next/server"
import { getMasterAuthPayload, setMasterAuthCookie } from "@/lib/master-auth-jwt"

export async function POST(request: NextRequest) {
  try {
    const payload = await getMasterAuthPayload()

    if (!payload) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const { targetUserId } = await request.json()

    await setMasterAuthCookie({
      email: payload.email,
      role: payload.role,
      superuserRole: payload.superuserRole,
      impersonating: targetUserId,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Impersonation start error:", error)
    return NextResponse.json({ error: "Failed to start impersonation" }, { status: 500 })
  }
}
