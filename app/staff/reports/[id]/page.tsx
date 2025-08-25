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

  console.log("[v0] Staff ReportView - Loading report ID:", params.id)
  console.log("[v0] Staff ReportView - User ID:", user.id)

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

  console.log("[v0] Staff ReportView - Template assignment result:", submission)
  console.log("[v0] Staff ReportView - Profile data:", submission?.profiles)

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

    console.log("[v0] Staff ReportView - Daily checklist result:", dailySubmission)
    console.log("[v0] Staff ReportView - Daily profile data:", dailySubmission?.profiles)
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
