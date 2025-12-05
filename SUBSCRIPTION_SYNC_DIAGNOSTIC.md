# Subscription Sync Diagnostic Guide

## Current Issue: arsami.uk@gmail.com

**Problem:** Stripe shows Growth Yearly (GBP) subscription in trial, but database shows Starter plan.

## Diagnostic Steps

### 1. Check Webhook Logs
Visit: `/api/admin/check-webhook-logs?email=arsami.uk@gmail.com`

This will show:
- Current subscription in database
- All subscription activity logs
- Number of webhook events received
- Number of manual syncs performed

### 2. Force Sync from Stripe
In Master Dashboard → Subscriptions tab:
- Search for "arsami.uk@gmail.com"
- Click "Sync from Stripe" button
- This will fetch the subscription directly from Stripe

### 3. Verify Stripe Configuration

**Check these in Stripe Dashboard:**
- Customer exists: arsami.uk@gmail.com (Customer ID: cus_TY5nUYe5v9E4ff)
- Subscription exists: Growth Plan/ Yearly (GBP)
- Webhook endpoint configured: `https://yourdomain.com/api/webhooks/stripe`
- Webhook events enabled:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`

### 4. Check Price ID Mapping

The subscription in Stripe is using price: `price_1SazBKDMz3Bxx5pnyJ1e70gp`

This matches in `lib/stripe-prices.ts`:
\`\`\`typescript
growth: {
  yearly: {
    GBP: "price_1SazBKDMz3Bxx5pnyJ1e70gp", // ✅ CORRECT
  }
}
\`\`\`

## Why Sync Might Fail

1. **Webhook Never Fired**
   - Subscription created outside of your checkout flow
   - Webhook endpoint not configured in Stripe
   - Webhook delivery failed

2. **Metadata Missing**
   - Subscription doesn't have `organization_id` in metadata
   - Subscription doesn't have `subscription_type` in metadata
   - Solution: Force sync uses email fallback

3. **Trial Subscriptions**
   - System already handles trial status correctly
   - Force sync includes both "active" and "trialing" subscriptions

## Solution

**For arsami.uk@gmail.com:**
1. Click "Sync from Stripe" in Master Dashboard
2. This will use the dual-binding system (metadata OR email)
3. The subscription will be found by email: arsami.uk@gmail.com
4. Database will be updated to Growth Yearly plan

**For Future Subscriptions:**
1. Ensure webhooks are properly configured in Stripe
2. Verify webhook secret is set in environment variables
3. Check webhook delivery logs in Stripe dashboard
4. System has automatic retry on login as fail-safe
