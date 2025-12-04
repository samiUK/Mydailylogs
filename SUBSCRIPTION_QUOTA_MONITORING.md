# Subscription & Quota Monitoring - Implementation Summary

## Overview
This document describes the comprehensive subscription management and quota monitoring system implemented for MyDaylogs master admin dashboard.

## 1. Subscription Management Features

### Display All Subscriptions
- **Location**: Master Dashboard → Subscriptions Tab
- **Features**:
  - Shows ALL subscriptions with complete billing information
  - Displays organization name, logo, and subscription details
  - Shows billing period (current_period_start to current_period_end)
  - Trial status with days remaining indicator
  - Active/Inactive status badges
  - Complimentary trial badges for master admin-granted trials

### Subscription Actions
Master admins can perform the following actions directly from the subscriptions tab:

#### 1. Start Complementary Trials
- **Without User Payment**: Master admin can grant 30-day free trials
- **Plans Available**: Growth or Scale plans
- **Marked as**: `is_masteradmin_trial: true` for tracking
- **Auto-Downgrade**: After trial ends, automatically downgrades to Starter plan

#### 2. Upgrade Subscriptions
- Starter → Growth (complementary trial)
- Starter → Scale (complementary trial)
- Growth → Scale (complementary trial or paid upgrade)

#### 3. Cancel Subscriptions
- **Stripe Integration**: Calls Stripe API to cancel subscription
- **Grace Period**: Subscription remains active until end of billing period
- **Database Update**: Updates `cancel_at_period_end` flag
- **Auto-Downgrade**: Downgrades to Starter plan after cancellation period

#### 4. Downgrade Subscriptions
- Immediate downgrade to Starter plan
- Cancels Stripe subscription immediately
- Updates organization quotas to Starter plan limits

### API Integration
All subscription actions communicate with Stripe:
- **Route**: `/api/master/manage-subscription`
- **Actions**: upgrade, cancel, downgrade
- **Authentication**: Master admin only (password protected)
- **Stripe Methods**:
  - `stripe.subscriptions.update()` - For cancellations
  - `stripe.subscriptions.cancel()` - For immediate downgrades

## 2. Usage Quota Monitoring

### Real-Time Metrics Display
**Location**: Master Dashboard → Overview Tab → Server Management Card

### Monitored Services

#### A. Supabase Database
- **Metric**: Database storage usage
- **Free Tier Limit**: 500 MB
- **Calculation**: Estimated from record counts (profiles × 2KB + templates × 3KB + reports × 5KB)
- **Status Indicators**:
  - 🟢 Green: < 70% usage (healthy)
  - 🟡 Orange: 70-90% usage (warning)
  - 🔴 Red: > 90% usage (critical)

#### B. Supabase Storage
- **Metric**: Blob storage (photos/files)
- **Free Tier Limit**: 1 GB
- **Calculation**: Photo count × average 500KB per photo
- **Displays**: Storage used (MB) and photo count

#### C. Resend Emails
- **Metric**: Monthly email sends
- **Free Tier Limit**: 3,000 emails/month
- **Calculation**: Reports created this month × 2 emails per report
- **Resets**: First day of each month

#### D. Vercel Bandwidth
- **Metric**: Monthly bandwidth usage
- **Free Tier Limit**: 100 GB/month
- **Calculation**: (Storage × 2) + (API calls × 10KB)
- **Note**: Rough estimation; connect Vercel API for precise data

