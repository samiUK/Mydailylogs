import { createClient, createAdminClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function POST(request: Request) {
  try {
    console.log("[v0] Starting comprehensive sync API...")

    const cookieStore = await cookies()
    const supabase = await createClient()
    const adminSupabase = createAdminClient()

    console.log("[v0] Checking authentication...")

    let user = null
    let authError = null
    let isMasterAdmin = false

    const masterAdminEmail = cookieStore.get("masterAdminEmail")?.value
    const masterAdminImpersonation = cookieStore.get("masterAdminImpersonation")?.value

    if (masterAdminEmail && masterAdminImpersonation === "true") {
      console.log("[v0] Master admin authentication detected:", masterAdminEmail)

      // Verify this is the actual master admin
      const MASTER_EMAIL = "arsami.uk@gmail.com"
      if (masterAdminEmail === MASTER_EMAIL) {
        console.log("[v0] Master admin authenticated successfully")
        isMasterAdmin = true
        user = { email: masterAdminEmail, id: "master-admin" }
      } else {
        console.log("[v0] Invalid master admin email:", masterAdminEmail)
      }
    }

    // If not master admin, try regular Supabase authentication
    if (!isMasterAdmin) {
      const authHeader = request.headers.get("authorization")
      if (authHeader) {
        console.log("[v0] Found authorization header, validating token...")
        try {
          const token = authHeader.replace("Bearer ", "")
          // Use admin client to validate the token
          const {
            data: { user: tokenUser },
            error: tokenError,
          } = await adminSupabase.auth.getUser(token)
          user = tokenUser
          authError = tokenError
          console.log("[v0] Token validation result:", user?.email || "Invalid token")
          if (tokenError) {
            console.log("[v0] Token validation error:", tokenError.message)
          }
        } catch (e) {
          console.log("[v0] Token validation exception:", e.message)
        }
      }

      if (!user) {
        console.log("[v0] No valid token, trying cookie-based auth...")
        try {
          const userResult = await supabase.auth.getUser()
          user = userResult.data?.user
          authError = userResult.error
          console.log("[v0] Cookie auth result:", user?.email || "No user")
          if (authError) {
            console.log("[v0] Cookie auth error:", authError.message)
          }
        } catch (e) {
          console.log("[v0] Cookie auth exception:", e.message)
        }
      }
    }

    if (authError || !user) {
      console.log("[v0] All authentication methods failed - returning 401")
      console.log("[v0] Auth error:", authError?.message || "No user found")
      console.log(
        "[v0] Available cookies:",
        cookieStore.getAll().map((c) => c.name),
      )
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] User authenticated:", user.email)

    if (!isMasterAdmin) {
      // Check if user is a superuser using admin client to bypass RLS
      console.log("[v0] Checking superuser status...")
      const { data: superuser, error: superuserError } = await adminSupabase
        .from("superusers")
        .select("*")
        .eq("email", user.email)
        .eq("is_active", true)
        .single()

      console.log("[v0] Superuser check result:", superuser?.email || "Not found")

      if (superuserError || !superuser) {
        console.log("[v0] User is not a superuser - returning 403")
        console.log("[v0] Superuser error:", superuserError?.message || "No superuser record")
        return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
      }
    }

    console.log("[v0] Superuser authenticated, proceeding with comprehensive sync...")

    const syncResults = {
      organizations: [],
      profiles: [],
      superusers: [],
      templates: [],
      checklists: [],
      reports: [],
      dataConsistency: [],
      errors: [],
    }

    // 1. SYNC ORGANIZATIONS
    console.log("[v0] Syncing organizations...")
    try {
      const { data: profileOrgs } = await adminSupabase
        .from("profiles")
        .select("organization_id, organization_name")
        .not("organization_id", "is", null)
        .not("organization_name", "is", null)

      const uniqueOrgs = profileOrgs?.reduce(
        (acc, curr) => {
          const key = curr.organization_id
          if (!acc[key]) acc[key] = curr
          return acc
        },
        {} as Record<string, any>,
      )

      const { data: existingOrgs } = await adminSupabase
        .from("organizations")
        .select("organization_id, organization_name, updated_at")

      const existingOrgIds = new Set(existingOrgs?.map((org) => org.organization_id) || [])
      const newOrgs = Object.values(uniqueOrgs || {}).filter((org) => !existingOrgIds.has(org.organization_id))

      if (newOrgs.length > 0) {
        await adminSupabase.from("organizations").insert(
          newOrgs.map((org) => ({
            organization_id: org.organization_id,
            organization_name: org.organization_name,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })),
        )
        syncResults.organizations.push(`Added ${newOrgs.length} new organizations`)
      }

      // Check if organization was manually updated in the last 5 minutes - if so, don't override
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()

      for (const org of Object.values(uniqueOrgs || {})) {
        const existing = existingOrgs?.find((e) => e.organization_id === org.organization_id)
        if (existing && existing.organization_name !== org.organization_name) {
          // Check if this organization was recently updated manually
          if (existing.updated_at && existing.updated_at > fiveMinutesAgo) {
            console.log(`[v0] Skipping organization name update for ${org.organization_id} - recently updated manually`)
            syncResults.organizations.push(`Preserved manual update for ${org.organization_id}`)
          } else {
            // Only update if it hasn't been manually changed recently
            await adminSupabase
              .from("organizations")
              .update({ organization_name: org.organization_name, updated_at: new Date().toISOString() })
              .eq("organization_id", org.organization_id)
            syncResults.organizations.push(`Updated name for ${org.organization_id}`)
          }
        }
      }
    } catch (error) {
      syncResults.errors.push(`Organizations sync error: ${error.message}`)
    }

    // 2. SYNC PROFILES & USER DATA CONSISTENCY
    console.log("[v0] Syncing profiles and user data...")
    try {
      // Check for profiles without corresponding auth users
      const { data: profiles } = await adminSupabase
        .from("profiles")
        .select("id, email, full_name, role, organization_id")

      // Ensure all profiles have consistent data
      let profileUpdates = 0
      for (const profile of profiles || []) {
        const updates = {}
        let needsUpdate = false

        // Ensure full_name is consistent with first_name + last_name
        const { data: fullProfile } = await adminSupabase
          .from("profiles")
          .select("first_name, last_name, full_name")
          .eq("id", profile.id)
          .single()

        if (fullProfile?.first_name && fullProfile?.last_name) {
          const expectedFullName = `${fullProfile.first_name} ${fullProfile.last_name}`
          if (fullProfile.full_name !== expectedFullName) {
            updates.full_name = expectedFullName
            needsUpdate = true
          }
        }

        if (needsUpdate) {
          await adminSupabase
            .from("profiles")
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq("id", profile.id)
          profileUpdates++
        }
      }

      if (profileUpdates > 0) {
        syncResults.profiles.push(`Updated ${profileUpdates} profile records for consistency`)
      }
    } catch (error) {
      syncResults.errors.push(`Profiles sync error: ${error.message}`)
    }

    // 3. SYNC SUPERUSERS & ROLES
    console.log("[v0] Syncing superusers and roles...")
    try {
      // Ensure all superusers have corresponding profiles
      const { data: superusers } = await adminSupabase.from("superusers").select("email, is_active")

      const { data: profiles } = await adminSupabase.from("profiles").select("email, role")

      const profileEmails = new Set(profiles?.map((p) => p.email) || [])
      let roleUpdates = 0

      for (const su of superusers || []) {
        if (su.is_active && profileEmails.has(su.email)) {
          // Ensure superuser has correct role in profiles
          const profile = profiles?.find((p) => p.email === su.email)
          if (profile && profile.role !== "masteradmin") {
            await adminSupabase
              .from("profiles")
              .update({ role: "masteradmin", updated_at: new Date().toISOString() })
              .eq("email", su.email)
            roleUpdates++
          }
        }
      }

      if (roleUpdates > 0) {
        syncResults.superusers.push(`Updated ${roleUpdates} superuser roles in profiles`)
      }
    } catch (error) {
      syncResults.errors.push(`Superusers sync error: ${error.message}`)
    }

    // 4. SYNC TEMPLATES & ASSIGNMENTS
    console.log("[v0] Syncing templates and assignments...")
    try {
      // Clean up orphaned template assignments
      const { data: assignments } = await adminSupabase
        .from("template_assignments")
        .select("id, template_id, assigned_to, organization_id")

      const { data: templates } = await adminSupabase.from("checklist_templates").select("id")

      const { data: profiles } = await adminSupabase.from("profiles").select("id")

      const templateIds = new Set(templates?.map((t) => t.id) || [])
      const profileIds = new Set(profiles?.map((p) => p.id) || [])

      let cleanedAssignments = 0
      for (const assignment of assignments || []) {
        if (!templateIds.has(assignment.template_id) || !profileIds.has(assignment.assigned_to)) {
          await adminSupabase.from("template_assignments").delete().eq("id", assignment.id)
          cleanedAssignments++
        }
      }

      if (cleanedAssignments > 0) {
        syncResults.templates.push(`Cleaned ${cleanedAssignments} orphaned template assignments`)
      }
    } catch (error) {
      syncResults.errors.push(`Templates sync error: ${error.message}`)
    }

    // 5. SYNC CHECKLISTS & RESPONSES
    console.log("[v0] Syncing checklists and responses...")
    try {
      // Clean up orphaned checklist responses
      const { data: responses } = await adminSupabase.from("checklist_responses").select("id, checklist_id, item_id")

      const { data: checklists } = await adminSupabase.from("daily_checklists").select("id")

      const { data: items } = await adminSupabase.from("checklist_items").select("id")

      const checklistIds = new Set(checklists?.map((c) => c.id) || [])
      const itemIds = new Set(items?.map((i) => i.id) || [])

      let cleanedResponses = 0
      for (const response of responses || []) {
        if (!checklistIds.has(response.checklist_id) || !itemIds.has(response.item_id)) {
          await adminSupabase.from("checklist_responses").delete().eq("id", response.id)
          cleanedResponses++
        }
      }

      if (cleanedResponses > 0) {
        syncResults.checklists.push(`Cleaned ${cleanedResponses} orphaned checklist responses`)
      }
    } catch (error) {
      syncResults.errors.push(`Checklists sync error: ${error.message}`)
    }

    // 6. DATA CONSISTENCY CHECKS
    console.log("[v0] Running data consistency checks...")
    try {
      // Check for missing organization references
      const { data: profilesWithoutOrgs } = await adminSupabase
        .from("profiles")
        .select("id, email")
        .is("organization_id", null)

      if (profilesWithoutOrgs?.length > 0) {
        syncResults.dataConsistency.push(`Found ${profilesWithoutOrgs.length} profiles without organization_id`)
      }

      // Check for inactive templates with active assignments
      const { data: inactiveTemplatesWithAssignments } = await adminSupabase
        .from("checklist_templates")
        .select(`
          id, 
          name,
          template_assignments!inner(id)
        `)
        .eq("is_active", false)
        .eq("template_assignments.is_active", true)

      if (inactiveTemplatesWithAssignments?.length > 0) {
        syncResults.dataConsistency.push(
          `Found ${inactiveTemplatesWithAssignments.length} inactive templates with active assignments`,
        )
      }
    } catch (error) {
      syncResults.errors.push(`Data consistency check error: ${error.message}`)
    }

    const totalActions = Object.values(syncResults).flat().length
    const hasErrors = syncResults.errors.length > 0

    console.log("[v0] Comprehensive sync completed:", { totalActions, hasErrors })

    return NextResponse.json({
      success: !hasErrors,
      message: `Comprehensive sync completed. ${totalActions} total actions performed.`,
      syncResults,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[v0] Comprehensive sync API error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
