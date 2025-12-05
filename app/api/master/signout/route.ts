import { type NextRequest, NextResponse } from "next/server"
import { clearMasterAuthCookie } from "@/lib/master-auth-jwt"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    // Clear the master-auth cookie
    await clearMasterAuthCookie()

    return NextResponse.json({ success: true, message: "Signed out successfully" }, { status: 200 })
  } catch (error: any) {
    console.error("[Signout Error]:", error)
    return NextResponse.json({ success: false, error: error.message || "Failed to sign out" }, { status: 500 })
  }
}
