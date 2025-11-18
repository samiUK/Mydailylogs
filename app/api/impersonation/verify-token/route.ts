import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { token } = body

    if (!token) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      )
    }

    // Fetch and verify token
    const { data: tokenData, error: tokenError } = await supabase
      .from("impersonation_tokens")
      .select("*, profiles!impersonation_tokens_target_user_id_fkey(*)")
      .eq("token", token.toUpperCase())
      .eq("is_active", true)
      .gt("expires_at", new Date().toISOString())
      .is("used_at", null)
      .single()

    if (tokenError || !tokenData) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      )
    }

    // Mark token as used
    await supabase
      .from("impersonation_tokens")
      .update({ 
        used_at: new Date().toISOString(),
        is_active: false 
      })
      .eq("id", tokenData.id)

    return NextResponse.json({
      success: true,
      impersonationData: {
        userId: tokenData.target_user_id,
        userEmail: tokenData.target_user_email,
        userRole: tokenData.target_user_role,
        organizationId: tokenData.organization_id,
        masterAdminEmail: tokenData.master_admin_email,
        profile: tokenData.profiles,
      },
    })
  } catch (error) {
    console.error("[v0] Token verification error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
