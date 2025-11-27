import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { sendEmail } from "@/lib/email/smtp"

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
      .select("role, organization_id, full_name, email")
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
      .select("id, email, full_name, first_name")
      .in("id", newMemberIds)

    if (assignedMembers && assignedMembers.length > 0) {
      const notifications = assignedMembers.map((member) => ({
        user_id: member.id,
        type: "assignment",
        message: `You have been assigned to complete "${template.name}"${template.specific_date ? ` by ${new Date(template.specific_date).toLocaleDateString()}` : template.deadline_date ? ` by ${new Date(template.deadline_date).toLocaleDateString()}` : ""}`,
        template_id: templateId,
        is_read: false,
        created_at: new Date().toISOString(),
      }))

      await supabase.from("notifications").insert(notifications)

      for (const member of assignedMembers) {
        try {
          await sendEmail({
            to: member.email,
            ...sendEmail.templates.taskAssignment({
              assigneeName: member.first_name || member.full_name || "Team Member",
              assignerName: profile.full_name || profile.email,
              taskName: template.name,
              description: template.description,
              dueDate: template.specific_date || template.deadline_date,
              taskUrl: `${process.env.NEXT_PUBLIC_SITE_URL || "https://mydaylogs.co.uk"}/staff`,
            }),
          })
          console.log(`[v0] Sent task assignment email to ${member.email}`)
        } catch (emailError) {
          console.error(`[v0] Failed to send email to ${member.email}:`, emailError)
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
