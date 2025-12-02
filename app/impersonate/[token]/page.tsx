import { createAdminClient } from "@/lib/supabase/admin"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { AlertTriangle, CheckCircle2 } from "lucide-react"

export default async function ImpersonatePage({ params }: { params: { token: string } }) {
  try {
    const { token } = params

    if (!token) {
      return <ErrorPage message="No impersonation token provided" />
    }

    const adminClient = createAdminClient()

    const { data: tokenData, error: tokenError } = await adminClient
      .from("impersonation_tokens")
      .select("*")
      .eq("token", token.toUpperCase())
      .eq("is_active", true)
      .gt("expires_at", new Date().toISOString())
      .is("used_at", null)
      .single()

    if (tokenError || !tokenData) {
      return <ErrorPage message="Invalid or expired impersonation token" />
    }

    await adminClient
      .from("impersonation_tokens")
      .update({
        used_at: new Date().toISOString(),
        is_active: false,
      })
      .eq("id", tokenData.id)

    const { data: sessionData, error: sessionError } = await adminClient.auth.admin.createSession({
      user_id: tokenData.target_user_id,
    })

    if (sessionError || !sessionData) {
      console.error("[v0] Failed to create session:", sessionError)
      return <ErrorPage message="Failed to create impersonation session" />
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

    cookieStore.set("impersonation-active", "true", {
      maxAge: 60 * 60 * 8, // 8 hours
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
        maxAge: 60 * 60 * 8,
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      },
    )

    const redirectPath = tokenData.target_user_role === "admin" ? "/admin" : "/staff"
    redirect(redirectPath)
  } catch (error) {
    console.error("[v0] Impersonation error:", error)
    return <ErrorPage message={error instanceof Error ? error.message : "Internal server error"} />
  }
}

function ErrorPage({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md rounded-lg border bg-background p-8 text-center shadow-lg">
        <div className="mb-4 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-destructive">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
        </div>
        <h1 className="mb-2 text-2xl font-semibold">Impersonation Failed</h1>
        <p className="text-muted-foreground">{message}</p>
        <a
          href="/masterdashboard"
          className="mt-6 inline-block rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Return to Master Dashboard
        </a>
      </div>
    </div>
  )
}

function SuccessPage({ userEmail, redirectPath }: { userEmail: string; redirectPath: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md rounded-lg border bg-background p-8 text-center shadow-lg">
        <div className="mb-4 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-green-500">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
          </div>
        </div>
        <h1 className="mb-2 text-2xl font-semibold">Impersonation Active</h1>
        <p className="text-muted-foreground mb-4">
          You are now viewing as <strong>{userEmail}</strong>
        </p>
        <p className="text-sm text-muted-foreground">Redirecting to dashboard...</p>
      </div>
    </div>
  )
}