### API Route
- **Endpoint**: `/api/master/usage-metrics`
- **Authentication**: Master admin only
- **Response Format**:
\`\`\`json
{
  "supabase": {
    "database": {
      "usedMB": 45.2,
      "limitMB": 500,
      "percentUsed": 9.04,
      "status": "healthy"
    },
    "storage": {
      "usedMB": 125.5,
      "limitMB": 1024,
      "photoCount": 251,
      "percentUsed": 12.26,
      "status": "healthy"
    }
  },
  "resend": {
    "emails": {
      "sentThisMonth": 450,
      "limit": 3000,
      "percentUsed": 15.0,
      "status": "healthy"
    }
  },
  "vercel": {
    "bandwidth": {
      "usedGB": 2.5,
      "limitGB": 100,
      "percentUsed": 2.5,
      "status": "healthy"
    }
  }
}
\`\`\`

### Visual Indicators
- **Progress Bars**: Color-coded based on usage percentage
- **Percentage Display**: Shows exact usage percentage
- **Status Summary**: Overall health status message
- **Refresh Button**: Manual refresh with loading spinner
- **Last Updated**: Timestamp of last refresh

### Status Messages
- ✅ **Healthy**: "All systems healthy. Usage within safe limits."
- 🟡 **Warning**: "Approaching free tier limits. Monitor closely and consider upgrading."
- ⚠️ **Critical**: "One or more services at or exceeding limits. Immediate action required!"

## 3. Organization Quota Management

### Per-Organization Quota Controls
Master admins can modify quotas for individual organizations:

#### Modifiable Quotas
1. **Template Limit**: Number of checklist templates
2. **Team Member Limit**: Total staff count
3. **Manager Limit**: Admin/manager accounts (Growth/Scale only)
4. **Monthly Report Submissions**: Starter plan only (default 50)

#### Quota Modification Interface
- **+/- Buttons**: Increment/decrement quota values
- **Custom Badge**: Indicates when quota differs from plan default
- **Reset Option**: Restore plan default limits
- **Reason Field**: Optional explanation for changes
- **Password Protected**: Requires master admin password

### Database Tracking
All quota modifications are logged in `quota_modifications` table:
- Organization ID
- Field name
- Old value → New value
- Reason
- Modified by (admin email)
- Timestamp

## 4. Implementation Files

### New Files Created
1. `/app/api/master/usage-metrics/route.ts` - Usage metrics API
2. `SUBSCRIPTION_QUOTA_MONITORING.md` - This documentation

### Modified Files
1. `/app/masterdashboard/page.tsx` - Added usage metrics display and subscription management
2. `/app/api/master/dashboard-data/route.ts` - Fixed LEFT JOIN for subscriptions
3. `/app/api/master/manage-subscription/route.ts` - Enhanced subscription actions

## 5. Database Schema

### Subscriptions Table
\`\`\`sql
- id (uuid, primary key)
- organization_id (uuid, foreign key)
- plan_name (text): 'starter', 'growth', 'scale'
- status (text): 'active', 'inactive', 'cancelled'
- is_trial (boolean)
- is_masteradmin_trial (boolean) -- NEW: Tracks complementary trials
- trial_ends_at (timestamp)
- current_period_start (timestamp)
- current_period_end (timestamp)
- stripe_subscription_id (text)
- stripe_customer_id (text)
- cancel_at_period_end (boolean)
\`\`\`

### Quota Modifications Table
\`\`\`sql
- id (uuid, primary key)
- organization_id (uuid)
- field_name (text): 'template_limit', 'team_limit', etc.
- old_value (integer)
- new_value (integer)
- reason (text)
- modified_by (text)
- created_at (timestamp)
\`\`\`

## 6. Security

### Authentication
- All master admin routes check for master-admin-session cookie
- Email verification: `masterAdminEmail === "arsami.uk@gmail.com"`
- Quota modifications require master admin password

### Authorization Levels
1. **Master Admin**: Full access to all features
2. **Support**: Read-only access (if implemented)

## 7. Future Enhancements

### Recommended Improvements
1. **Real Vercel API Integration**: Connect to Vercel Analytics API for precise bandwidth data
2. **Real Resend API Integration**: Fetch actual email usage from Resend dashboard
3. **Supabase Management API**: Use official Supabase API for exact database metrics
4. **Alert System**: Email notifications when approaching limits
5. **Historical Tracking**: Store usage metrics over time for trend analysis
6. **Export Reports**: Generate usage reports for billing purposes

## 8. Usage Instructions

### For Master Admins

#### To View Usage Metrics
1. Navigate to Master Dashboard
2. Go to "Overview" tab
3. View "Server Management" card
4. Click "Refresh" to update metrics

#### To Grant Complementary Trial
1. Go to "Subscriptions" tab
2. Find organization with Starter plan
3. Click "Start Growth Trial" or "Start Scale Trial"
4. Confirm action
5. Trial automatically granted for 30 days

#### To Cancel Subscription
1. Go to "Subscriptions" tab
2. Find active subscription
3. Click "Cancel" button
4. Confirm cancellation
5. Subscription remains active until billing period ends

#### To Modify Organization Quota
1. Go to "Organizations" tab
2. Click "Manage Quota" button for organization
3. Click +/- to adjust values
4. Enter reason (optional)
5. Enter master admin password
6. Click to apply changes

## 9. Troubleshooting

### Subscriptions Not Showing
- Check if LEFT JOIN is working: Look for console logs showing subscription counts
- Verify organization_id matches between subscriptions and organizations tables
- Check RLS policies on subscriptions table

### Usage Metrics Showing Zero
- Verify `/api/master/usage-metrics` endpoint is accessible
- Check authentication cookies are set correctly
- Review browser console for API errors

### Quota Modifications Not Applying
- Ensure master admin password is correct
- Check `quota_modifications` table for successful inserts
- Verify `/api/master/modify-quota` route is functioning

## 10. Testing Checklist

- [ ] All subscriptions display with organization names
- [ ] Billing dates show correctly
- [ ] Complementary trial can be granted without payment
- [ ] Trial badge shows "Complimentary" for master admin trials
- [ ] Subscription cancellation updates Stripe
- [ ] Downgrade immediately changes plan to Starter
- [ ] Usage metrics display all four services
- [ ] Progress bars show correct percentages
- [ ] Status indicators change colors based on thresholds
- [ ] Refresh button updates metrics with new timestamp
- [ ] Quota modification requires password
- [ ] Quota changes are logged in database
- [ ] Reset to defaults works correctly

---

**Last Updated**: December 2024
**Implemented By**: v0 AI Assistant
**Approved By**: Master Admin (arsami.uk@gmail.com)
