import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import { ReportViewClient } from "./report-view-client"

export const dynamic = "force-dynamic"

interface PageProps {
  params: { id: string }
  searchParams: { download?: string }
}

export default async function StaffReportViewPage({ params, searchParams }: PageProps) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Check template_assignments first
  let { data: submission } = await supabase
    .from("template_assignments")
    .select(`
      *,
      profiles!assigned_to(full_name, email),
      checklist_templates(
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
    .eq("id", params.id)
    .eq("assigned_to", user.id)
    .single()

  // If not found in template_assignments, check daily_checklists
  if (!submission) {
    const { data: dailySubmission } = await supabase
      .from("daily_checklists")
      .select(`
        *,
        profiles!assigned_to(full_name, email),
        checklist_templates(
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
      .eq("id", params.id)
      .eq("assigned_to", user.id)
      .single()

    submission = dailySubmission
  }

  if (!submission) {
    notFound()
  }

  // Get responses
  const { data: responses } = await supabase
    .from("checklist_responses")
    .select("*")
    .eq("checklist_id", submission.template_id)

  return (
    <ReportViewClient
      submission={submission}
      responses={responses || []}
      autoDownload={searchParams.download === "true"}
    />
  )
}
