import { redirect } from "next/navigation"
import { ReportViewClient } from "./report-view-client"
import { cookies } from "next/headers"
import { supabase } from "@/lib/supabase/client"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ download?: string }>
}

export default async function StaffReportViewPage({ params, searchParams }: PageProps) {
  const resolvedParams = await params
  const resolvedSearchParams = await searchParams

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

  // Declare the responses variable before using it
  const responses = null // Placeholder for responses logic

  return (
    <ReportViewClient
      submission={submission}
      responses={responses || []}
      autoDownload={resolvedSearchParams.download === "true"}
    />
  )
}
