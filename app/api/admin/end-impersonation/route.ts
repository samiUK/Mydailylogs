import { type NextRequest, NextResponse } from "next/server"
import { getMasterAuthPayload, setMasterAuthCookie } from "@/lib/master-auth-jwt"

export async function POST(request: NextRequest) {
  try {
    const payload = await getMasterAuthPayload()

    if (!payload) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    await setMasterAuthCookie({
      email: payload.email,
      role: payload.role,
      superuserRole: payload.superuserRole,
      // No impersonating field
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Impersonation end error:", error)
    return NextResponse.json({ error: "Failed to end impersonation" }, { status: 500 })
  }
}
