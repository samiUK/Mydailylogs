export const dynamic = "force-dynamic"
export const runtime = "nodejs"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, FileText, User, AlertCircle } from "lucide-react"
import Link from "next/link"
import { cookies } from "next/headers"

console.log("[v0] Admin History page - File loaded and parsing")

export default async function AdminHistoryPage() {
  console.log("[v0] Admin History page - Component function called")

  try {
    const cookieStore = await cookies()
    const isMasterAdminImpersonating = cookieStore.get("masterAdminImpersonation")?.value === "true"
    const impersonatedUserEmail = cookieStore.get("impersonatedUserEmail")?.value

    let user: any = null
    let profile: any = null

    if (isMasterAdminImpersonating && impersonatedUserEmail) {
      // Master admin is impersonating - get the impersonated user's data
      const supabase = await createClient()
      const { data: impersonatedProfile, error: impersonatedError } = await supabase
        .from("profiles")
        .select("*")
        .eq("email", impersonatedUserEmail)
        .single()

      if (impersonatedProfile) {
        user = { id: impersonatedProfile.id }
        profile = impersonatedProfile
      } else {
        redirect("/auth/login")
      }
    } else {
      // Regular authentication flow
      const supabase = await createClient()

      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()

      console.log("[v0] Admin History page - User ID:", authUser?.id)

      if (!authUser) {
        console.log("[v0] Admin History page - No user found, redirecting to login")
        redirect("/auth/login")
      }

      user = authUser

      // Get user profile
      const { data: regularProfile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single()

      console.log("[v0] Admin History page - Profile query error:", profileError)
      console.log("[v0] Admin History page - Profile data:", regularProfile)

      if (profileError || !regularProfile?.organization_id) {
        console.log("[v0] Admin History page - Profile not found or no organization")
        return (
          <div className="container mx-auto p-6">
            <Card className="max-w-md mx-auto">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  Profile Not Found
                </CardTitle>
                <CardDescription>Your user profile could not be loaded. Please try again.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full">
                  <Link href="/admin/history">Retry</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        )
      }

      profile = regularProfile
    }

    console.log("[v0] Admin History page - Profile found, organization_id:", profile.organization_id)

    // Get all report submissions for the organization
    const supabaseClient = await createClient()
    const { data: submissions, error: submissionsError } = await supabaseClient
      .from("template_assignments")
      .select(`
        *,
        checklist_templates(name, description),
        profiles(full_name, email)
      `)
      .eq("status", "completed")
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })

    console.log("[v0] Admin History page - Submissions query error:", submissionsError)
    console.log("[v0] Admin History page - Submissions found:", submissions?.length || 0)

    if (submissionsError) {
      console.log("[v0] Admin History page - Error loading submissions:", submissionsError)
      return (
        <div className="container mx-auto p-6">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                Loading Error
              </CardTitle>
              <CardDescription>Error loading report history. Please try again.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href="/admin/history">Try Again</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      )
    }

    console.log("[v0] Admin History page - Rendering page with", submissions?.length || 0, "submissions")

    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Submitted Reports</h1>
            <p className="text-muted-foreground">View all reports submitted by team members</p>
          </div>
        </div>

        {/* Reports List */}
        {submissions && submissions.length > 0 ? (
          <div className="space-y-4">
            {submissions.map((submission: any) => (
              <Card key={submission.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-5 w-5 text-blue-600" />
                      <div>
                        <CardTitle className="text-lg">
                          {submission.checklist_templates?.name || "Unknown Report Template"}
                        </CardTitle>
                        <CardDescription>
                          {submission.checklist_templates?.description || "No description available"}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant={submission.status === "completed" ? "default" : "secondary"}>
                      {submission.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span>
                        Submitted by: {submission.profiles?.full_name || submission.profiles?.email || "Unknown"}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Created: {new Date(submission.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {submission.completed_at
                          ? `Completed: ${new Date(submission.completed_at).toLocaleDateString()}`
                          : "In Progress"}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button asChild variant="outline">
                      <Link href={`/admin/reports/${submission.id}`}>View Details</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
                <div>
                  <h3 className="text-lg font-semibold">No Reports Found</h3>
                  <p className="text-muted-foreground">No report submissions found for your organization.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    )
  } catch (error) {
    console.log("[v0] Admin History page - Unexpected error:", error)
    return (
      <div className="container mx-auto p-6">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Unexpected Error
            </CardTitle>
            <CardDescription>An unexpected error occurred. Please try again.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/admin/history">Try Again</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }
}
