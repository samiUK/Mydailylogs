# 🚀 MyDayLogs Launch Readiness Checklist

## Pre-Launch Verification

Visit `/api/admin/launch-readiness-check` to run automated checks.

---

## Critical Requirements (Must Pass 100%)

### 1. Database & Schema ✓
- [ ] All migration scripts run (001 through 080)
- [ ] `subscriptions` table exists with all columns
- [ ] `payments` table exists with fee tracking columns
- [ ] `organizations` table properly linked
- [ ] Row Level Security (RLS) enabled on all tables

### 2. Stripe Integration ✓
- [ ] Stripe account connected (live mode, not test)
- [ ] Growth Yearly plan configured in Stripe
- [ ] Scale Yearly plan configured in Stripe
- [ ] Webhook endpoint added to Stripe dashboard
- [ ] Webhook includes these events:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`
- [ ] Webhook secret stored in environment variables

### 3. Environment Variables ✓
**Required:**
- [ ] `STRIPE_SECRET_KEY` or `STRIPE_SECRET_KEY_MYDAYLOGS` (LIVE key)
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (LIVE key)
- [ ] `STRIPE_WEBHOOK_SECRET`
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `SMTP_HOST`
- [ ] `SMTP_PORT`
- [ ] `SMTP_USER`
- [ ] `SMTP_PASSWORD`
- [ ] `NEXT_PUBLIC_SITE_URL` (your production domain)
- [ ] `CRON_SECRET` (for scheduled tasks)

### 4. Email Notifications ✓
- [ ] SMTP credentials configured
- [ ] Test email sent successfully
- [ ] Trial ending reminder email template works
- [ ] Payment confirmation email template works
- [ ] Cancellation email template works

### 5. Subscription System ✓
- [ ] Dual-binding (email + org_id) working
- [ ] Trial subscriptions sync from Stripe
- [ ] Paid subscriptions sync from Stripe
- [ ] Cancellations sync from Stripe
- [ ] Real-time updates working (no logout needed)

### 6. Payment Processing ✓
- [ ] Stripe fee calculation working for UK
- [ ] Stripe fee calculation working for US
- [ ] Payment records created on successful charge
- [ ] Fee tracking columns populated
- [ ] Refund system working (fees marked non-refundable)

---

## Manual Testing Required

### Test Subscription Flow
1. **Sign up** for a new account
   - Verify starter subscription created
   - Check dashboard shows "Starter" plan

2. **Upgrade to Growth Yearly (Trial)**
   - Click upgrade, complete checkout
   - Verify trial subscription created in database
   - Check status shows "Paid Trial"
   - Confirm trial countdown visible
   - Verify trial reminder email scheduled

3. **Wait for Trial End** (or manually trigger)
   - Confirm first payment processed
   - Check status changes from "trialing" to "active"
   - Verify payment record created with fees

4. **Cancel Subscription**
   - Test "Cancel at Period End"
   - Verify access continues until period ends
   - Check reminder email sent 3 days before end
   - Confirm downgrade to Starter after period

5. **Test Refund**
   - Process a refund from master dashboard
   - Verify Stripe fees marked as non-refundable
   - Check payment status updated

---

## Production Deployment Steps

### 1. Switch Stripe to Live Mode
- Replace test API keys with LIVE keys
- Update webhook endpoint URL to production domain
- Test webhook delivery in Stripe dashboard

### 2. Configure Cron Jobs
Ensure Vercel cron jobs configured in `vercel.json`:
\`\`\`json
{
  "crons": [
    {
      "path": "/api/cron/midnight-operations",
      "schedule": "0 6 * * *"
    }
  ]
}
\`\`\`

### 3. Test Email Delivery
- Send test emails to real addresses
- Verify deliverability (check spam folders)
- Test all email templates

### 4. Database Backup
- Create backup of Supabase database
- Document rollback procedure

### 5. Monitor First 24 Hours
- Watch webhook delivery in Stripe dashboard
- Monitor Vercel logs for errors
- Check Supabase logs for database issues
- Verify trial reminder emails sent at 6am

---

## Known Issues to Address

1. ⚠️ **arsami.uk@gmail.com subscription sync**
   - Run script 079 to fix status constraint
   - Click "Sync from Stripe" on subscription row

2. ⚠️ **Fee tracking columns**
   - Run script 080 to add fee columns to payments table

---

## Post-Launch Monitoring

### Daily (First Week)
- Check trial reminder emails sent at 6am
- Monitor payment success/failure rates
- Review refund requests
- Check for webhook delivery failures

### Weekly
- Review conversion rate (trials → paid)
- Analyze payment processing fees
- Check for stuck subscriptions
- Monitor customer cancellations

---

## Emergency Contacts

- **Stripe Support**: dashboard.stripe.com/support
- **Supabase Support**: app.supabase.com/support
- **Vercel Support**: vercel.com/help

---

## Rollback Plan

If critical issues occur:
1. Disable new signups (add maintenance mode)
2. Stop processing new payments
3. Investigate issue in Stripe/Supabase logs
4. Fix issue in staging environment first
5. Deploy fix to production
6. Re-enable signups

---

**Last Updated:** ${new Date().toLocaleDateString()}
**System Version:** v1.0.0-launch-candidate
