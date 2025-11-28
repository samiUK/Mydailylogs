"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"

export async function createUserWithProfile(formData: {
  email: string
  password: string
  firstName: string
  lastName: string
  organizationName: string
}) {
  const supabaseAdmin = createAdminClient()

  try {
    console.log("[v0] Starting signup process")

    const { email, password, firstName, lastName, organizationName } = formData
    const fullName = `${firstName} ${lastName}`
    const slug = organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")

    // Check if organization name already exists
    const { data: existingOrg } = await supabaseAdmin
      .from("organizations")
      .select("organization_id")
      .eq("organization_name", organizationName)
      .maybeSingle()

    if (existingOrg) {
      console.log("[v0] Organization name already exists")
      return { success: false, error: "Organization name already taken" }
    }

    console.log("[v0] Creating organization first")
    const organizationId = crypto.randomUUID()
    const { error: orgError } = await supabaseAdmin.from("organizations").insert({
      organization_id: organizationId,
      organization_name: organizationName,
      slug: slug,
      created_at: new Date().toISOString(),
    })

    if (orgError) {
      console.error("[v0] Organization creation failed:", orgError)
      return { success: false, error: "Failed to create organization" }
    }

    console.log("[v0] Organization created:", organizationId)

    console.log("[v0] Creating auth user with email verification required")
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false, // Requires verification but can still login
      user_metadata: {
        full_name: fullName,
        first_name: firstName,
        last_name: lastName,
      },
    })

    if (authError || !authData.user) {
      console.error("[v0] Auth user creation failed:", authError)
      // Cleanup: delete organization
      await supabaseAdmin.from("organizations").delete().eq("organization_id", organizationId)
      return { success: false, error: authError?.message || "Failed to create user account" }
    }

    console.log("[v0] Auth user created:", authData.user.id)
    const userId = authData.user.id

    console.log("[v0] Creating profile")
    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      id: userId,
      email: email,
      full_name: fullName,
      first_name: firstName,
      last_name: lastName,
      organization_name: organizationName,
      role: "admin",
      organization_id: organizationId,
      created_at: new Date().toISOString(),
    })

    if (profileError) {
      console.error("[v0] Profile creation failed:", profileError)
      // Cleanup: delete organization and auth user
      await supabaseAdmin.from("organizations").delete().eq("organization_id", organizationId)
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return { success: false, error: "Failed to create user profile" }
    }

    console.log("[v0] Profile created")

    console.log("[v0] Creating Starter subscription")
    const { error: subError } = await supabaseAdmin.from("subscriptions").insert({
      organization_id: organizationId,
      plan_type: "Starter",
      status: "active",
      max_users: 5,
      max_templates: 3,
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
    })

    if (subError) {
      console.error("[v0] Subscription creation failed:", subError)
    } else {
      console.log("[v0] Starter subscription created")
    }

    console.log("[v0] Email verification will be sent by Supabase if SMTP is configured")
    console.log("[v0] To enable emails: Supabase Dashboard > Authentication > Email Templates > Configure Custom SMTP")

    console.log("[v0] Signup completed successfully")
    revalidatePath("/")

    return {
      success: true,
      userId,
      organizationId,
      message: "Account created successfully. Please check your email to verify your account.",
    }
  } catch (error: any) {
    console.error("[v0] Signup error:", error)
    return {
      success: false,
      error: error.message || "An unexpected error occurred during signup",
    }
  }
}
