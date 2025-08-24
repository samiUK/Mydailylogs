import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { Deno } from "https://deno.land/std@0.168.0/node/global.ts"

const SMTP_HOST = Deno.env.get("SMTP_HOST")
const SMTP_PORT = Deno.env.get("SMTP_PORT")
const SMTP_USER = Deno.env.get("SMTP_USER")
const SMTP_PASSWORD = Deno.env.get("SMTP_PASSWORD")

interface EmailRequest {
  type: "signup" | "recovery" | "email_change" | "invite"
  email: string
  token_hash?: string
  redirect_to?: string
  site_url: string
}

serve(async (req) => {
  try {
    const { type, email, token_hash, redirect_to, site_url }: EmailRequest = await req.json()

    let subject = ""
    let htmlContent = ""
    let textContent = ""

    switch (type) {
      case "signup":
        subject = "Confirm your MyDayLogs account"
        const confirmUrl = `${site_url}/auth/confirm?token_hash=${token_hash}&type=signup&redirect_to=${redirect_to || "/admin"}`
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #1DB584; padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">MyDayLogs</h1>
            </div>
            <div style="padding: 30px; background: #f9f9f9;">
              <h2 style="color: #333;">Welcome to MyDayLogs!</h2>
              <p style="color: #666; line-height: 1.6;">
                Thank you for signing up. Please confirm your email address by clicking the button below:
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${confirmUrl}" style="background: #1DB584; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                  Confirm Email Address
                </a>
              </div>
              <p style="color: #999; font-size: 14px;">
                If the button doesn't work, copy and paste this link: ${confirmUrl}
              </p>
            </div>
          </div>
        `
        textContent = `Welcome to MyDayLogs! Please confirm your email: ${confirmUrl}`
        break

      case "recovery":
        subject = "Reset your MyDayLogs password"
        const resetUrl = `${site_url}/auth/reset-password?token_hash=${token_hash}&type=recovery`
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #1DB584; padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">MyDayLogs</h1>
            </div>
            <div style="padding: 30px; background: #f9f9f9;">
              <h2 style="color: #333;">Reset Your Password</h2>
              <p style="color: #666; line-height: 1.6;">
                You requested to reset your password. Click the button below to set a new password:
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" style="background: #1DB584; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                  Reset Password
                </a>
              </div>
              <p style="color: #999; font-size: 14px;">
                If you didn't request this, please ignore this email. Link expires in 1 hour.
              </p>
            </div>
          </div>
        `
        textContent = `Reset your MyDayLogs password: ${resetUrl}`
        break

      case "invite":
        subject = "You've been invited to MyDayLogs"
        const inviteUrl = `${site_url}/auth/sign-up?token_hash=${token_hash}&type=invite&redirect_to=${redirect_to || "/admin"}`
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #1DB584; padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">MyDayLogs</h1>
            </div>
            <div style="padding: 30px; background: #f9f9f9;">
              <h2 style="color: #333;">You're Invited!</h2>
              <p style="color: #666; line-height: 1.6;">
                You've been invited to join MyDayLogs. Click the button below to accept your invitation:
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${inviteUrl}" style="background: #1DB584; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                  Accept Invitation
                </a>
              </div>
            </div>
          </div>
        `
        textContent = `You've been invited to MyDayLogs: ${inviteUrl}`
        break

      default:
        throw new Error(`Unsupported email type: ${type}`)
    }

    const emailData = {
      from: "MyDayLogs <info@mydaylogs.co.uk>",
      to: email,
      subject,
      html: htmlContent,
      text: textContent,
    }

    // Use your preferred email service (Nodemailer, Resend, etc.)
    // This is a placeholder for the actual email sending logic
    const response = await fetch(`${site_url}/api/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "auth",
        ...emailData,
      }),
    })

    if (!response.ok) {
      throw new Error("Failed to send email")
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    })
  } catch (error) {
    console.error("Email hook error:", error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    })
  }
})
