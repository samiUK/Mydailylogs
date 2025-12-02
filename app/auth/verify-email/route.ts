import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const token = searchParams.get("token")
  const email = searchParams.get("email")

  console.log("[v0] Email verification attempt:", { email, hasToken: !!token })

  if (!token || !email) {
    return NextResponse.redirect(
      `${request.nextUrl.origin}/auth/login?error=${encodeURIComponent("Invalid verification link")}`,
    )
  }

  try {
    const supabase = await createClient()

    const { data: profile } = await supabase.from("profiles").select("role").eq("email", email).single()

    // Update profile to mark email as verified
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ is_email_verified: true })
      .eq("email", email)

    if (updateError) {
      console.error("[v0] Failed to verify email:", updateError)
      return NextResponse.redirect(
        `${request.nextUrl.origin}/auth/login?error=${encodeURIComponent("Failed to verify email. Please try again.")}`,
      )
    }

    console.log("[v0] Email verified successfully for:", email)

    const dashboardRoute = profile?.role === "staff" ? "/staff" : "/admin"
    return NextResponse.redirect(`${request.nextUrl.origin}${dashboardRoute}?verified=true`)
  } catch (error: any) {
    console.error("[v0] Email verification error:", error)
    return NextResponse.redirect(
      `${request.nextUrl.origin}/auth/login?error=${encodeURIComponent("Verification failed. Please try again.")}`,
    )
  }
}
