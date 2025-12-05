import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get("organizationId")

    if (!organizationId) {
      return NextResponse.json({ error: "Organization ID required" }, { status: 400 })
    }

    const supabase = await createClient()

    // Get all profiles for this organization
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("email, full_name, role")
      .eq("organization_id", organizationId)
      .order("role", { ascending: true })

    if (error) {
      console.error("Error fetching profiles:", error)
      return NextResponse.json({ error: "Failed to fetch profiles" }, { status: 500 })
    }

    const admins = profiles?.filter((p) => ["admin", "manager"].includes(p.role)) || []
    const staff = profiles?.filter((p) => p.role === "staff") || []

    return NextResponse.json({ admins, staff })
  } catch (error) {
    console.error("Error in organization-profiles API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
