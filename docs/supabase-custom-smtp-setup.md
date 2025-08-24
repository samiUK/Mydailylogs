# Supabase Custom SMTP Configuration

To ensure all authentication emails are sent from info@mydaylogs.co.uk, follow these steps:

## Option 1: Supabase Dashboard SMTP Configuration

1. Go to your Supabase project dashboard
2. Navigate to Authentication > Settings
3. Scroll down to "SMTP Settings"
4. Configure the following:
   - **SMTP Host**: smtp.zoho.com
   - **SMTP Port**: 587
   - **SMTP User**: info@mydaylogs.co.uk
   - **SMTP Password**: [Your Zoho mail password]
   - **Sender Name**: MyDayLogs
   - **Sender Email**: info@mydaylogs.co.uk

## Option 2: Send Email Hook (Recommended)

For more control over email templates and branding:

1. Deploy the Edge Function in `supabase/functions/send-email-hook/`
2. In Supabase Dashboard, go to Authentication > Hooks
3. Enable "Send Email Hook"
4. Set the hook URL to: `https://[your-project].supabase.co/functions/v1/send-email-hook`
5. Add the following environment variables to your Edge Function:
   - `SMTP_HOST=smtp.zoho.com`
   - `SMTP_PORT=587`
   - `SMTP_USER=info@mydaylogs.co.uk`
   - `SMTP_PASSWORD=[Your Zoho password]`

## Environment Variables Required

Add these to your Vercel project:
- `SMTP_HOST=smtp.zoho.com`
- `SMTP_PORT=587`
- `SMTP_USER=info@mydaylogs.co.uk`
- `SMTP_PASSWORD=[Your Zoho mail password]`

## Email Templates

The system includes branded email templates for:
- Account verification
- Password reset
- User invitations
- Feedback notifications
- Admin responses

All emails will be sent from info@mydaylogs.co.uk with consistent MyDayLogs branding.
