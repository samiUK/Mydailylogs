"use server"

import { createAdminClient } from "@/lib/supabase/admin"

export async function createUserWithProfile(formData: {
  email: string
  password: string
  firstName: string
  lastName: string
  organizationName: string
}) {
  try {
    const { email, password, firstName, lastName, organizationName } = formData
    const fullName = `${firstName} ${lastName}`.trim()

    const adminSupabase = createAdminClient()

    const { data: existingUsers } = await adminSupabase.auth.admin.listUsers()
    const existingUser = existingUsers.users.find((user) => user.email === email)

    let authUserId: string
    let isNewUser = false

    if (existingUser) {
      const { data: existingAdminProfile } = await adminSupabase
        .from("profiles")
        .select("id, organization_id, organizations(name)")
        .eq("email", email)
        .eq("role", "admin")
        .single()

      if (existingAdminProfile) {
        const { data: existingOrg } = await adminSupabase
          .from("organizations")
          .select("name")
          .eq("name", organizationName)
          .single()

        if (existingOrg) {
          throw new Error("You already have an admin account for this organization. Please sign in instead.")
        }
      }

      authUserId = existingUser.id
      console.log("[v0] Using existing auth user:", authUserId)
    } else {
      const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          first_name: firstName,
          last_name: lastName,
          display_name: firstName,
          organization_name: organizationName,
          organization_slug: organizationName
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9-]/g, ""),
        },
      })

      if (authError) throw authError
      if (!authData.user) throw new Error("User creation failed")

      authUserId = authData.user.id
      isNewUser = true
      console.log("[v0] Created new auth user:", authUserId)
    }

    const { data: existingOrg } = await adminSupabase
      .from("organizations")
      .select("id, name")
      .eq("name", organizationName)
      .single()

    let orgData
    if (existingOrg) {
      orgData = existingOrg
    } else {
      const { data: newOrgData, error: orgError } = await adminSupabase
        .from("organizations")
        .insert({
          name: organizationName,
          slug: organizationName
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9-]/g, ""),
        })
        .select()
        .single()

      if (orgError) {
        if (isNewUser) {
          await adminSupabase.auth.admin.deleteUser(authUserId)
        }
        throw new Error(`Organization creation failed: ${orgError.message}`)
      }
      orgData = newOrgData
    }

    const { error: profileError } = await adminSupabase.from("profiles").insert({
      id: authUserId,
      organization_id: orgData.id,
      organization_name: organizationName, // Store organization name directly in profiles
      first_name: firstName,
      last_name: lastName,
      full_name: fullName,
      email: email,
      role: "admin",
    })

    if (profileError) {
      if (isNewUser) {
        await adminSupabase.auth.admin.deleteUser(authUserId)
      }
      await adminSupabase.from("organizations").delete().eq("id", orgData.id)
      throw new Error(`Profile creation failed: ${profileError.message}`)
    }

    const message = existingUser
      ? "Admin profile created successfully! You can now sign in with your existing credentials."
      : "Account created successfully!"

    return { success: true, message }
  } catch (error) {
    console.error("Signup error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "An error occurred",
    }
  }
}
