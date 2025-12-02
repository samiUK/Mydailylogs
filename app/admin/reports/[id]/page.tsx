export const dynamic = "force-dynamic"

import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import { ReportViewClient } from "./report-view-client"

interface ReportViewPageProps {
  params: Promise<{
    id: string
  }>
  searchParams: Promise<{
    download?: string
  }>
}

export default async function ReportViewPage({ params, searchParams }: ReportViewPageProps) {
  const resolvedParams = await params
  const resolvedSearchParams = await searchParams
  const autoDownload = resolvedSearchParams.download === "true"

  console.log("[v0] ReportViewPage - Loading report ID:", resolvedParams.id)

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    console.log("[v0] ReportViewPage - No user found, redirecting to login")
    redirect("/auth/login")
  }

  console.log("[v0] ReportViewPage - User authenticated:", user.id)

  const { data: templateAssignment, error: templateError } = await supabase
    .from("template_assignments")
    .select(`
      *,
      checklist_templates(
        name,
        description,
        checklist_items(*)
      ),
      profiles!assigned_to(
        full_name,
        email
      )
    `)
    .eq("id", resolvedParams.id)
    .single()

  console.log("[v0] ReportViewPage - Template assignment query result:", { templateAssignment, templateError })
  console.log("[v0] ReportViewPage - Profile data:", templateAssignment?.profiles)

  let submission = templateAssignment
  let isDaily = false

  if (templateError || !templateAssignment) {
    console.log("[v0] ReportViewPage - Not found in template_assignments, trying daily_checklists")

    const { data: dailyChecklist, error: dailyError } = await supabase
      .from("daily_checklists")
      .select(`
        *,
        checklist_templates(
          name,
          description,
          checklist_items(*)
        ),
        profiles!assigned_to(
          full_name,
          email
        )
      `)
      .eq("id", resolvedParams.id)
      .single()

    console.log("[v0] ReportViewPage - Daily checklist query result:", { dailyChecklist, dailyError })
    console.log("[v0] ReportViewPage - Daily profile data:", dailyChecklist?.profiles)

    if (dailyError || !dailyChecklist) {
      console.log("[v0] ReportViewPage - Report not found in either table")
      notFound()
    }

    submission = dailyChecklist
    isDaily = true
  }

  console.log("[v0] ReportViewPage - Found submission:", { submission, isDaily })

  const { data: responses, error: responsesError } = await supabase
    .from("checklist_responses")
    .select("*")
    .eq(isDaily ? "daily_checklist_id" : "assignment_id", submission.id)

  console.log(
    "[v0] ReportViewPage - Loading responses for",
    isDaily ? "daily_checklist_id" : "assignment_id",
    ":",
    submission.id,
  )
  console.log("[v0] ReportViewPage - Responses loaded:", responses?.length || 0, "records")

  if (responsesError) {
    console.error("[v0] ReportViewPage - Error loading responses:", responsesError)
  }

  const reportResponses = responses || []

  console.log("[v0] ReportViewPage - Passing", reportResponses.length, "responses to client component")

  return <ReportViewClient submission={submission} responses={reportResponses} autoDownload={autoDownload} />
}
