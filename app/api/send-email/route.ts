import { type NextRequest, NextResponse } from "next/server"
import { sendEmail, emailTemplates } from "@/lib/email/smtp"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { type, to, data } = body

    let emailContent

    switch (type) {
      case "welcome":
        emailContent = emailTemplates.welcome(data.userName, data.organizationName)
        break
      case "task-reminder":
        emailContent = emailTemplates.taskReminder(data.userName, data.taskName, data.dueDate)
        break
      case "task-overdue":
        emailContent = emailTemplates.taskOverdue(data.userName, data.taskName, data.overdueDays)
        break
      case "custom":
        emailContent = {
          subject: data.subject,
          html: data.html,
          text: data.text,
        }
        break
      default:
        return NextResponse.json({ error: "Invalid email type" }, { status: 400 })
    }

    const result = await sendEmail({
      to,
      ...emailContent,
    })

    if (result.success) {
      return NextResponse.json({ success: true, messageId: result.messageId })
    } else {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }
  } catch (error) {
    console.error("[v0] Email API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
