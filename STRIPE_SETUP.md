# Stripe Integration Setup Guide

This guide will help you set up the Stripe payment integration for MyDaylogs subscription management.

## Prerequisites

- Stripe account (created and connected)
- Environment variables configured:
  - `STRIPE_SECRET_KEY`
  - `STRIPE_PUBLISHABLE_KEY`
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
  - `STRIPE_WEBHOOK_SECRET` (to be generated)
  - `NEXT_PUBLIC_SITE_URL` (your site URL)

## Step 1: Configure Webhook Endpoint

1. **Go to your Stripe Dashboard**: https://dashboard.stripe.com/webhooks

2. **Add a webhook endpoint**:
   - Click "Add endpoint"
   - Enter your webhook URL: `https://yourdomain.com/api/webhooks/stripe`
   - Select events to listen to:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`

3. **Get your webhook signing secret**:
   - After creating the endpoint, click to reveal the signing secret
   - Copy the secret (starts with `whsec_`)
   - Add it to your environment variables as `STRIPE_WEBHOOK_SECRET`

## Step 2: Test Webhook Locally (Development)

For local testing, use the Stripe CLI:

\`\`\`bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to your Stripe account
stripe login

# Forward webhooks to your local server
stripe listen --forward-to localhost:3000/api/webhooks/stripe
\`\`\`

The CLI will provide a webhook signing secret for testing. Use this as `STRIPE_WEBHOOK_SECRET` in your local environment.

## Step 3: Subscription Flow

### How it works:

1. **User clicks "Upgrade"** on the billing page
2. **Stripe Embedded Checkout** opens with payment form
3. **User completes payment** using Stripe's secure checkout
4. **Webhook receives `checkout.session.completed`** event
5. **Server creates/updates subscription** in Supabase database
6. **Payment is recorded** in the payments table
7. **User is redirected** to success page

### Subscription Products

The subscription products are defined in `lib/subscription-products.ts`:

- **Free**: £0/month - 3 templates, 5 team members
- **Professional**: £29/month - 20 templates, 25 team members, custom branding, priority support
- **Enterprise**: £99/month - Unlimited templates & users, all features

## Step 4: Database Schema

The integration uses these Supabase tables:

### subscriptions table
\`\`\`sql
- id (uuid) - Stripe subscription ID
- organization_id (uuid) - Links to organizations table
- plan_name (text) - e.g., "Professional", "Enterprise"
- status (text) - "active", "canceled", "past_due"
- current_period_start (timestamp)
- current_period_end (timestamp)
- created_at (timestamp)
- updated_at (timestamp)
\`\`\`

### payments table
\`\`\`sql
- id (uuid) - Auto-generated
- subscription_id (uuid) - Links to subscriptions table
- amount (numeric) - Payment amount in pounds
- currency (text) - e.g., "gbp"
- status (text) - "succeeded", "failed", "pending"
- transaction_id (text) - Stripe payment intent ID
- payment_method (text) - e.g., "card"
- created_at (timestamp)
- updated_at (timestamp)
\`\`\`

These tables should already exist in your database.

## Step 5: Testing

### Test Cards (Stripe Test Mode)

Use these test card numbers in test mode:

- **Success**: 4242 4242 4242 4242
- **Decline**: 4000 0000 0000 0002
- **Requires authentication**: 4000 0025 0000 3155

Use any future expiry date, any CVC, and any postal code.

### Test the Flow

1. Go to `/admin/billing` or `/admin/profile/billing`
2. Click "Upgrade" on a paid plan
3. Enter test card details
4. Complete checkout
5. Verify:
   - Subscription created in Supabase
   - Payment recorded
   - Webhook event logged in Stripe dashboard

## Step 6: Go Live

1. **Switch to Live Mode** in Stripe Dashboard
2. **Update environment variables** with live keys:
   - Replace test keys with live keys
   - Update webhook secret with live webhook secret
3. **Add live webhook endpoint** in Stripe Dashboard
4. **Test with real payment method**

## Troubleshooting

### Webhook not receiving events
- Check webhook URL is correct and accessible
- Verify `STRIPE_WEBHOOK_SECRET` matches Stripe dashboard
- Check Stripe dashboard webhook logs for errors
- Ensure your server is publicly accessible (not localhost in production)

### Checkout not loading
- Verify `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is set correctly
- Check browser console for errors
- Ensure Stripe.js can load (check ad blockers)

### Subscription not updating
- Check webhook logs in Stripe dashboard
- Look for errors in application logs
- Verify Supabase RLS policies allow service role access
- Check that `SUPABASE_SERVICE_ROLE_KEY` is set

## Support

For Stripe-specific issues, check:
- Stripe Dashboard: https://dashboard.stripe.com
- Stripe Documentation: https://stripe.com/docs
- Stripe Support: https://support.stripe.com

For application issues:
- Check application logs
- Review webhook event logs
- Verify database permissions
