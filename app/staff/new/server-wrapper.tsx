import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import StaffNewReportPage from "./page"
import { Plus } from "lucide-react" // Added import for Plus component
import { Button } from "@/components/ui/button" // Added import for Button component
import Link from "next/link" // Added import for Link component

console.log("[v0] Staff New Report page - File loaded and parsing")

export const dynamic = "force-dynamic"

export default async function StaffNewReportServerWrapper() {
  console.log("[v0] Staff New Report page - Component function called")

  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    console.log("[v0] Staff New Report page - No user found, redirecting to login")
    redirect("/auth/login")
  }

  console.log("[v0] Staff New Report page - User ID:", user.id)

  // Get user profile
  const { data: profile, error: profileError } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  if (profileError || !profile) {
    console.log("[v0] Staff New Report page - Profile error:", profileError)
    return (
      <div className="container mx-auto p-6">
        <div className="text-center text-muted-foreground">Unable to load profile. Please try again.</div>
      </div>
    )
  }

  console.log("[v0] Staff New Report page - Profile found, organization_id:", profile.organization_id)

  const { data: subscription, error: subscriptionError } = await supabase
    .from("subscriptions")
    .select("status, plan_name")
    .eq("organization_id", profile.organization_id)
    .single()

  console.log("[v0] Staff New Report page - Subscription status:", subscription?.status)

  if (!subscription || subscription.status !== "active") {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <Plus className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold">Upgrade to Create New Reports</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Creating new reports is a premium feature. Upgrade your subscription to unlock unlimited report creation and
            advanced features.
          </p>
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6 max-w-md mx-auto">
            <h3 className="font-semibold text-lg mb-2">Premium Features Include:</h3>
            <ul className="text-sm text-muted-foreground space-y-1 text-left">
              <li>• Unlimited new report creation</li>
              <li>• Advanced report templates</li>
              <li>• Custom report scheduling</li>
              <li>• Priority support</li>
            </ul>
          </div>
          <div className="flex gap-4 justify-center">
            <Button
              size="lg"
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            >
              Upgrade Now
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/staff">Back to Dashboard</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Get available report templates
  const { data: templates, error: templatesError } = await supabase
    .from("checklist_templates")
    .select("*")
    .eq("organization_id", profile.organization_id)
    .eq("is_active", true)
    .order("name")

  console.log("[v0] Staff New Report page - Templates query error:", templatesError)
  console.log("[v0] Staff New Report page - Templates found:", templates?.length || 0)

  if (templatesError) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center text-muted-foreground">Error loading report templates. Please try again.</div>
      </div>
    )
  }

  return <StaffNewReportPage templates={templates || []} user={user} profile={profile} />
}
