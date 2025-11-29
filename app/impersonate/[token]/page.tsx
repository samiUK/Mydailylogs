import { createAdminClient } from "@/lib/supabase/admin"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export default async function ImpersonatePage({
  params,
}: {
  params: { token: string }
}) {
  try {
    const { token } = params
    console.log("[v0] Impersonation page accessed with token:", token)

    if (!token) {
      console.error("[v0] No token provided")
      return (
        <div className="flex min-h-screen items-center justify-center bg-muted/30">
          <div className="w-full max-w-md rounded-lg border bg-background p-8 text-center shadow-lg">
            <h1 className="mb-4 text-2xl font-semibold">Master Admin Impersonation</h1>
            <div className="mb-4 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-destructive">
                <span className="text-3xl text-destructive">✕</span>
              </div>
            </div>
            <p className="text-muted-foreground">No impersonation token provided</p>
          </div>
        </div>
      )
    }

    const adminClient = createAdminClient()
    console.log("[v0] Admin client created")

    const { data: tokenData, error: tokenError } = await adminClient
      .from("impersonation_tokens")
      .select("*")
      .eq("token", token.toUpperCase())
      .eq("is_active", true)
      .gt("expires_at", new Date().toISOString())
      .is("used_at", null)
      .single()

    console.log("[v0] Token data:", { found: !!tokenData, error: tokenError?.message })

    if (tokenError || !tokenData) {
      console.error("[v0] Invalid or expired token:", tokenError)
      return (
        <div className="flex min-h-screen items-center justify-center bg-muted/30">
          <div className="w-full max-w-md rounded-lg border bg-background p-8 text-center shadow-lg">
            <h1 className="mb-4 text-2xl font-semibold">Master Admin Impersonation</h1>
            <div className="mb-4 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-destructive">
                <span className="text-3xl text-destructive">✕</span>
              </div>
            </div>
            <p className="text-muted-foreground">Invalid or expired impersonation link</p>
          </div>
        </div>
      )
    }

    await adminClient
      .from("impersonation_tokens")
      .update({
        used_at: new Date().toISOString(),
        is_active: false,
      })
      .eq("id", tokenData.id)

    console.log("[v0] Token marked as used")

    const { data: sessionData, error: sessionError } = await adminClient.auth.admin.createSession({
      user_id: tokenData.target_user_id,
    })

    console.log("[v0] Session creation:", {
      success: !!sessionData,
      error: sessionError?.message,
    })

    if (sessionError || !sessionData) {
      console.error("[v0] Failed to create session:", sessionError)
      return (
        <div className="flex min-h-screen items-center justify-center bg-muted/30">
          <div className="w-full max-w-md rounded-lg border bg-background p-8 text-center shadow-lg">
            <h1 className="mb-4 text-2xl font-semibold">Master Admin Impersonation</h1>
            <div className="mb-4 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-destructive">
                <span className="text-3xl text-destructive">✕</span>
              </div>
            </div>
            <p className="text-muted-foreground">Failed to create impersonation session</p>
          </div>
        </div>
      )
    }

    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      },
    )

    await supabase.auth.setSession({
      access_token: sessionData.session.access_token,
      refresh_token: sessionData.session.refresh_token,
    })

    console.log("[v0] Session established successfully, redirecting to:", `/${tokenData.target_user_role}`)

    cookieStore.set("impersonation-active", "true", {
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    })

    cookieStore.set(
      "impersonation-data",
      JSON.stringify({
        userId: tokenData.target_user_id,
        userEmail: tokenData.target_user_email,
        userRole: tokenData.target_user_role,
        organizationId: tokenData.organization_id,
        masterAdminEmail: tokenData.master_admin_email,
      }),
      {
        maxAge: 60 * 60 * 24,
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      },
    )

    redirect(`/${tokenData.target_user_role}`)
  } catch (error) {
    console.error("[v0] Impersonation error:", error)
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <div className="w-full max-w-md rounded-lg border bg-background p-8 text-center shadow-lg">
          <h1 className="mb-4 text-2xl font-semibold">Master Admin Impersonation</h1>
          <div className="mb-4 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-destructive">
              <span className="text-3xl text-destructive">✕</span>
            </div>
          </div>
          <p className="text-muted-foreground">Internal server error</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "Unknown error"}
          </p>
        </div>
      </div>
    )
  }
}
