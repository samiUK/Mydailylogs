# Promotional Campaign System Architecture

## Overview
The promotional campaign system uses a hybrid approach to track user engagement while integrating with Stripe for actual checkout discounts.

## How It Works

### Stripe Integration (1 Universal Code)
When you create a campaign with promo code "THANKS1ST100":
- **ONE** Stripe coupon is created: `THANKS1ST100`
- This single code is used by all 100 users at checkout
- Stripe enforces max 100 redemptions globally
- Users enter this code in the Stripe checkout form

### Unique Code Tracking (100 Unique Codes)
In parallel, the system generates 100 unique tracking codes:
- `THANKS1ST100-A1B2C3`
- `THANKS1ST100-D4E5F6`
- `THANKS1ST100-G7H8I9`
- ... (97 more)

These codes are:
- Displayed to users after feedback + social share
- Used to track WHO completed the requirements
- NOT used in Stripe checkout
- One per user to prevent multi-redemption

### User Journey

1. **User sees homepage banner**: "Share feedback and get 30% discount!"
2. **User clicks "Give Feedback"**
3. **User submits feedback**
4. **User clicks social share button** (Facebook/Twitter/LinkedIn)
5. **System reveals unique code**: `THANKS1ST100-A1B2C3`
6. **User copies and saves code**
7. **Later, user goes to upgrade**
8. **User enters `THANKS1ST100` at Stripe checkout** (not the unique code)
9. **Stripe applies 30% discount**
10. **System tracks redemption and links it to campaign**

### Why This Approach?

**Stripe Side:**
- Simple for users: one easy-to-remember code
- Stripe handles redemption limits automatically
- No API overhead creating 100 Stripe codes

**Our Side:**
- Track which specific users qualified (feedback + share)
- Prevent one user from claiming multiple codes
- Detailed analytics on conversion funnel
- Fraud prevention via unique code assignment

### Database Tables

**promotional_campaigns**
- Stores campaign details (name, discount, max redemptions)
- Links to Stripe coupon ID
- Banner control settings

**unique_promo_codes**
- 100 rows per campaign
- Each with unique code like `THANKS1ST100-A1B2C3`
- Tracks which email it was issued to
- Never used in Stripe checkout

**promo_code_redemptions**
- Tracks actual Stripe redemptions
- Links to campaign via promo code
- Records email, organization, discount amount

**social_shares**
- Tracks every social share click
- Links to campaign and user email
- Measures share-to-redemption conversion

### RLS (Row Level Security)

All campaign tables use RLS with service role bypass:
- Public can read active campaigns (for banner display)
- Only service role can insert/update/delete
- Master admin API routes use `createAdminClient()` to bypass RLS

### SQL Scripts Required

1. `create_main_promotional_campaigns_table.sql`
2. `add_banner_control_to_campaigns.sql`
3. `create_unique_promo_codes_table_fixed.sql`
4. `add_promotional_campaigns_rls_policies.sql`

## Banner System (3 Types)

**Type 1: Classic Default**
- No active campaign
- Hardcoded in `components/feedback-banner.tsx`
- "Share feedback to help us improve!"

**Type 2: Auto Promo**
- Campaign active, `show_on_banner` = false
- Auto-generates: "Share feedback and get {discount}% discount!"
- Quick setup, no custom text needed

**Type 3: Custom Dynamic**
- Campaign active, `show_on_banner` = true
- Fully customizable message and CTA
- For announcements, special promos, etc.
- Only one campaign can have banner enabled at a time

## Future Campaign Setup

To create a new campaign (e.g., "SUMMER50"):

1. Go to Master Dashboard → Campaign Manager
2. Fill in form:
   - Name: "Summer Sale"
   - Promo Code: "SUMMER50"
   - Discount: 50%
   - Max Redemptions: 200
   - Requirement: Feedback + Social Share
   - Banner toggle: ON (optional)
   - Custom banner message: "Summer sale! Share and save 50%"
3. Click Create

System automatically:
- Creates Stripe coupon `SUMMER50` (50% off, max 200 uses)
- Generates 200 unique codes (`SUMMER50-X1Y2Z3`, etc.)
- Updates homepage banner if toggle enabled
- Disables banner on other campaigns

**Zero code changes required.**

## Anti-Fraud Protection

- Email verification required before checkout
- Rate limiting on checkout attempts (5 per 15 min)
- One unique code per email per campaign
- 30-day cooldown after subscription cancellation
- IP and user agent tracking
- Stripe enforces one redemption per customer ID

## Analytics Available

- Total submissions (feedback + share)
- Social shares by platform
- Code issuance count
- Actual redemptions via Stripe
- Conversion rates at each funnel step
- Revenue impact per campaign
