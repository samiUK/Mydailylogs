import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"
import { sendEmail } from "@/lib/email/smtp"

export async function POST(request: Request) {
  try {
    const { organizationId } = await request.json()

    if (!organizationId) {
      return NextResponse.json({ error: "Organization ID required" }, { status: 400 })
    }

    const supabase = createServerClient()

    // Get organization details
    const { data: org } = await supabase
      .from("organizations")
      .select("organization_name")
      .eq("organization_id", organizationId)
      .single()

    // Get all admins for the organization
    const { data: admins } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("organization_id", organizationId)
      .in("role", ["admin", "manager"])

    // Get submitted reports for the organization
    const { data: reports } = await supabase
      .from("submitted_reports")
      .select("id, template_name, submitted_at, submitted_by, report_data")
      .eq("organization_id", organizationId)
      .order("submitted_at", { ascending: false })
      .limit(50)

    if (!admins || admins.length === 0) {
      return NextResponse.json({ error: "No admins found for organization" }, { status: 404 })
    }

    // Send email to each admin
    const emailPromises = admins.map((admin) =>
      sendEmail({
        to: admin.email,
        subject: `Reports Summary for ${org?.organization_name}`,
        html: `
          <h2>Reports Summary</h2>
          <p>Hi ${admin.full_name},</p>
          <p>Here is a summary of recent reports for ${org?.organization_name}:</p>
          <ul>
            ${reports?.map((r) => `<li><strong>${r.template_name}</strong> - Submitted ${new Date(r.submitted_at).toLocaleDateString()}</li>`).join("")}
          </ul>
          <p>Total reports: ${reports?.length || 0}</p>
          <p>Please log in to view full details.</p>
        `,
      }),
    )

    await Promise.all(emailPromises)

    return NextResponse.json({ success: true, message: `Reports sent to ${admins.length} admins` })
  } catch (error) {
    console.error("[v0] Email reports error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
