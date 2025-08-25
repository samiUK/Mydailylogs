import { redirect, notFound } from "next/navigation"
import { ReportViewClient } from "./report-view-client"
import { cookies } from "next/headers"
import { supabase } from "@/lib/supabase/client" // Declare the supabase variable

export const dynamic = "force-dynamic"

interface PageProps {
  params: { id: string }
  searchParams: { download?: string }
}

export default async function StaffReportViewPage({ params, searchParams }: PageProps) {
  const cookieStore = cookies()
  const isMasterAdminImpersonating = cookieStore.get("masterAdminImpersonation")?.value === "true"
  const impersonatedUserEmail = cookieStore.get("impersonatedUserEmail")?.value

  let user: any = null
  let profile: any = null

  if (isMasterAdminImpersonating && impersonatedUserEmail) {
    // Master admin is impersonating - get the impersonated user's data
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

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      redirect("/auth/login")
    }

    user = authUser
  }

  console.log("[v0] Staff ReportView - Loading report ID:", params.id)
  console.log("[v0] Staff ReportView - User ID:", user.id)

  let { data: submission, error: submissionError } = await supabase
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
    .eq("id", params.id)
    .single()

  console.log("[v0] Staff ReportView - Template assignment result:", submission)
  console.log("[v0] Staff ReportView - Template assignment error:", submissionError)
  console.log("[v0] Staff ReportView - Profile data:", submission?.profiles)

  if (submission && submission.assigned_to !== user.id) {
    console.log("[v0] Staff ReportView - Report exists but not assigned to current user")
    notFound()
  }

  if (!submission) {
    const { data: dailySubmission, error: dailyError } = await supabase
      .from("daily_checklists")
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
      .eq("id", params.id)
      .single()

    console.log("[v0] Staff ReportView - Daily checklist result:", dailySubmission)
    console.log("[v0] Staff ReportView - Daily checklist error:", dailyError)
    console.log("[v0] Staff ReportView - Daily profile data:", dailySubmission?.profiles)

    if (dailySubmission && dailySubmission.assigned_to !== user.id) {
      console.log("[v0] Staff ReportView - Daily report exists but not assigned to current user")
      notFound()
    }

    submission = dailySubmission
  }

  if (!submission) {
    console.log("[v0] Staff ReportView - No submission found in either table, calling notFound()")
    notFound()
  }

  console.log("[v0] Staff ReportView - Fetching responses for checklist_id:", params.id)
  const { data: responses, error: responsesError } = await supabase
    .from("checklist_responses")
    .select("*")
    .eq("checklist_id", params.id)

  console.log("[v0] Staff ReportView - Responses found:", responses?.length || 0)
  console.log("[v0] Staff ReportView - Responses error:", responsesError)

  return (
    <ReportViewClient
      submission={submission}
      responses={responses || []}
      autoDownload={searchParams.download === "true"}
    />
  )
}
