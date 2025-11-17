import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const cookieStore = await cookies()

  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect("/auth/login")
  }

  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, organization_name")
    .eq("email", user.email)
    .limit(1)

  console.log("[v0] Profile query result:", profiles)
  console.log("[v0] Profile error:", profileError)

  // If no profile found, redirect to login with error
  if (!profiles || profiles.length === 0) {
    console.log("[v0] No profile found, redirecting to login")
    redirect("/auth/login?error=profile_not_found")
  }

  const profile = profiles[0]
  console.log("[v0] User role:", profile?.role)

  if (profile?.role === "admin") {
    console.log("[v0] Redirecting to original admin dashboard")
    redirect(`/admin`)
  } else {
    console.log("[v0] Redirecting to original staff dashboard")
    redirect(`/staff`)
  }

  // The rest of the code remains unchanged
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Welcome back, {profile?.full_name || user.email}</h1>
          <p className="text-gray-600 mt-2">Dashboard</p> {/* Removed hardcoded Mydailylogs text */}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Active Checklists</h3>
            <p className="text-3xl font-bold text-indigo-600">0</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Completed Today</h3>
            <p className="text-3xl font-bold text-green-600">0</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Team Members</h3>
            <p className="text-3xl font-bold text-blue-600">1</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Getting Started</h2>
          </div>
          <div className="p-6">
            <p className="text-gray-600 mb-4">Welcome to your dashboard! Here&apos;s what you can do next:</p>{" "}
            {/* Removed hardcoded Mydailylogs text */}
            <ul className="space-y-2 text-gray-600">
              <li>• Create your first checklist template</li>
              <li>• Invite team members to your organization</li>
              <li>• Customize your brand settings</li>
              <li>• Set up daily compliance schedules</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
