"use client"

interface Profile {
  id: string
  first_name: string | null
  last_name: string | null
  full_name: string | null
  email: string
  position: string | null
  role: string
  reports_to: string | null
}

interface EditTeamMemberPageProps {
  params: Promise<{ id: string }>
}

export default async function EditTeamMemberPage({ params }: EditTeamMemberPageProps) {
  const { id } = await params

  const { EditTeamMemberClient } = await import("./edit-team-member-client")

  return <EditTeamMemberClient memberId={id} />
}
