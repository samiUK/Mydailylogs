import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { sendVerificationEmail } from "@/lib/email/resend"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { userEmail } = await request.json()

    if (!userEmail) {
      return NextResponse.json({ error: "User email is required" }, { status: 400 })
    }

    console.log("[v0] Unverifying and resending verification email for:", userEmail)

    // Check if user is master admin
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser()

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", currentUser.id).single()

    if (profile?.role !== "master_admin") {
      return NextResponse.json({ error: "Only master admins can perform this action" }, { status: 403 })
    }

    // Get the user's profile
    const { data: userProfile, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("email", userEmail)
      .single()

    if (profileError || !userProfile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Unverify the user in profiles table
    const { error: unverifyError } = await supabase
      .from("profiles")
      .update({ is_email_verified: false })
      .eq("email", userEmail)

    if (unverifyError) {
      console.error("[v0] Error unverifying user:", unverifyError)
      return NextResponse.json({ error: "Failed to unverify user" }, { status: 500 })
    }

    // Generate verification token (using user ID as token for simplicity)
    const verificationToken = Buffer.from(`${userProfile.id}:${Date.now()}`).toString("base64url")

    // Send verification email
    const emailResult = await sendVerificationEmail(userEmail, userProfile.full_name || "User", verificationToken)

    if (!emailResult.success) {
      console.error("[v0] Failed to send verification email:", emailResult.error)
      return NextResponse.json(
        { error: "User unverified but failed to send email. Please try resending." },
        { status: 500 },
      )
    }

    console.log("[v0] User unverified and verification email sent successfully")

    return NextResponse.json({
      success: true,
      message: "User unverified and verification email sent successfully",
    })
  } catch (error) {
    console.error("[v0] Unverify and resend error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
