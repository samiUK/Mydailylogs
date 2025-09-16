import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { notificationIds } = await request.json()

    if (!notificationIds || !Array.isArray(notificationIds)) {
      return NextResponse.json({ error: "Notification IDs array is required" }, { status: 400 })
    }

    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] Server: Clearing notifications for user:", user.id)
    console.log("[v0] Server: Notification IDs to clear:", notificationIds)

    const { data: checkData, error: checkError } = await supabase
      .from("notifications")
      .select("id, user_id, is_read")
      .in("id", notificationIds)

    if (checkError) {
      console.error("[v0] Server: Check query error:", checkError)
    } else {
      console.log("[v0] Server: Notification ownership check:", checkData)
      console.log("[v0] Server: Current user ID:", user.id)
    }

    // Update notifications to mark as read with explicit user check for RLS
    const { data, error } = await supabase
      .from("notifications")
      .update({ is_read: true, updated_at: new Date().toISOString() })
      .in("id", notificationIds)
      .eq("user_id", user.id) // Explicit user check for RLS
      .select()

    if (error) {
      console.error("[v0] Server: Database error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log("[v0] Server: Successfully cleared notifications:", data)

    // Verify the update worked
    const { data: verifyData, error: verifyError } = await supabase
      .from("notifications")
      .select("id, is_read")
      .in("id", notificationIds)
      .eq("user_id", user.id)

    if (verifyError) {
      console.error("[v0] Server: Verification error:", verifyError)
    } else {
      console.log("[v0] Server: Verification result:", verifyData)
    }

    return NextResponse.json({
      success: true,
      updated: data?.length || 0,
      verification: verifyData,
    })
  } catch (error) {
    console.error("[v0] Server: Error in clear-all API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
