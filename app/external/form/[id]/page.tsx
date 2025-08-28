import { createClient } from "@/lib/supabase/server"
import { ExternalFormClient } from "./external-form-client"

export const dynamic = "force-dynamic"

interface ExternalFormPageProps {
  params: Promise<{ id: string }>
}

export default async function ExternalFormPage({ params }: ExternalFormPageProps) {
  const { id } = await params

  const supabase = await createClient()

  try {
    const { data: templateData, error: templateError } = await supabase
      .from("checklist_templates")
      .select("*")
      .eq("id", id)
      .eq("is_active", true)
      .single()

    if (templateError) throw templateError

    const { data: itemsData, error: itemsError } = await supabase
      .from("checklist_items")
      .select("*")
      .eq("template_id", id)
      .order("order_index")

    if (itemsError) throw itemsError

    return <ExternalFormClient template={templateData} items={itemsData || []} templateId={id} />
  } catch (error) {
    console.error("Error loading template:", error)
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Form Not Available</h1>
          <p className="text-muted-foreground">Template not found or no longer available</p>
        </div>
      </div>
    )
  }
}
