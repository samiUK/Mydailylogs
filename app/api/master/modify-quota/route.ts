import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      organizationId,
      fieldName,
      newValue,
      reason,
      masterAdminPassword,
    }: {
      organizationId: string
      fieldName: "template_limit" | "team_limit" | "manager_limit" | "monthly_submissions"
      newValue: number | null
      reason: string
      masterAdminPassword: string
    } = await request.json()

    // Verify master admin password
    if (masterAdminPassword !== process.env.MASTER_ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Invalid master admin password" }, { status: 403 })
    }

    // Get current custom value
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select(
        "custom_template_limit, custom_team_limit, custom_manager_limit, custom_monthly_submissions, organization_name",
      )
      .eq("organization_id", organizationId)
      .single()

    if (orgError) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    // Map field names to column names
    const columnMap = {
      template_limit: "custom_template_limit",
      team_limit: "custom_team_limit",
      manager_limit: "custom_manager_limit",
      monthly_submissions: "custom_monthly_submissions",
    }

    const columnName = columnMap[fieldName]
    const oldValue = org[columnName]

    // Update the custom limit
    const { error: updateError } = await supabase
      .from("organizations")
      .update({ [columnName]: newValue })
      .eq("organization_id", organizationId)

    if (updateError) {
      return NextResponse.json({ error: "Failed to update quota" }, { status: 500 })
    }

    // Get master admin email from session
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Log the modification
    await supabase.from("quota_modifications").insert({
      organization_id: organizationId,
      modified_by: user?.email || "unknown",
      field_name: fieldName,
      old_value: oldValue,
      new_value: newValue,
      reason,
    })

    return NextResponse.json({
      success: true,
      message: `Successfully updated ${fieldName} from ${oldValue ?? "default"} to ${newValue ?? "default"}`,
    })
  } catch (error) {
    console.error("Error modifying quota:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
