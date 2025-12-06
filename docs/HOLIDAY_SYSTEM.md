# Holiday-Aware Task Management System

## Overview

MyDayLogs automatically respects organization holidays, weekends, and business hours when assigning tasks and sending reminders. This ensures staff are not assigned work on non-business days.

## Features

### 1. Automatic Due Date Adjustment

When admins assign tasks, the system automatically adjusts due dates that fall on:
- **Holidays** - Organization-specific holidays set in Settings
- **Weekends** - Saturday and Sunday
- **Business Closed Days** - Days when business hours are disabled

The system finds the **next available business day** and adjusts the due date accordingly.

**Example:**
- Admin assigns task with due date: Friday, December 25 (Christmas - Holiday)
- System adjusts to: Monday, December 28 (next business day)
- Admin receives notification: "Due date adjusted from Dec 25 to Dec 28 - Reason: Christmas"

### 2. Holiday-Aware Automated Task Creation

The daily cron job (`/api/cron/daily-tasks`) checks before creating automated recurring tasks:
- ✅ Skips task creation if today is a holiday
- ✅ Skips if business is closed today
- ✅ Skips if staff member is unavailable (sick leave, vacation)

**Logging:**
\`\`\`
[v0] Skipping template 123 - today is a holiday
[v0] Skipping template 456 - business closed on sunday
\`\`\`

### 3. Holiday-Aware Reminders

The reminder cron job (`/api/cron/send-task-reminders`) now:
- ✅ Skips sending reminders for tasks due on holidays
- ✅ Skips reminders for tasks due on weekends
- ✅ Skips reminders for tasks due on business closed days

**Rationale:** No point reminding staff about tasks due when the business is closed.

## API Functions

### `isHoliday(supabase, organizationId, date)`
Checks if a specific date is a holiday for an organization.

**Returns:**
\`\`\`typescript
{ isHoliday: boolean, holidayName?: string }
\`\`\`

### `isBusinessDay(supabase, organizationId, date)`
Checks if a date is a business day (not weekend, not holiday, business open).

**Returns:** `boolean`

### `getNextBusinessDay(supabase, organizationId, startDate, maxDaysToCheck)`
Finds the next available business day after the given date.

**Returns:** `string | null` (date in YYYY-MM-DD format)

### `adjustToBusinessDay(supabase, organizationId, date)`
Adjusts a date to the next business day if needed.

**Returns:**
\`\`\`typescript
{
  adjustedDate: string,
  wasAdjusted: boolean,
  reason?: string  // "Holiday", "Weekend", "Business closed"
}
\`\`\`

## Configuration

### Setting Up Holidays

1. Navigate to **Organization Settings**
2. Scroll to **Business Hours & Holidays**
3. Select holiday dates from the calendar
4. Holidays are automatically respected system-wide

### Business Hours

- Set in **Organization Settings** → **Business Hours**
- Disable specific days (e.g., Sundays) to mark them as non-business days
- Automated tasks and adjusted due dates respect these settings

## Impact on Downgrade

When downgrading to Starter plan:
- ✅ Holidays are preserved (can still view in settings)
- ❌ Task automation is disabled (no automated recurring tasks)
- ✅ Manual assignment due date adjustment still works
- ✅ Holiday checking in reminders still works

## Benefits

1. **No Staff Confusion** - Staff don't receive tasks due on holidays
2. **Realistic Deadlines** - Automatically adjusted to next business day
3. **Compliance** - Respects organization's operating calendar
4. **Professional** - Shows consideration for work-life balance
5. **Transparent** - Admins are notified when dates are adjusted
