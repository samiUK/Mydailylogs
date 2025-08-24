import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, FileText, Plus } from "lucide-react"

console.log("[v0] Staff New Report page - File loaded and parsing")

export default async function StaffNewReportPage() {
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
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Unable to load profile. Please try again.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  console.log("[v0] Staff New Report page - Profile found, organization_id:", profile.organization_id)

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
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Error loading report templates. Please try again.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Create New Report</h1>
          <p className="text-muted-foreground">Choose from available report templates to create a new report</p>
        </div>
      </div>

      {templates && templates.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                  </div>
                  <Badge variant="secondary">Active</Badge>
                </div>
                <CardDescription className="line-clamp-2">
                  {template.description || "No description available"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4" />
                    <span>Created {new Date(template.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4" />
                    <span>Updated {new Date(template.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <form action={`/staff/new/${template.id}`} method="get">
                  <Button type="submit" className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Start Report
                  </Button>
                </form>
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
                <h3 className="text-lg font-semibold">No Report Templates Available</h3>
                <p className="text-muted-foreground">
                  No active report templates found. Contact your administrator to create report templates.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
