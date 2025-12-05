# User Roles System Documentation

## Role Hierarchy

MyDayLogs has three distinct user roles:

### 1. Admin (Organization Owner)
- **Access Level**: Full system access
- **View**: Admin dashboard (`/admin/*`)
- **Permissions**: 
  - Manage all users (create, edit, delete)
  - Manage templates and reports
  - Manage subscriptions and billing
  - Configure organization settings
  - View analytics and reports

### 2. Manager
- **Access Level**: Same as Admin
- **View**: Admin dashboard (`/admin/*`) - identical to admin view
- **Permissions**: Same as admin level access
- **Creation**: 
  - Created by admins
  - Admins currently set passwords for managers (needs improvement in future)
- **Important Notes**:
  - Managers have the same view and permissions as admins
  - Managers count toward the subscription's admin/manager account limit
  - Growth plan: 3 managers (including admins)
  - Scale plan: 7 managers (including admins)

### 3. Staff
- **Access Level**: Limited, task-focused
- **View**: Staff dashboard (`/staff/*`) - completely different from admin/manager view
- **Permissions**:
  - View assigned tasks and templates
  - Submit reports
  - View their own history
  - Cannot manage other users or organization settings
- **Creation**: Created by admins or managers

## Important Workflow Notes

### Promoting Staff to Manager
**⚠️ Not Recommended**: The system does not support directly promoting a staff member to a manager role.

**Correct Process**:
1. Admin should **remove the user as staff** first
2. Then **add them as a new manager** account
3. This ensures proper role initialization and permissions

**Why?**: Staff and managers have completely different views and permission structures. Direct promotion can cause data inconsistencies and permission issues.

## Current Limitations & Future Improvements

### Password Management
- **Current**: Admins manually set passwords for managers when creating their accounts
- **Future**: Should implement email-based invitation system where managers set their own passwords

### Role Transition
- **Current**: No direct staff-to-manager promotion
- **Future**: Could implement a proper role transition system with data migration

## Subscription Limits

| Plan | Managers (Admin-level) | Staff (Team Members) |
|------|------------------------|----------------------|
| Starter | 1 (admin only) | 5 |
| Growth | 3 | 25 |
| Scale | 7 | 100 |

**Note**: Managers count includes both the original admin and any additional manager accounts created.
