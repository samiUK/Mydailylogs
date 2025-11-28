import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { sendEmail, emailTemplates } from "@/lib/email/resend"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Send email API called")

    const contentType = request.headers.get("content-type")
    let body: any

    if (contentType?.includes("application/json")) {
      body = await request.json()
    } else {
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

    if (type === "feedback" || type === "feedback_notification") {
      console.log("[v0] Processing feedback submission...")

      const feedbackTemplate = emailTemplates.feedbackNotification({
        userName: data.name || "User",
        userEmail: data.email || to,
        organization: data.organization || "Unknown Organization",
        feedbackType: data.feedbackType || data.type || "General Feedback",
        message: data.message || "",
      })

      // Send notification to support team
      const result = await sendEmail({
        to: "info@mydaylogs.co.uk",
        subject: feedbackTemplate.subject,
        html: feedbackTemplate.html,
        replyTo: data.email || to,
      })

      if (result.success) {
        console.log("[v0] Feedback notification sent to info@mydaylogs.co.uk")
      } else {
        console.error("[v0] Failed to send feedback notification:", result.error)
      }

      return NextResponse.json({
        success: result.success,
        message: result.success
          ? "Feedback submitted successfully. Our team will review it and respond soon."
          : "Failed to send feedback notification",
      })
    }

    if (type === "response") {
      console.log("[v0] Processing feedback response...")

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

      // Send response email to user
      const result = await sendEmail({
        to: to,
        subject: subject || "Response to Your Feedback - MyDayLogs",
        html: `
          ${emailTemplates.getEmailHeader()}
          <div style="padding: 30px; font-family: Arial, sans-serif; line-height: 1.6; color: #374151;">
            <h2 style="color: #10b981; margin-bottom: 20px;">Response to Your Feedback</h2>
            
            <p>Hi ${data.recipientName || "there"},</p>
            
            <p>Thank you for your feedback. Here's our response:</p>
            
            <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
              ${data.response || data.message}
            </div>
            
            <p>If you have any further questions, feel free to reply to this email.</p>
            
            <p>Best regards,<br><strong>The MyDayLogs Support Team</strong></p>
          </div>
          ${emailTemplates.getEmailFooter()}
        `,
        replyTo: "info@mydaylogs.co.uk",
      })

      return NextResponse.json({
        success: result.success,
        message: result.success ? "Response sent successfully" : "Failed to send response",
      })
    }

    return NextResponse.json({ error: "Invalid email type" }, { status: 400 })
  } catch (error) {
    console.error("[v0] Send email API error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 },
    )
  }
}
