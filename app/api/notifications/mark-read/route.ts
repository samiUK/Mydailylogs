import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { notificationId } = await request.json()

    if (!notificationId) {
      return NextResponse.json({ error: "Notification ID is required" }, { status: 400 })
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

    console.log("[v0] Server: Marking notification as read for user:", user.id)

    const { data: existingNotification, error: checkError } = await supabase
      .from("notifications")
      .select("id, user_id, is_read")
      .eq("id", notificationId)
      .single()

    if (checkError || !existingNotification) {
      console.log("[v0] Server: Notification not found:", checkError)
      return NextResponse.json({ error: "Notification not found" }, { status: 404 })
    }

    console.log("[v0] Server: Found notification:", existingNotification)

    if (existingNotification.user_id !== user.id) {
      console.log(
        "[v0] Server: User ID mismatch. Notification user_id:",
        existingNotification.user_id,
        "Current user:",
        user.id,
      )
      return NextResponse.json({ error: "No permission to modify this notification" }, { status: 403 })
    }

    if (existingNotification.is_read) {
      console.log("[v0] Server: Notification already marked as read")
      return NextResponse.json({ success: true, message: "Already marked as read" })
    }

    // Update notification with explicit user check for RLS
    const { data, error } = await supabase
      .from("notifications")
      .update({ is_read: true, updated_at: new Date().toISOString() })
      .eq("id", notificationId)
      .eq("user_id", user.id) // Explicit user check for RLS
      .select()

    if (error) {
      console.error("[v0] Server: Database error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data || data.length === 0) {
      console.log("[v0] Server: No notification updated - RLS policy may be blocking")
      return NextResponse.json({ error: "Update failed - permission denied" }, { status: 403 })
    }

    console.log("[v0] Server: Successfully marked notification as read:", data)

    const { data: verifyData, error: verifyError } = await supabase
      .from("notifications")
      .select("id, is_read")
      .eq("id", notificationId)
      .single()

    if (verifyError) {
      console.error("[v0] Server: Verification error:", verifyError)
    } else {
      console.log("[v0] Server: Verification result:", verifyData)
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("[v0] Server: Error in mark-read API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
