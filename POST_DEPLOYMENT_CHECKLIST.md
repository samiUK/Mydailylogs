# Post-Deployment Subscription System Checklist

## ✅ SQL Script 077 - COMPLETED
The unified subscription table script has been run successfully.

## 🔍 Next Steps to Complete Setup

### 1. Verify Subscription Sync is Working
Run this API endpoint to check if arsami.uk@gmail.com's subscription is correctly synced:

\`\`\`bash
GET /api/admin/verify-subscription-sync?email=arsami.uk@gmail.com
\`\`\`

**Expected Result:**
- `success: true`
- `currentPlan: "growth"` (not "starter")
- All checks should pass

### 2. Test Login Flow
1. Log in as arsami.uk@gmail.com
2. Check the admin dashboard shows "Growth" plan
3. Navigate to Billing & Subscription page
4. Verify it shows "Growth" yearly plan with correct pricing

### 3. Test Master Dashboard
1. Log in to Master Dashboard
2. Go to Subscriptions tab
3. Verify arsami.uk@gmail.com shows as "Growth" yearly
4. Check Payments tab shows the payment history

### 4. Test Quota Limits
1. As arsami.uk@gmail.com, try creating templates
2. Verify Growth plan limits apply (10 templates, 25 team members)
3. Check no "Upgrade" prompts appear

### 5. Test Webhook Flow (Critical)
To verify future subscriptions work:
1. Go to Stripe Dashboard → Webhooks
2. Find your webhook endpoint (should be: `https://yourdomain.com/api/webhooks/stripe`)
3. Send a test `customer.subscription.created` event
4. Check the webhook response is 200 OK
5. Verify the subscription appears in your database immediately

### 6. Test Plan Changes
1. From Master Dashboard, try changing a subscription plan
2. Verify the change appears immediately in:
   - Subscriptions tab
   - User's Billing page
   - User's dashboard
   - Quota limits

## 🔧 Troubleshooting

### If arsami.uk@gmail.com still shows "Starter":

**Option A: Force Sync via Admin Layout**
The system should auto-sync on next login. Log out and log back in as arsami.uk@gmail.com.

**Option B: Manual Sync via API**
\`\`\`bash
POST /api/admin/sync-subscription
Content-Type: application/json

{
  "organizationId": "1f16a2ef-17c0-47d3-b8a3-32e0db865a02"
}
\`\`\`

**Option C: Run SQL Fix Script**
\`\`\`sql
-- Check what's in the database
SELECT * FROM subscriptions 
WHERE organization_id = '1f16a2ef-17c0-47d3-b8a3-32e0db865a02';

-- If wrong plan_name, update it:
UPDATE subscriptions 
SET plan_name = 'growth'
WHERE organization_id = '1f16a2ef-17c0-47d3-b8a3-32e0db865a02'
  AND stripe_subscription_id IS NOT NULL;
\`\`\`

### If Webhook Isn't Working:

1. Check webhook signing secret is correct:
   - Environment variable: `STRIPE_WEBHOOK_SECRET`
   - Should match Stripe Dashboard → Webhooks → [Your webhook] → Signing secret

2. Check webhook URL is correct:
   - Should be: `https://yourdomain.com/api/webhooks/stripe`
   - Events to listen for:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`

## 📊 Where Subscriptions Are Updated

After SQL 077, subscriptions are automatically synchronized across:

**Write Operations (6 entry points):**
1. `/app/api/webhooks/stripe/route.ts` - Stripe events (PRIMARY)
2. `/app/auth/sign-up/actions.ts` - Trial creation
3. `/app/api/master/manage-subscription/route.ts` - Master admin changes
4. `/app/api/subscriptions/cancel/route.ts` - User cancellations
5. `/app/api/subscriptions/change-plan/route.ts` - Plan changes
6. `/lib/subscription-sync-failsafe.ts` - Fail-safe sync on login

**Read Operations (Auto-updated via database trigger):**
1. `/app/admin/layout.tsx` - Every page load
2. `/app/admin/page.tsx` - Dashboard
3. `/app/admin/profile/billing/page.tsx` - Billing page
4. `/lib/subscription-limits.ts` - Quota enforcement
5. `/app/api/master/dashboard-data/route.ts` - Master dashboard
6. `/app/masterdashboard/SubscriptionList.tsx` - All subscriptions
7. `/app/masterdashboard/PaymentList.tsx` - Payment history

**Database Trigger Ensures:**
- Any change to `subscriptions` table automatically updates `active_subscriptions` view
- Activity logs are created automatically for all subscription changes
- Only ONE subscription per organization can exist (unique constraint)

## ✨ What's Now Guaranteed

1. **Single Source of Truth**: `subscriptions` table is the only place subscription data lives
2. **No Duplicates**: Unique constraint ensures one subscription per organization
3. **Immediate Updates**: Database trigger propagates changes instantly
4. **Fail-Safe Sync**: Login checks Stripe if no subscription found
5. **Complete Audit Trail**: All changes logged to `subscription_activity_logs`
6. **Real-time Quotas**: Limits update immediately after plan changes

## 🎯 Final Verification Command

Run this to get a complete status report:

\`\`\`bash
GET /api/admin/subscription-status-report
\`\`\`

This shows:
- All paid customers
- Their current plans
- Any sync issues
- Webhook status
- Database health
