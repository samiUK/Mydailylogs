import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trash2, Users, Crown, ExternalLink } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

console.log("[v0] Admin Templates page - File loaded and parsing")

interface Template {
  id: string
  name: string
  description: string
  frequency: string
  is_active: boolean
  created_at: string
  profiles?: {
    full_name: string
  }
}

interface TeamMember {
  id: string
  first_name: string
  last_name: string
  full_name: string
  role: string
}

export default async function AdminTemplatesPage() {
  console.log("[v0] Admin Templates page - Component function called")

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

  console.log("[v0] Admin Templates page - User ID:", user?.id)

  if (!user) {
    console.log("[v0] Admin Templates page - No user found, redirecting to login")
    redirect("/auth/login")
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single()

  console.log("[v0] Admin Templates page - Profile query error:", profileError)
  console.log("[v0] Admin Templates page - Profile found, organization_id:", profile?.organization_id)

  if (profileError || !profile) {
    console.log("[v0] Admin Templates page - Profile not found, redirecting to login")
    redirect("/auth/login")
  }

  const { data: templates, error: templatesError } = await supabase
    .from("checklist_templates")
    .select("*, profiles!checklist_templates_created_by_fkey(full_name)")
    .eq("organization_id", profile.organization_id)
    .order("created_at", { ascending: false })

  console.log("[v0] Admin Templates page - Templates query error:", templatesError)
  console.log("[v0] Admin Templates page - Templates found:", templates?.length || 0)

  const { data: teamMembers, error: teamError } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, full_name, role")
    .eq("organization_id", profile.organization_id)
    .neq("id", user.id)
    .order("first_name")

  console.log("[v0] Admin Templates page - Team members query error:", teamError)
  console.log("[v0] Admin Templates page - Team members found:", teamMembers?.length || 0)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Report Templates</h1>
          <p className="text-muted-foreground mt-2">Create and manage your compliance report templates</p>
        </div>
        <Link href="/admin/templates/new">
          <Button>Create Report Template</Button>
        </Link>
      </div>

      {/* Templates Grid */}
      {templates && templates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <Card key={template.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <CardDescription className="mt-1">{template.description}</CardDescription>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      template.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {template.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>Frequency: {template.frequency}</p>
                  <p>Created by: {template.profiles?.full_name}</p>
                  <p>Created: {new Date(template.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-2 mt-4">
                  <Link href={`/admin/templates/${template.id}`}>
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                  </Link>
                  <Link href={`/admin/templates/assign/${template.id}`}>
                    <Button variant="outline" size="sm">
                      <Users className="w-4 h-4 mr-1" />
                      Assign
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled
                    className="text-amber-600 hover:text-amber-700 border-amber-200 hover:border-amber-300 bg-transparent"
                    title="Premium feature - Share forms with external contractors"
                  >
                    <Crown className="w-4 h-4 mr-1" />
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Share
                  </Button>
                  <form action={`/api/admin/delete-template`} method="POST">
                    <input type="hidden" name="id" value={template.id} />
                    <Button
                      type="submit"
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700 bg-transparent"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <h3 className="text-lg font-semibold text-foreground mb-2">No report templates yet</h3>
            <p className="text-muted-foreground mb-4">Create your first report template to get started</p>
            <Link href="/admin/templates/new">
              <Button>Create Your First Report Template</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
