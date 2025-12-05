# MyDayLogs Production Launch Checklist

## 🚨 CRITICAL - Must Complete Before Launch

### Stripe Configuration
- [ ] **Create Missing Stripe Prices** (BLOCKER)
  - [ ] Growth Monthly GBP: £8.00/month
  - [ ] Growth Monthly USD: $10.00/month
  - [ ] Growth Yearly USD: $108.00/year ($9/month)
  - [ ] Scale Monthly USD: $17.00/month
  - [ ] Scale Yearly USD: $192.00/year ($16/month)
  - [ ] Update `lib/stripe-prices.ts` with new price IDs
  - [ ] Test checkout for all plan/currency combinations

- [ ] **Verify Webhook Configuration**
  - [ ] Webhook endpoint: `https://yourdomain.com/api/webhooks/stripe`
  - [ ] Webhook secret matches `STRIPE_WEBHOOK_SECRET` env var
  - [ ] Test webhook events: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted

- [ ] **Test Payment Flows**
  - [ ] Growth monthly subscription (GBP & USD)
  - [ ] Growth yearly subscription (GBP & USD)
  - [ ] Scale monthly subscription (GBP & USD)
  - [ ] Scale yearly subscription (GBP & USD)
  - [ ] 30-day trial cancellation (no charge)
  - [ ] Active subscription cancellation (access until period end)
  - [ ] Payment failure handling
  - [ ] Refund processing (full & partial)

