import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { sendEmail, emailTemplates } from "@/lib/email/resend"
import { formatUKDate } from "@/lib/date-formatter"
import { getSubscriptionLimits } from "@/lib/subscription-limits"
import { adjustToBusinessDay } from "@/lib/holiday-utils"

export async function POST(request: NextRequest) {
  try {
    const { templateId, memberIds, dueDate } = await request.json()

    if (!templateId || !memberIds || !Array.isArray(memberIds)) {
      return NextResponse.json({ error: "Template ID and member IDs are required" }, { status: 400 })
    }

    const supabase = await createClient()

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

    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("plan_name, status, stripe_subscription_id")
      .eq("organization_id", profile.organization_id)
      .in("status", ["active", "trialing"]) // Both active and trialing count as paid
      .not("stripe_subscription_id", "is", null) // Must have Stripe subscription
      .maybeSingle()

    const hasScaleEmails =
      subscription?.plan_name?.toLowerCase().startsWith("scale") &&
      (subscription?.status === "active" || subscription?.status === "trialing") &&
      subscription?.stripe_subscription_id // Ensures it's a Stripe customer

    const { data: template } = await supabase
      .from("checklist_templates")
      .select("name, description, specific_date, deadline_date")
      .eq("id", templateId)
      .single()

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 })
    }

    const assignmentDueDate = dueDate || template.specific_date || template.deadline_date

    let duplicateWarnings: string[] = []
    if (assignmentDueDate) {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      const { data: existingAssignments } = await supabase
        .from("template_assignments")
        .select("assigned_to, status, profiles!inner(full_name, first_name, last_name, email)")
        .eq("template_id", templateId)
        .gte("assigned_at", todayStart.toISOString())
        .eq("is_active", true)
        .in("assigned_to", memberIds)
        .neq("status", "completed") // Only warn about pending/active assignments

      if (existingAssignments && existingAssignments.length > 0) {
        duplicateWarnings = existingAssignments.map((assignment: any) => {
          const memberName =
            assignment.profiles?.full_name ||
            (assignment.profiles?.first_name && assignment.profiles?.last_name
              ? `${assignment.profiles.first_name} ${assignment.profiles.last_name}`
              : assignment.profiles?.email)
          return memberName || "Unknown member"
        })
        console.log(`[v0] Warning: ${duplicateWarnings.length} user(s) already have pending assignments today`)
      }
    }

    let adjustedDueDate = assignmentDueDate
    let dueDateAdjustment: { wasAdjusted: boolean; reason?: string } | null = null

    if (assignmentDueDate) {
      const adjustment = await adjustToBusinessDay(supabase, profile.organization_id, assignmentDueDate)
      adjustedDueDate = adjustment.adjustedDate
      dueDateAdjustment = adjustment

      if (adjustment.wasAdjusted) {
        console.log(
          `[v0] Due date adjusted from ${formatUKDate(assignmentDueDate)} to ${formatUKDate(adjustedDueDate)} - Reason: ${adjustment.reason}`,
        )
      }
    }

    const assignments = memberIds.map((memberId: string) => ({
      template_id: templateId,
      assigned_to: memberId,
      assigned_by: user.id,
      organization_id: profile.organization_id,
      assigned_at: new Date().toISOString(),
      due_date: adjustedDueDate,
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
      const dueDateText = adjustedDueDate ? ` by ${formatUKDate(adjustedDueDate)}` : ""

      const notifications = assignedMembers.map((member) => ({
        user_id: member.id,
        type: "assignment",
        message: `You have been assigned to complete "${template.name}"${dueDateText}`,
        template_id: templateId,
        is_read: false,
        created_at: new Date().toISOString(),
      }))

      await supabase.from("notifications").insert(notifications)
      console.log(`[v0] In-app notifications created for ${assignedMembers.length} team members`)

      if (hasScaleEmails) {
        console.log(`[v0] Sending assignment emails to Scale customers (${assignedMembers.length} members)`)

        for (const member of assignedMembers) {
          const memberName =
            member.full_name ||
            (member.first_name && member.last_name ? `${member.first_name} ${member.last_name}` : member.email)

          const assignerName =
            profile.full_name ||
            (profile.first_name && profile.last_name ? `${profile.first_name} ${profile.last_name}` : profile.email)

          try {
            await sendEmail({
              to: member.email,
              subject: `New Task Assignment: ${template.name}`,
              html: emailTemplates.taskAssignment({
                memberName,
                taskName: template.name,
                taskDescription: template.description || "",
                dueDate: adjustedDueDate ? formatUKDate(adjustedDueDate) : "No specific due date",
                assignerName,
                loginUrl: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.mydaylogs.co.uk"}/auth/login`,
              }),
            })
            console.log(`[v0] Assignment email sent to ${member.email}`)
          } catch (emailError) {
            console.error(`[v0] Failed to send email to ${member.email}:`, emailError)
          }
        }
      } else {
        console.log(`[v0] Assignment emails skipped - Scale plan with Stripe subscription required`)
      }
    }

    return NextResponse.json({
      success: true,
      assignedCount: assignments.length,
      dueDateAdjustment: dueDateAdjustment?.wasAdjusted
        ? {
            originalDate: assignmentDueDate,
            adjustedDate: adjustedDueDate,
            reason: dueDateAdjustment.reason,
          }
        : null,
      duplicateWarnings: duplicateWarnings.length > 0 ? duplicateWarnings : null,
    })
  } catch (error) {
    console.error("Error assigning template:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
