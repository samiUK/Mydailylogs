import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

const getBaseUrl = () => {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://www.mydaylogs.co.uk"
}

const getEmailLayout = (content: string, preheader?: string) => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        ${preheader ? `<meta name="description" content="${preheader}">` : ""}
        <style>
          body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
          .email-container { max-width: 600px; margin: 0 auto; background: #ffffff; }
          .header { background: #059669; padding: 32px; text-align: center; }
          .logo-text { color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px; }
          .content { padding: 40px 32px; color: #1f2937; line-height: 1.6; }
          .button { display: inline-block; background: #059669; color: #ffffff !important; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 24px 0; }
          .button:hover { background: #047857; }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <span class="logo-text">MyDayLogs</span>
          </div>
          <div class="content">
            ${content}
          </div>
        </div>
      </body>
    </html>
  `
}

export async function sendPromoCodeEmail(email: string, userName: string, promoCode: string, rank: number) {
  try {
    const html = getEmailLayout(
      `
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #059669; margin-bottom: 16px; font-size: 32px;">🎉 Congratulations!</h1>
          <p style="font-size: 18px; color: #1f2937; margin: 0;">
            You're <strong>#${rank}</strong> of the first 100 users to claim this exclusive offer!
          </p>
        </div>

        <p>Hi ${userName},</p>

        <p>Thank you for sharing your valuable feedback and supporting us on social media! As promised, here's your exclusive 20% discount code:</p>

        <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); border-radius: 12px; padding: 32px; margin: 32px 0; text-align: center;">
          <p style="color: #ffffff; margin: 0 0 12px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; opacity: 0.9;">Your Promo Code</p>
          <h2 style="color: #ffffff; margin: 0; font-size: 36px; letter-spacing: 4px; font-weight: 700;">${promoCode}</h2>
        </div>

        <div style="background: #ecfdf5; border: 1px solid #059669; border-radius: 8px; padding: 20px; margin: 24px 0;">
          <h3 style="margin: 0 0 12px 0; color: #1f2937; font-size: 16px;">How to use your code:</h3>
          <ol style="margin: 0; padding-left: 20px; color: #374151;">
            <li style="margin-bottom: 8px;">Choose your Growth or Scale plan at checkout</li>
            <li style="margin-bottom: 8px;">Enter promo code <strong>${promoCode}</strong> during checkout</li>
            <li>Enjoy 20% off your first billing period!</li>
          </ol>
        </div>

        <a href="${getBaseUrl()}/admin/billing" class="button">Upgrade Now</a>

        <div style="background: #ecfdf5; border-left: 4px solid #059669; padding: 16px; margin: 24px 0; border-radius: 4px;">
          <p style="margin: 0;"><strong>Important:</strong> This promo code can only be used once per account and applies to your first billing period only (after trial ends).</p>
        </div>

        <p style="margin-top: 32px; color: #6b7280;">
          Thank you for being an early supporter of MyDayLogs! We're grateful for your feedback and excited to help you manage your tasks more effectively.
        </p>
      `,
      `Your exclusive 20% discount code: ${promoCode}`,
    )

    const result = await resend.emails.send({
      from: "MyDayLogs <noreply@mydaylogs.co.uk>",
      to: email,
      subject: `Your Exclusive 20% Discount Code: ${promoCode}`,
      html,
    })

    console.log(`[v0] Promo code email sent successfully to: ${email}`)
    return { success: true, data: result }
  } catch (error) {
    console.error("[v0] Error sending promo code email:", error)
    return { success: false, error }
  }
}
