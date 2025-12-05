# Trial Cancellation & Charge Prevention Guide

## For Customers: How to Avoid Being Charged

### Method 1: Self-Service Cancellation (Recommended)
1. Go to **Settings > Billing & Subscription**
2. Click **"Cancel Subscription"** button (visible during trial)
3. Confirm cancellation
4. ✅ You'll keep full access until trial ends
5. ✅ No charges will be made
6. ✅ Automatic downgrade to Starter plan on Day 31

### Method 2: Contact Support
- Email: info@mydaylogs.co.uk
- Include: "Cancel my trial - [your email]"
- Response time: Within 24 hours
- Master admin will cancel manually

### Important Dates
- **Day 27** - Reminder email sent (3 days before trial ends)
- **Day 30** - Last day to cancel without charges
- **Day 31** - First billing date if not cancelled

---

## For Admins: Current Protection Mechanisms

### 1. Email Notifications
**Location:** `/lib/email/smtp.tsx` + `/app/api/webhooks/stripe/route.ts`

**Trial Ending Reminder** (Day 27):
- Subject: "Your MyDayLogs Trial Ends in 3 Days"
- Content: First billing date, amount, cancellation link
- Trigger: Webhook checks `subscription.trial_end` date

**Cancellation Confirmation**:
- Subject: "Subscription Cancelled"
- Content: Access until date, downgrade warning
- Trigger: User cancels via billing page

### 2. In-App Warnings
**Locations:**
- `/admin/profile/billing` - Shows "Trial ends on [date] - Then billing begins"
- `/masterdashboard` - Trial countdown on subscription cards

### 3. Cancellation Options

#### For Users:
- **Billing Page Cancel Button** - Graceful cancellation (keeps access)

#### For Master Admin:
- **Cancel at Period End** - User keeps access until trial ends
- **Cancel Immediately** - Instant termination, no charges
- **Downgrade to Starter** - Removes Stripe subscription entirely

### 4. Automatic Protections
**Daily Cron Job** (`/app/api/cron/daily-tasks/route.ts`):
- Expires master admin test trials automatically
- Downgrades to Starter (no billing)
- Sends notification email

---

## Stripe Webhook Flow

\`\`\`
Customer Signs Up → Stripe Trial Created (30 days)
         ↓
Day 27: `customer.subscription.updated` webhook
         ↓
System checks: trial_end - today = 3 days?
         ↓
YES → Send "Trial Ending Reminder" email
         ↓
Customer cancels via billing page
         ↓
POST /api/subscriptions/cancel
         ↓
Stripe: subscription.update({ cancel_at_period_end: true })
         ↓
Database: cancel_at_period_end = true
         ↓
Send "Cancellation Confirmed" email
         ↓
Day 31: `customer.subscription.deleted` webhook
         ↓
Database: plan_name = "starter", status = "active"
         ↓
✅ No charge made, customer on free plan
\`\`\`

---

## Enhancement Recommendations

### 1. Additional Email Reminders
**Currently:** 1 email (Day 27)
**Recommended:** 3 emails
- Day 27: "Trial ends in 3 days"
- Day 29: "Trial ends in 1 day - Last chance to cancel"
- Day 30: "Trial ends today - Cancel now to avoid charges"

### 2. In-App Banner Warning
**When:** Days 28-30 of trial
**Where:** Every admin page
**Content:** "⚠️ Trial ends in X days - Cancel now to avoid charges"
**Action:** Link to billing page

### 3. SMS Notifications (Optional)
**When:** Day 29 (last chance reminder)
**Service:** Twilio integration
**Content:** "Your MyDayLogs trial ends tomorrow. Cancel now: [link]"

### 4. Cancel on First Login After Trial End
**Feature:** Modal dialog on first login after Day 31
**Content:** "Your trial has ended. Would you like to:"
- Continue with paid plan (£X/month)
- Downgrade to free Starter plan

### 5. Grace Period Option
**Feature:** 3-day grace period after trial ends
**Flow:** Trial ends → 3 days to cancel → Then first charge
**Benefit:** Reduces accidental charges

---

## Testing Checklist

- [ ] User can see "Cancel Subscription" button during trial
- [ ] Cancellation works without errors
- [ ] Email reminder sent 3 days before trial ends
- [ ] Trial countdown visible on billing page
- [ ] Master admin can cancel subscriptions manually
- [ ] Cancelled trials don't get charged on Day 31
- [ ] Webhook processes `customer.subscription.deleted` correctly
- [ ] Database updates to Starter plan after trial cancellation

---

## Support Contact

If a customer claims they were charged unexpectedly:
1. Check Stripe dashboard for transaction
2. Check `subscription_activity_logs` table for cancellation record
3. Check email logs for reminder emails sent
4. If charge was made incorrectly, process refund via master dashboard
5. Manually downgrade subscription to Starter

**Contact:** info@mydaylogs.co.uk
