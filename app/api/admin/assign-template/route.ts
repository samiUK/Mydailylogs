import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { sendEmail } from "@/lib/email/smtp"
import { formatUKDate } from "@/lib/date-formatter"

export async function POST(request: NextRequest) {
  try {
    const { templateId, memberIds } = await request.json()

    if (!templateId || !memberIds || !Array.isArray(memberIds)) {
      return NextResponse.json({ error: "Template ID and member IDs are required" }, { status: 400 })
    }

    const supabase = await createClient()

    // Verify user is admin
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, organization_id, full_name, first_name, last_name, email")
      .eq("id", user.id)
      .single()

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const { data: template } = await supabase
      .from("checklist_templates")
      .select("name, description, specific_date, deadline_date")
      .eq("id", templateId)
      .single()

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 })
    }

    const { data: existingAssignments } = await supabase
      .from("template_assignments")
      .select("assigned_to")
      .eq("template_id", templateId)
      .in("assigned_to", memberIds)

    const existingMemberIds = existingAssignments?.map((a) => a.assigned_to) || []
    const newMemberIds = memberIds.filter((id: string) => !existingMemberIds.includes(id))

    if (newMemberIds.length === 0) {
      return NextResponse.json({ success: true, message: "All members already assigned" })
    }

    // Create assignments for new members only
    const assignments = newMemberIds.map((memberId: string) => ({
      template_id: templateId,
      assigned_to: memberId,
      assigned_by: user.id,
      organization_id: profile.organization_id,
      assigned_at: new Date().toISOString(),
      is_active: true,
    }))

    const { error } = await supabase.from("template_assignments").insert(assignments)

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Failed to assign template" }, { status: 500 })
    }

    const { data: assignedMembers } = await supabase
      .from("profiles")
      .select("id, email, full_name, first_name, last_name")
      .in("id", newMemberIds)

    if (assignedMembers && assignedMembers.length > 0) {
      const dueDateText = template.specific_date
        ? ` by ${formatUKDate(template.specific_date)}`
        : template.deadline_date
          ? ` by ${formatUKDate(template.deadline_date)}`
          : ""

      const notifications = assignedMembers.map((member) => ({
        user_id: member.id,
        type: "assignment",
        message: `You have been assigned to complete "${template.name}"${dueDateText}`,
        template_id: templateId,
        is_read: false,
        created_at: new Date().toISOString(),
      }))

      await supabase.from("notifications").insert(notifications)

      const adminFullName =
        profile.full_name ||
        (profile.first_name && profile.last_name ? `${profile.first_name} ${profile.last_name}` : null) ||
        profile.email

      for (const member of assignedMembers) {
        try {
          const memberFullName =
            member.full_name ||
            (member.first_name && member.last_name ? `${member.first_name} ${member.last_name}` : null) ||
            member.first_name ||
            "Team Member"

          await sendEmail({
            to: member.email,
            ...sendEmail.templates.taskAssignment({
              assigneeName: memberFullName,
              assignerName: adminFullName,
              taskName: template.name,
              description: template.description,
              dueDate: template.specific_date || template.deadline_date,
              taskUrl: `${process.env.NEXT_PUBLIC_SITE_URL || "https://mydaylogs.co.uk"}/staff`,
            }),
          })
        } catch (emailError) {
          console.error(`Failed to send email to ${member.email}:`, emailError)
          // Continue with other emails even if one fails
        }
      }
    }

    return NextResponse.json({ success: true, assignedCount: newMemberIds.length })
  } catch (error) {
    console.error("Error assigning template:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
