import { createServerClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { redirect, notFound } from "next/navigation"
import { ReportViewClient } from "./report-view-client"

interface ReportViewServerProps {
  reportId: string
}

export async function ReportViewServer({ reportId }: ReportViewServerProps) {
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Get the report submission
  const { data: submission, error: submissionError } = await supabase
    .from("template_assignments")
    .select(`
      *,
      checklist_templates(
        name,
        description,
        checklist_items
      ),
      profiles(
        full_name,
        email
      )
    `)
    .eq("id", reportId)
    .single()

  if (submissionError || !submission) {
    notFound()
  }

  // Get the responses for this submission
  const { data: responses, error: responsesError } = await supabase
    .from("checklist_responses")
    .select("*")
    .eq("checklist_id", submission.template_id)
    .eq("user_id", submission.assigned_to)

  const reportResponses = responses || []

  return <ReportViewClient submission={submission} responses={reportResponses} />
}
