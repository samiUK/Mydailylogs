import { redirect } from 'next/navigation'
import { ReportViewClient } from "./report-view-client"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ download?: string }>
}

export default async function StaffReportViewPage({ params, searchParams }: PageProps) {
  const resolvedParams = await params
  const resolvedSearchParams = await searchParams

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  console.log("[v0] Staff ReportView - Loading report ID:", resolvedParams.id)
  console.log("[v0] Staff ReportView - User ID:", user.id)

  const { data: submission, error: submissionError } = await supabase
    .from("template_assignments")
    .select(`
      *,
      profiles!assigned_to(full_name, email),
      checklist_templates!template_id(
        name,
        description,
        checklist_items(
          id,
          name,
          task_type,
          is_required,
          validation_rules,
          options
        )
      )
    `)
    .eq("id", resolvedParams.id)
    .single()

  const responses = null // Placeholder for responses logic

  return (
    <ReportViewClient
      submission={submission}
      responses={responses || []}
      autoDownload={resolvedSearchParams.download === "true"}
    />
  )
}
