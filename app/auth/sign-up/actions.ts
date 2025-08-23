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

    if (authData.user) {
      const { data: orgData, error: orgError } = await adminSupabase
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
        await adminSupabase.auth.admin.deleteUser(authData.user.id)
        throw new Error(`Organization creation failed: ${orgError.message}`)
      }

      const { error: profileError } = await adminSupabase.from("profiles").insert({
        id: authData.user.id,
        organization_id: orgData.id,
        first_name: firstName,
        last_name: lastName,
        full_name: fullName,
        email: email,
        role: "admin",
      })

      if (profileError) {
        await adminSupabase.auth.admin.deleteUser(authData.user.id)
        await adminSupabase.from("organizations").delete().eq("id", orgData.id)
        throw new Error(`Profile creation failed: ${profileError.message}`)
      }

      return { success: true, message: "Account created successfully!" }
    }

    throw new Error("User creation failed")
  } catch (error) {
    console.error("Signup error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "An error occurred",
    }
  }
}
