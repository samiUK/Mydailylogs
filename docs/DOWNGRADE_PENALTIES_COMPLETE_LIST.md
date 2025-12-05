# Complete Downgrade Penalties List

This document lists **EVERY** feature and data that is removed, limited, or restricted when a customer downgrades their subscription.

## Summary of Plans

| Feature | Starter (Free) | Growth | Scale |
|---------|---------------|--------|-------|
| **Templates** | 3 | 10 | 20 |
| **Team Members** | 5 | 25 | 75 |
| **Managers (Admin-level)** | 1 | 3 | 7 |
| **Report Submissions** | 50/month | Unlimited | Unlimited |
| **Custom Branding** | ❌ | ✅ | ✅ |
| **Logo Upload** | ❌ | ✅ | ✅ |
| **Brand Colors** | ❌ | ✅ | ✅ |
| **White-Label Login** | ❌ | ✅ | ✅ |
| **Task Automation** | ❌ | ✅ | ✅ |
| **Contractor Link Share** | ❌ | ✅ | ✅ |
| **Photo Uploads** | ❌ | ✅ | ✅ |
| **Email Notifications** | ❌ | ✅ | ✅ |
| **Priority Support** | ❌ | ✅ | ✅ |
| **Report Retention** | 30 days | 90 days | 90 days |
| **Report Deletion Recovery** | ❌ | ❌ | ✅ |

---

## Downgrade to Starter Plan (from Growth or Scale)

### 1. **Custom Branding - IMMEDIATE REMOVAL**
- ✅ Logo URL → `NULL` (reverted to MyDayLogs logo)
- ✅ Primary Color → `NULL` (reverted to MyDayLogs emerald green)
- ✅ Secondary Color → `NULL` (reverted to default)
- ✅ White-label login experience removed

### 2. **Templates - ARCHIVED**
- ✅ Keep: First 3 templates (oldest by created_at)
- ✅ Archive: All templates beyond 3 (set `is_active = false`)
- Growth: Lose 7 templates (10 → 3)
- Scale: Lose 17 templates (20 → 3)

### 3. **Team Members - DELETED**
- ✅ Keep: First 5 team members (oldest by created_at)
- ✅ Delete: All members beyond 5
- Growth: Lose 20 members (25 → 5)
- Scale: Lose 70 members (75 → 5)

### 4. **Managers/Admins - DELETED**
- ✅ Keep: 1 admin account only (first by created_at)
- ✅ Delete: All managers and additional admins
- Growth: Lose 2 managers (3 → 1)
- Scale: Lose 6 managers (7 → 1)

### 5. **Reports - DELETED**
- ✅ Keep: Last 50 reports (most recent by submitted_at)
- ✅ Delete: All reports beyond 50
- Future submissions limited to 50/month (previously unlimited)

### 6. **Feature Access - DISABLED**
- ✅ Task Automation disabled
- ✅ Contractor link sharing disabled
- ✅ Photo uploads disabled
- ✅ Email notifications disabled
- ✅ Report retention reduced to 30 days (from 90 days)
- ✅ Priority support removed

### 7. **Dashboard Experience**
- ✅ Branded background colors removed (reverted to default gray)
- ✅ Organization name on login removed (shows MyDayLogs)
- ✅ Custom color accents removed throughout UI

---

## Downgrade to Growth Plan (from Scale only)

### 1. **Templates - ARCHIVED**
- ✅ Keep: First 10 templates
- ✅ Archive: All templates beyond 10
- Lose: 10 templates (20 → 10)

### 2. **Team Members - DELETED**
- ✅ Keep: First 25 team members
- ✅ Delete: All members beyond 25
- Lose: 50 members (75 → 25)

### 3. **Managers/Admins - DELETED**
- ✅ Keep: First 3 managers
- ✅ Delete: All managers beyond 3
- Lose: 4 managers (7 → 3)

### 4. **Feature Access - DISABLED**
- ✅ Report deletion recovery disabled
- Custom branding RETAINED (Growth has this)
- Task automation RETAINED
- Unlimited reports RETAINED

---

## Technical Implementation

All downgrade logic is handled in `lib/subscription-limits.ts` in the `handleSubscriptionDowngrade()` function:

\`\`\`typescript
// Called when:
1. Subscription cancelled (webhook: customer.subscription.deleted)
2. Subscription downgraded (webhook: customer.subscription.updated)
3. Trial expires without payment
4. Manual cancellation via cancel subscription API
\`\`\`

### Execution Points:
1. `/app/api/webhooks/stripe/route.ts` - Stripe webhooks
2. `/app/api/subscriptions/cancel/route.ts` - Manual cancellation
3. `/app/api/cron/daily-tasks/route.ts` - Scheduled checks
4. `/app/api/cron/midnight-operations/route.ts` - Trial expiry checks

---

## User-Facing Warnings

Users are warned about ALL these penalties in:
1. Cancellation dialog (`components/subscription-cancel-dialog.tsx`)
2. Trial cancellation email
3. Subscription end warning banners
4. Settings page (when attempting to use premium features)

---

## What Users Keep

Even after downgrading to Starter:
- ✅ First 3 templates (archived ones can be reactivated if within limit)
- ✅ First 5 team members
- ✅ 1 admin account
- ✅ Last 50 reports
- ✅ All historical data (just restricted access)
- ✅ Account and organization data
