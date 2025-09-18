import { createClient, createAdminClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    console.log("[v0] Starting organization sync API...")

    const supabase = await createClient()
    const adminSupabase = createAdminClient()

    console.log("[v0] Checking authentication...")

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    console.log("[v0] Auth check - User:", user?.email || "No user")
    console.log("[v0] Auth check - Error:", authError?.message || "No error")

    if (authError || !user) {
      console.log("[v0] Authentication failed - returning 401")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] User authenticated, checking superuser status...")

    // Check if user is a superuser
    const { data: superuser, error: superuserError } = await supabase
      .from("superusers")
      .select("*")
      .eq("email", user.email)
      .eq("is_active", true)
      .single()

    console.log("[v0] Superuser check - Data:", superuser ? "Found" : "Not found")
    console.log("[v0] Superuser check - Error:", superuserError?.message || "No error")

    if (!superuser) {
      console.log("[v0] User is not a superuser - returning 403")
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    console.log("[v0] Superuser authenticated, proceeding with sync...")

    const syncActions = []

    // Step 1: Find unique organization_id and organization_name combinations from profiles
    console.log("[v0] Fetching profile organizations...")
    const { data: profileOrgs, error: profileError } = await adminSupabase
      .from("profiles")
      .select("organization_id, organization_name")
      .not("organization_id", "is", null)
      .not("organization_name", "is", null)

    if (profileError) {
      console.error("[v0] Error fetching profile organizations:", profileError)
      return NextResponse.json(
        { error: "Failed to fetch profile organizations", details: profileError.message },
        { status: 500 },
      )
    }

    console.log("[v0] Found profile organizations:", profileOrgs?.length || 0)

    // Get unique combinations
    const uniqueOrgs = profileOrgs?.reduce(
      (acc, curr) => {
        const key = curr.organization_id
        if (!acc[key]) {
          acc[key] = curr
        }
        return acc
      },
      {} as Record<string, any>,
    )

    console.log("[v0] Unique organizations from profiles:", Object.keys(uniqueOrgs || {}).length)

    // Step 2: Check which organizations don't exist in organizations table
    console.log("[v0] Fetching existing organizations...")
    const { data: existingOrgs, error: existingError } = await adminSupabase
      .from("organizations")
      .select("organization_id")

    if (existingError) {
      console.error("[v0] Error fetching existing organizations:", existingError)
      return NextResponse.json(
        { error: "Failed to fetch existing organizations", details: existingError.message },
        { status: 500 },
      )
    }

    console.log("[v0] Existing organizations in DB:", existingOrgs?.length || 0)

    const existingOrgIds = new Set(existingOrgs?.map((org) => org.organization_id) || [])

    // Step 3: Insert missing organizations
    const newOrgs = Object.values(uniqueOrgs || {}).filter((org) => !existingOrgIds.has(org.organization_id))

    console.log("[v0] New organizations to insert:", newOrgs.length)

    if (newOrgs.length > 0) {
      const { error: insertError } = await adminSupabase.from("organizations").insert(
        newOrgs.map((org) => ({
          organization_id: org.organization_id,
          organization_name: org.organization_name,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })),
      )

      if (insertError) {
        console.error("[v0] Error inserting new organizations:", insertError)
        return NextResponse.json(
          { error: "Failed to insert new organizations", details: insertError.message },
          { status: 500 },
        )
      }

      syncActions.push(`Added ${newOrgs.length} new organizations`)
      console.log("[v0] Successfully inserted new organizations")
    }

    // Step 4: Update organization names if they've changed in profiles
    console.log("[v0] Checking for organization name updates...")
    let updatedCount = 0

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()

    for (const org of Object.values(uniqueOrgs || {})) {
      const { data: currentOrg } = await adminSupabase
        .from("organizations")
        .select("organization_name, updated_at")
        .eq("organization_id", org.organization_id)
        .single()

      if (currentOrg && currentOrg.organization_name !== org.organization_name) {
        // Check if this organization was recently updated manually
        if (currentOrg.updated_at && currentOrg.updated_at > fiveMinutesAgo) {
          console.log(`[v0] Skipping organization name update for ${org.organization_id} - recently updated manually`)
          syncActions.push(`Preserved manual update for ${org.organization_id}`)
        } else {
          const { error: updateError } = await adminSupabase
            .from("organizations")
            .update({
              organization_name: org.organization_name,
              updated_at: new Date().toISOString(),
            })
            .eq("organization_id", org.organization_id)

          if (!updateError) {
            updatedCount++
            syncActions.push(`Updated organization name for ${org.organization_id}`)
          }
        }
      }
    }

    console.log("[v0] Updated organization names:", updatedCount)

    const message =
      syncActions.length > 0
        ? `Organization sync completed. ${syncActions.length} actions performed.`
        : "Organization sync completed. No changes needed."

    console.log("[v0] Sync completed successfully:", message)

    return NextResponse.json({
      success: true,
      syncResults: syncActions,
      message,
    })
  } catch (error) {
    console.error("[v0] Sync organizations API error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
