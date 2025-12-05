# MyDayLogs Branding System

## Overview
MyDayLogs implements a comprehensive white-label branding system that allows organizations to customize their experience with their own logo, colors, and identity throughout the platform.

## Features Implemented

### 1. Holiday Management
- **Location**: Organization Settings page (`/admin/settings`)
- **Functionality**: Admins can add, view, and delete organization holidays
- **Database**: Holidays are stored in the `holidays` table with organization_id
- **Debugging**: Added comprehensive console logging to track holiday save operations
- **Status**: ✅ Fully functional with debug logging

### 2. Brand Color Application
- **CSS Variables**: Brand colors are set as CSS custom properties:
  - `--brand-primary`: Primary brand color from organization settings
  - `--brand-secondary`: Secondary brand color
  - `--brand-primary-rgb`: RGB values for creating opacity variants
  - `--brand-accent-bg`: Light 5% opacity background tint
  - `--brand-accent-border`: 20% opacity border color

- **Application Areas**:
  - **Admin Dashboard**: Light branded background (`var(--brand-accent-bg)`)
  - **Staff Dashboard**: Light branded background (`var(--brand-accent-bg)`)
  - **Buttons**: Primary color for call-to-action buttons
  - **Links**: Accent colors for interactive elements
  - **Borders**: Subtle brand-colored borders where appropriate

### 3. Logo Caching on Login
- **Location**: `/auth/login` page
- **Functionality**: 
  - When a user enters their email, the system fetches their organization's logo
  - Logo is cached in localStorage for future visits
  - Organization name is also cached and displayed
  - Provides a white-label feel before authentication
- **Caching Strategy**:
  - Key: `mydaylogs_org_logo` for logo URL
  - Key: `mydaylogs_org_name` for organization name
  - Persists across sessions for returning users
- **Fallback**: Shows MyDayLogs logo if no org logo is cached
- **Status**: ✅ Fully implemented for both admin and staff login

## Technical Implementation

### BrandingProvider Component
- Context provider that manages branding state across the application
- Automatically fetches organization branding based on authenticated user
- Sets CSS variables dynamically when branding data changes
- Supports impersonation mode for master admins

### Color Extraction
- Automatically extracts primary color from uploaded logos
- Uses canvas API to analyze dominant colors
- Lightens extracted colors by 20% for better UI compatibility
- Falls back to MyDayLogs emerald green (#059669) if extraction fails

### Database Schema
Organizations table includes:
- `logo_url`: URL to organization's logo in Vercel Blob storage
- `primary_color`: Hex color code for primary brand color
- `secondary_color`: Hex color code for secondary brand color
- `organization_name`: Display name
- `address`: Organization address for reports

## Usage for Customers

### Setting Up Branding
1. Navigate to Organization Settings (`/admin/settings`)
2. Upload your logo (square format recommended, max 5MB)
3. Brand color will auto-extract from logo, or adjust manually
4. Enter organization name and address
5. Click "Save Settings"

### Holiday Management
1. Go to Organization Settings
2. Scroll to "Holiday Management" section
3. Select a date from the calendar
4. Optionally enter a holiday name (defaults to date)
5. Click "Add Holiday"
6. Holidays are marked on calendar and excluded from scheduling

### White-Label Experience
- Once configured, all users see the organization's logo and colors
- Login page shows cached logo for returning users
- Staff see branded dashboard backgrounds
- Reports include organization logo and branding

## Implementation Status

| Feature | Status | Notes |
|---------|--------|-------|
| Holiday Saving | ✅ | Debug logging added |
| Brand Color Backgrounds | ✅ | Light 5% tint applied to dashboards |
| Logo on Login | ✅ | Cached after first login |
| Color Auto-Extraction | ✅ | From uploaded logos |
| Report Branding | ✅ | Logo and org name on PDFs |
| Staff Portal Branding | ✅ | Full white-label experience |

## Future Enhancements
- Custom fonts per organization
- More granular color customization (buttons, links, headers)
- Preview mode for branding changes
- Branding presets/templates