### Database Security
- [ ] **Enable RLS on All Tables**
  \`\`\`sql
  ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
  ALTER TABLE quota_modifications ENABLE ROW LEVEL SECURITY;
  \`\`\`

- [ ] **Add Subscription Uniqueness Constraint**
  \`\`\`sql
  -- Ensure only ONE active subscription per organization
  CREATE UNIQUE INDEX idx_one_subscription_per_org 
  ON subscriptions (organization_id) 
  WHERE status IN ('active', 'trialing');
  \`\`\`

- [ ] **Verify All RLS Policies**
  - [ ] Run security audit: Check all tables have appropriate policies
  - [ ] Test user access: Verify users can only see their own data
  - [ ] Test admin access: Verify admins can manage organization data

### Email System
- [ ] **Verify Email Configuration**
  - [ ] SMTP_HOST, SMTP_USER, SMTP_PASSWORD set correctly
  - [ ] RESEND_API_KEY configured as fallback
  - [ ] Test email delivery to multiple providers (Gmail, Outlook, etc.)
  - [ ] Verify SPF/DKIM/DMARC records for info@mydaylogs.co.uk
  - [ ] Test all email templates:
    - [ ] Welcome email
    - [ ] Trial started email
    - [ ] Subscription upgrade email
    - [ ] Subscription downgrade email
    - [ ] Cancellation confirmation email
    - [ ] Payment success email
    - [ ] Payment failure email

- [ ] **Email Quota Management**
  - [ ] Monitor daily email usage
  - [ ] Set up alerts for 80% quota usage
  - [ ] Disable non-essential emails if approaching limit

### Environment Variables
- [ ] **Production Environment Variables Set**
  \`\`\`
  Required Stripe Variables:
  ✓ STRIPE_SECRET_KEY
  ✓ STRIPE_PUBLISHABLE_KEY
  ✓ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ✓ STRIPE_WEBHOOK_SECRET
  
  Required Supabase Variables:
  ✓ NEXT_PUBLIC_SUPABASE_URL
  ✓ NEXT_PUBLIC_SUPABASE_ANON_KEY
  ✓ SUPABASE_SERVICE_ROLE_KEY
  
  Required Email Variables:
  ✓ SMTP_HOST
  ✓ SMTP_PORT
  ✓ SMTP_USER
  ✓ SMTP_PASSWORD
  ✓ RESEND_API_KEY
  
  Required App Variables:
  ✓ NEXT_PUBLIC_SITE_URL
  ✓ CRON_SECRET
  ✓ MASTER_ADMIN_PASSWORD
  \`\`\`

## ⚠️ HIGH PRIORITY - Complete Within First Week

### Monitoring & Alerts
- [ ] **Set Up Error Monitoring**
  - [ ] Sentry or similar error tracking service
  - [ ] Alert on webhook failures
  - [ ] Alert on payment failures
  - [ ] Alert on subscription sync issues

- [ ] **Set Up Usage Monitoring**
  - [ ] Monitor Stripe webhook delivery rate
  - [ ] Monitor email quota usage
  - [ ] Monitor database performance
  - [ ] Set up uptime monitoring

### Customer Support
- [ ] **Support Channels Ready**
  - [ ] info@mydaylogs.co.uk monitored
  - [ ] Feedback form tested and monitored
  - [ ] Response SLA defined (24-48 hours)

- [ ] **Documentation Prepared**
  - [ ] User onboarding guide
  - [ ] FAQ for common issues
  - [ ] Subscription management guide
  - [ ] Billing and payment FAQ

### Compliance & Legal
- [ ] **Final Legal Review**
  - [ ] Terms of Service reviewed by legal counsel
  - [ ] Privacy Policy complies with GDPR/UK DPA
  - [ ] Cookie consent implemented
  - [ ] Data retention policies defined

- [ ] **Data Protection**
  - [ ] Data Processing Agreement available for enterprise customers
  - [ ] Data export functionality tested
  - [ ] Data deletion procedure documented
  - [ ] Backup and recovery tested

## 📊 RECOMMENDED - Improve Over Time

### Performance
- [ ] Add CDN for static assets
- [ ] Optimize database queries (add indexes where needed)
- [ ] Implement Redis caching for subscription status
- [ ] Add rate limiting on API endpoints

### User Experience
- [ ] A/B test pricing page
- [ ] Add in-app billing/usage dashboard
- [ ] Implement subscription renewal reminders (7 days before)
- [ ] Add payment method update flow

### Analytics
- [ ] Set up Google Analytics / Plausible
- [ ] Track conversion funnel: Landing → Signup → Trial → Paid
- [ ] Monitor churn rate and reasons
- [ ] Track feature usage by plan

### Scalability
- [ ] Plan for 100+ concurrent users
- [ ] Email queue system if scaling beyond 3,000 emails/month
- [ ] Consider Stripe Billing Portal for self-service
- [ ] Database connection pooling optimization

## 🧪 TESTING CHECKLIST

### End-to-End User Journey
- [ ] **New User Signup**
  1. [ ] Visit homepage
  2. [ ] Click "Start Free Trial" on Growth plan
  3. [ ] Complete signup form
  4. [ ] Enter payment details (Stripe test cards)
  5. [ ] Verify trial subscription created in database
  6. [ ] Verify welcome email received
  7. [ ] Access admin dashboard with Growth features
  8. [ ] Verify subscription shows "Trial" status

- [ ] **Trial Cancellation**
  1. [ ] Navigate to Billing page
  2. [ ] Click "Cancel Subscription"
  3. [ ] Confirm cancellation
  4. [ ] Verify immediate access termination (after trial ends)
  5. [ ] Verify cancellation email received
  6. [ ] Verify no charge in Stripe

- [ ] **Active Subscription Cancellation**
  1. [ ] Complete trial → first payment
  2. [ ] Cancel subscription
  3. [ ] Verify access continues until period end
  4. [ ] Verify downgrade happens after period end
  5. [ ] Verify cancellation email received

- [ ] **Plan Upgrade**
  1. [ ] Growth user upgrades to Scale
  2. [ ] Verify prorated charge in Stripe
  3. [ ] Verify immediate access to Scale features
  4. [ ] Verify upgrade email received
  5. [ ] Verify subscription updated in database

- [ ] **Plan Downgrade**
  1. [ ] Scale user downgrades to Growth
  2. [ ] Verify credit applied in Stripe
  3. [ ] Verify excess data archived (templates, team members)
  4. [ ] Verify downgrade email received
  5. [ ] Verify downgrade happens at period end

- [ ] **Payment Failure**
  1. [ ] Use declining test card
  2. [ ] Verify retry attempts
  3. [ ] Verify payment failure email sent
  4. [ ] Verify grace period applied
  5. [ ] Verify subscription suspended after grace period

### Multi-Currency Testing
- [ ] GBP payments work correctly
- [ ] USD payments work correctly
- [ ] Correct currency displayed based on user location
- [ ] Currency conversion accurate in admin dashboard

### Master Admin Dashboard
- [ ] View all subscriptions
- [ ] View all payments
- [ ] Issue refunds (full & partial)
- [ ] View subscription activity log
- [ ] Manage quotas
- [ ] View revenue metrics

## ✅ LAUNCH DAY CHECKLIST

### Morning of Launch
- [ ] Run final database backup
- [ ] Verify all Stripe prices are live
- [ ] Verify webhook is receiving events
- [ ] Test one complete signup flow
- [ ] Check error logs are empty
- [ ] Verify email delivery working

### During Launch
- [ ] Monitor error logs in real-time
- [ ] Monitor Stripe webhook dashboard
- [ ] Monitor email delivery
- [ ] Have rollback plan ready
- [ ] Support team standing by

### End of Launch Day
- [ ] Review all new signups
- [ ] Check for any failed payments
- [ ] Review error logs
- [ ] Send thank you message to first customers
- [ ] Plan day 2 monitoring

## 🚀 POST-LAUNCH (Week 1)

- [ ] Daily check of new subscriptions
- [ ] Daily check of payment failures
- [ ] Monitor customer support requests
- [ ] Track conversion rate
- [ ] Review and fix any bugs
- [ ] Send welcome email to all paying customers
- [ ] Request feedback from first 10 customers

## 📞 SUPPORT CONTACTS

- **Stripe Support**: dashboard.stripe.com/support
- **Supabase Support**: app.supabase.com/support
- **Email Support**: Your SMTP provider support
- **Emergency Contact**: [Your phone number]

---

**Last Updated**: [Current Date]
**Status**: Ready for launch after completing CRITICAL items
**Estimated Launch Date**: [Your target date]
