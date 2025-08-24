import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { sendEmail, emailTemplates } from "@/lib/email/smtp"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Send email API called")

    const contentType = request.headers.get("content-type")
    let body: any

    if (contentType?.includes("application/json")) {
      body = await request.json()
    } else {
      // Handle FormData from feedback modal
      const formData = await request.formData()
      body = {
        type: formData.get("template") as string,
        to: formData.get("to") as string,
        subject: formData.get("subject") as string,
        data: JSON.parse((formData.get("data") as string) || "{}"),
      }
    }

    console.log("[v0] Email request body:", body)

    const { type, to, subject, data } = body
    const supabase = await createClient()

    if (type === "auth" || type === "signup" || type === "recovery" || type === "invite") {
      let template

      switch (type) {
        case "signup":
          template = emailTemplates.signup(data)
          break
        case "recovery":
          template = emailTemplates.recovery(data)
          break
        case "invite":
          template = emailTemplates.invite(data)
          break
        default:
          // Handle generic auth emails
          template = { subject: subject || "MyDayLogs Authentication", html: data.html || "" }
      }

      const result = await sendEmail(to, template.subject, template.html)

      if (!result.success) {
        console.error("[v0] Auth email failed:", result.error)
        return NextResponse.json({ error: "Failed to send authentication email" }, { status: 500 })
      }

      return NextResponse.json({ success: true, message: "Authentication email sent successfully" })
    }

    if (type === "feedback") {
      const { error: dbError } = await supabase.from("feedback").insert({
        name: data.name?.trim() || "Anonymous",
        email: data.email?.trim() || "Anonymous",
        subject: subject || "Feedback!",
        message: data.message?.trim() || "",
        page_url: data.page_url || null,
        user_id: data.user_id || null,
        status: "unread",
      })

      if (dbError) {
        console.error("[v0] Database error:", dbError)
        return NextResponse.json({ error: "Failed to store feedback" }, { status: 500 })
      }

      // Send email notification to admin
      const template = emailTemplates.feedback(data)
      const result = await sendEmail("info@mydaylogs.co.uk", template.subject, template.html)

      if (!result.success) {
        console.error("[v0] Email sending failed:", result.error)
        return NextResponse.json({ error: "Failed to send email notification" }, { status: 500 })
      }

      return NextResponse.json({ success: true, message: "Feedback submitted successfully" })
    } else if (type === "response") {
      const template = emailTemplates.response(data)
      const result = await sendEmail(to, subject, template.html)

      if (!result.success) {
        console.error("[v0] Response email failed:", result.error)
        return NextResponse.json({ error: "Failed to send response" }, { status: 500 })
      }

      // Update feedback status to 'responded'
      if (data.feedbackId) {
        const { error: updateError } = await supabase
          .from("feedback")
          .update({ status: "responded" })
          .eq("id", data.feedbackId)

        if (updateError) {
          console.error("[v0] Failed to update feedback status:", updateError)
        }
      }

      return NextResponse.json({ success: true, message: "Response sent successfully" })
    }

    return NextResponse.json({ error: "Invalid email type" }, { status: 400 })
  } catch (error) {
    console.error("[v0] Send email API error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
