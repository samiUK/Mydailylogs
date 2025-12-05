# Master Dashboard - Modular Structure

This directory contains the modularized Master Admin Dashboard.

## File Structure

- **page.tsx** - Entry point (barrel export)
- **MasterDashboardPage.tsx** - Main dashboard component
- **types.tsx** - TypeScript interfaces and types
- **useAuthAndData.tsx** - Custom hook for authentication and data fetching
- **Notification.tsx** - Toast notification component
- **ConfirmDialog.tsx** - Confirmation dialog component
- **UserList.tsx** - User management tab
- **OrganizationList.tsx** - Organization management tab
- **SubscriptionList.tsx** - Subscription management tab
- **PaymentList.tsx** - Payment management tab
- **FeedbackList.tsx** - Feedback management tab
- **FeedbackResponseModal.tsx** - Modal for responding to feedback
- **ReportDirectorySection.tsx** - Report directory placeholder
- **page-original-backup.tsx** - Backup of original monolithic file (5063 lines)

## Features Preserved

All original features from the 5063-line monolithic file have been preserved:
- Authentication and authorization
- Organization management (archive/delete)
- User management and impersonation
- Subscription management
- Payment and refund handling
- Feedback management and responses
- Report directory
- Real-time stats and metrics
- Search and filtering across all tabs

## Resource Optimization

The modular structure maintains the resource-optimized data fetching:
- Single centralized API call (`/api/master/dashboard-data`)
- Cached usage metrics (1 hour)
- Lazy-loaded tabs
- Efficient pagination

## Restoration

If any issues occur, restore the original version:
\`\`\`bash
cp app/masterdashboard/page-original-backup.tsx app/masterdashboard/page.tsx
