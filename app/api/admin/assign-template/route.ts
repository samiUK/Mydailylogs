import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { sendEmail, emailTemplates } from "@/lib/email/resend"
import { formatUKDate } from "@/lib/date-formatter"
import { getSubscriptionLimits } from "@/lib/subscription-limits"

export async function POST(request: NextRequest) {
  try {
    const { templateId, memberIds, dueDate } = await request.json()

    if (!templateId || !memberIds || !Array.isArray(memberIds)) {
      return NextResponse.json({ error: "Template ID and member IDs are required" }, { status: 400 })
    }

    const supabase = await createClient()

    // Verify user is admin or manager
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

    if (profile?.role !== "admin" && profile?.role !== "manager") {
      return NextResponse.json({ error: "Admin or manager access required" }, { status: 403 })
    }

    const subscriptionLimits = await getSubscriptionLimits(profile.organization_id)
    const isPaidUser = subscriptionLimits.planName !== "Starter"

    const { data: template } = await supabase
      .from("checklist_templates")
      .select("name, description, specific_date, deadline_date")
      .eq("id", templateId)
      .single()

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 })
    }

    const assignmentDueDate = dueDate || template.specific_date || template.deadline_date

    let holidayWarning = null
    if (assignmentDueDate) {
      const { data: holidays } = await supabase
        .from("holidays")
        .select("name, date")
        .eq("organization_id", profile.organization_id)
        .eq("date", assignmentDueDate)

      if (holidays && holidays.length > 0) {
        holidayWarning = `Warning: Due date ${formatUKDate(assignmentDueDate)} is ${holidays[0].name}`
        console.log(`[v0] ${holidayWarning}`)
      }
    }

    const assignments = memberIds.map((memberId: string) => ({
      template_id: templateId,
      assigned_to: memberId,
      assigned_by: user.id,
      organization_id: profile.organization_id,
      assigned_at: new Date().toISOString(),
      due_date: assignmentDueDate,
      is_active: true,
    }))

    const { error: createError } = await supabase.from("template_assignments").insert(assignments)

    if (createError) {
      console.error("[v0] Database error (create):", createError)
      return NextResponse.json({ error: "Failed to create assignments" }, { status: 500 })
    }

    console.log(`[v0] Created ${assignments.length} new assignments`)

    const { data: assignedMembers } = await supabase
      .from("profiles")
      .select("id, email, full_name, first_name, last_name")
      .in("id", memberIds)

    if (assignedMembers && assignedMembers.length > 0) {
      const dueDateText = assignmentDueDate ? ` by ${formatUKDate(assignmentDueDate)}` : ""

      const notifications = assignedMembers.map((member) => ({
        user_id: member.id,
        type: "assignment",
        message: `You have been assigned to complete "${template.name}"${dueDateText}`,
        template_id: templateId,
        is_read: false,
        created_at: new Date().toISOString(),
      }))

      await supabase.from("notifications").insert(notifications)

      if (isPaidUser) {
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

            const taskTemplate = emailTemplates.taskAssignment({
              userName: memberFullName,
              taskName: template.name,
              taskDescription: template.description,
              dueDate: assignmentDueDate ? formatUKDate(assignmentDueDate) : undefined,
              assignedBy: adminFullName,
            })

            await sendEmail({
              to: member.email,
              subject: taskTemplate.subject,
              html: taskTemplate.html,
            })

            console.log("[v0] Task assignment email sent to:", member.email)
          } catch (emailError) {
            console.error(`[v0] Failed to send email to ${member.email}:`, emailError)
          }
        }
        console.log(`[v0] Email notifications sent to ${assignedMembers.length} team members (paid plan)`)
      } else {
        console.log(`[v0] Email notifications skipped (free plan - in-app notifications only)`)
      }
    }

    return NextResponse.json({
      success: true,
      assignedCount: assignments.length,
      holidayWarning,
    })
  } catch (error) {
    console.error("Error assigning template:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
