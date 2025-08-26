import { createClient } from "@/lib/supabase/server"
import ExternalFormClient from "./external-form-client"

export const dynamic = "force-dynamic"

interface Template {
  id: string
  name: string
  description: string
  organization_id: string
}

interface ChecklistItem {
  id: string
  question: string
  type: string
  options: string[] | null
  is_required: boolean
  order_index: number
}

interface Organization {
  id: string
  name: string
  slug: string
}

export default async function ExternalFormPage({
  params,
}: {
  params: Promise<{ organization: string; id: string }>
}) {
  const { organization, id } = await params

  console.log("[v0] External form server - Loading data for org:", organization, "template:", id)

  const supabase = await createClient()

  try {
    // Load organization by slug
    const { data: orgData, error: orgError } = await supabase
      .from("organizations")
      .select("*")
      .eq("slug", organization)
      .single()

    console.log("[v0] External form server - Organization query result:", { orgData, orgError })

    if (orgError || !orgData) {
      console.log("[v0] External form server - Organization not found")
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Organization Not Found</h1>
            <p className="text-muted-foreground">The organization "{organization}" could not be found.</p>
          </div>
        </div>
      )
    }

    // Load template
    const { data: templateData, error: templateError } = await supabase
      .from("checklist_templates")
      .select("*")
      .eq("id", id)
      .eq("organization_id", orgData.id)
      .eq("is_active", true)
      .single()

    console.log("[v0] External form server - Template query result:", { templateData, templateError })

    if (templateError || !templateData) {
      console.log("[v0] External form server - Template not found")
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Form Not Found</h1>
            <p className="text-muted-foreground">The requested form is not available or no longer active.</p>
          </div>
        </div>
      )
    }

    // Load checklist items
    const { data: itemsData, error: itemsError } = await supabase
      .from("checklist_items")
      .select("*")
      .eq("template_id", id)
      .order("order_index")

    console.log("[v0] External form server - Items query result:", {
      itemsData,
      itemsError,
      itemCount: itemsData?.length,
    })

    if (itemsError) {
      console.log("[v0] External form server - Error loading items:", itemsError)
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Form</h1>
            <p className="text-muted-foreground">There was an error loading the form questions.</p>
          </div>
        </div>
      )
    }

    console.log("[v0] External form server - Successfully loaded data, rendering client component")

    return <ExternalFormClient organization={orgData} template={templateData} items={itemsData || []} templateId={id} />
  } catch (error) {
    console.error("[v0] External form server - Unexpected error:", error)
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-muted-foreground">An unexpected error occurred while loading the form.</p>
        </div>
      </div>
    )
  }
}
