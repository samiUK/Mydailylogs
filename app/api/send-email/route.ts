import { type NextRequest, NextResponse } from "next/server"
import { sendEmail, emailTemplates } from "@/lib/email/smtp"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Email API called")

    const contentType = request.headers.get("content-type") || ""
    let body: any

    if (contentType.includes("application/json")) {
      body = await request.json()
    } else if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData()
      body = {
        to: formData.get("to") as string,
        subject: formData.get("subject") as string,
        template: formData.get("template") as string,
        data: JSON.parse(formData.get("data") as string),
      }

      // Handle file attachments
      const attachments = []
      for (const [key, value] of formData.entries()) {
        if (key.startsWith("attachment_") && value instanceof File) {
          const buffer = Buffer.from(await value.arrayBuffer())
          attachments.push({
            filename: value.name,
            content: buffer,
            contentType: value.type,
          })
        }
      }
      body.attachments = attachments
    } else {
      return NextResponse.json({ error: "Unsupported content type" }, { status: 400 })
    }

    console.log("[v0] Email request body:", { ...body, attachments: body.attachments?.length || 0 })

    const { template, to, data, attachments } = body
    let emailContent

    switch (template || body.type) {
      case "feedback":
        emailContent = emailTemplates.feedback(data.subject, data.feedback, data.userEmail, data.timestamp)
        break
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

    console.log("[v0] Sending email with subject:", emailContent.subject)

    const result = await sendEmail({
      to,
      ...emailContent,
      attachments,
    })

    if (result.success) {
      console.log("[v0] Email sent successfully")
      return NextResponse.json({ success: true, messageId: result.messageId })
    } else {
      console.error("[v0] Email sending failed:", result.error)
      return NextResponse.json({ error: result.error }, { status: 500 })
    }
  } catch (error) {
    console.error("[v0] Email API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
