import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    // Verify the requesting user is an admin
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    // Delete the user using admin client
    const adminSupabase = createAdminClient()

    // First delete the profile (this will cascade due to foreign key constraints)
    const { error: profileError } = await adminSupabase.from("profiles").delete().eq("id", userId)

    if (profileError) {
      console.error("Error deleting profile:", profileError)
      throw new Error("Failed to delete user profile")
    }

    // Then delete the auth user
    const { error: authError } = await adminSupabase.auth.admin.deleteUser(userId)

    if (authError) {
      console.error("Error deleting auth user:", authError)
      throw new Error("Failed to delete user authentication")
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting user:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete user" },
      { status: 500 },
    )
  }
}
