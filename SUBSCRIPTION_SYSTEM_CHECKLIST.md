# Subscription System Checklist

## Current Status for arsami.uk@gmail.com

**Problem:** Database shows "Starter" plan but Stripe shows "Growth Yearly (GBP)" in trial until Jan 4, 2026.

**Root Cause:** Check constraint on subscriptions table doesn't allow "trialing" status.

---

## Required Actions (In Order)

### 1. Run Migration Script
**File:** `scripts/079_fix_subscription_status_constraint.sql`

**What it does:**
- Drops the old restrictive status check constraint
- Adds new constraint allowing all Stripe statuses: active, trialing, past_due, canceled, unpaid, incomplete, incomplete_expired, paused

**How to run:** Click the ▶️ button next to the script file in v0

**Verification:** After running, check database schema to confirm constraint accepts "trialing"

---

### 2. Force Sync Subscription
**Location:** Master Dashboard → Subscriptions tab

**Steps:**
1. Search for "arsami.uk@gmail.com" in the filter box
2. Click "Sync from Stripe" button on the subscription row
3. Wait for success message

**Expected Result:**
- Plan changes from "Starter" to "Growth"
- Status shows "active" (or "trialing")
- Stripe subscription ID appears: `sub_1Saze1DMz3Bxx5pn9WbY0sma`
- Billing period shows correct dates

---

### 3. Verify Subscription System

**Test Points:**
- ✅ User sees "Growth" plan on their dashboard (`/admin`)
- ✅ User sees correct plan on billing page (`/admin/profile/billing`)
- ✅ Master Dashboard shows correct plan (`/masterdashboard`)
- ✅ Usage limits reflect Growth plan (check `/admin/reports`)
- ✅ "Downgrade to Starter" button ONLY appears on paid plans, not on Starter

---

## Environment Variables Required

These are already configured:
- ✅ `STRIPE_SECRET_KEY` or `STRIPE_SECRET_KEY_MYDAYLOGS`
- ✅ `STRIPE_PUBLISHABLE_KEY` or `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- ✅ `STRIPE_WEBHOOK_SECRET`
- ✅ Supabase connection variables

---

## Subscription Binding System

The system now uses **dual-binding** for maximum reliability:

1. **Primary:** `organization_id` in Stripe metadata (fastest)
2. **Fallback:** Customer email lookup (reliable safety net)

**How it works:**
- Webhook checks metadata first, falls back to email
- Force sync searches by metadata, then by email
- Login sync searches by email as primary method

---

## Email Notifications Configured

Emails are sent for:
- ✅ Payment confirmation (checkout complete)
- ✅ Upgrade (Growth → Scale)
- ✅ Downgrade (Scale → Growth)
- ✅ Trial ending reminder (3 days before)
- ✅ Monthly invoice (successful payment)
- ✅ Payment failed (with grace period warning)
- ✅ Cancellation confirmation

---

## Real-Time Subscription Updates

Users see plan changes immediately without logout:
- ✅ Supabase real-time listener on subscriptions table
- ✅ 30-second polling fallback
- ✅ Login sync as ultimate fail-safe

---

## Next Steps

1. **Run script 079** to fix the status constraint
2. **Click "Sync from Stripe"** for arsami.uk@gmail.com
3. **Verify** the plan shows correctly across all pages
4. **Test** a new subscription to ensure webhook works

---

## Troubleshooting

**If sync still fails after script 079:**
- Check `/api/admin/check-webhook-logs?email=arsami.uk@gmail.com` to see webhook history
- Check `/api/admin/check-arsami-subscription` to see current database state
- Check Stripe dashboard to verify subscription exists and is active/trialing
- Verify Stripe API keys are correct (test mode vs live mode)

**If webhook isn't working:**
- Go to Stripe Dashboard → Developers → Webhooks
- Check if webhook endpoint is configured: `https://yourdomain.com/api/webhooks/stripe`
- Verify webhook secret matches `STRIPE_WEBHOOK_SECRET` env var
- Check webhook event log for failures

---

## Database Schema

The `subscriptions` table should have:
- `id` (uuid, primary key)
- `organization_id` (uuid, foreign key to organizations)
- `plan_name` (text: 'starter', 'growth', 'scale')
- `status` (text: accepts all Stripe statuses including 'trialing')
- `stripe_subscription_id` (text, nullable)
- `stripe_customer_id` (text, nullable)
- `current_period_start` (timestamptz)
- `current_period_end` (timestamptz)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

**Unique constraint:** `(organization_id, stripe_subscription_id)` or just `organization_id`
