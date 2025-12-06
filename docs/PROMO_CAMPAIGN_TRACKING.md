# Promo Campaign Tracking System

## Overview

Comprehensive tracking system to monitor the full user journey from feedback submission through social sharing to promo code redemption.

## Tracking Tables

### 1. `feedback` (Existing)
Tracks initial feedback submissions
- `id`, `user_id`, `email`, `message`, `created_at`

### 2. `social_shares` (New)
Tracks when users click social share buttons
- `id`, `user_id`, `user_email`, `feedback_id`, `share_platform`, `promo_code`, `campaign_id`, `shared_at`

### 3. `promo_code_redemptions` (Existing)
Tracks when promo codes are redeemed at checkout
- `id`, `user_email`, `promo_code`, `organization_id`, `redeemed_at`

## Tracking Flow

\`\`\`
User Journey:
1. Submit Feedback → Insert into `feedback` table
2. Click Share Button → Insert into `social_shares` table
3. Use Promo Code → Insert into `promo_code_redemptions` table
\`\`\`

## Analytics Available

### Campaign Analytics API
`GET /api/promo-campaign/analytics?campaignId=<uuid>`

Returns:
- **Metrics**: Total feedback, total shares, total redemptions, shares by platform
- **Conversion Rates**: 
  - Feedback → Share conversion
  - Share → Redemption conversion
  - Overall conversion (Feedback → Redemption)
- **Funnel Visualization**: Step-by-step user journey with percentages

### Example Response
\`\`\`json
{
  "campaign": {
    "id": "uuid",
    "name": "First 100 Users",
    "promo_code": "FIRST100",
    "discount_value": 20
  },
  "metrics": {
    "totalFeedback": 150,
    "totalShares": 89,
    "totalRedemptions": 45,
    "sharesByPlatform": {
      "facebook": 30,
      "twitter": 35,
      "linkedin": 24
    }
  },
  "conversionRates": {
    "feedbackToShare": 59.3,
    "shareToRedemption": 50.6,
    "overallConversion": 30.0
  },
  "funnel": [
    { "stage": "Feedback Submitted", "count": 150, "percentage": 100 },
    { "stage": "Social Share Clicked", "count": 89, "percentage": 59.3 },
    { "stage": "Promo Code Redeemed", "count": 45, "percentage": 30.0 }
  ]
}
\`\`\`

## Anti-Cheat Protections

Even with universal codes, we track:
1. **Who submitted feedback** - Required before showing promo code
2. **Who actually clicked share** - Logged in `social_shares` table
3. **Who redeemed the code** - Logged in `promo_code_redemptions` table

This allows you to:
- Identify users who share but don't redeem (good viral marketing)
- Identify users who redeem without sharing (potential abuse)
- Calculate true ROI of the campaign
- See which social platform performs best

## Benefits

- **Track viral spread**: See how many people share vs. redeem
- **Platform insights**: Know which social platform works best
- **Fraud detection**: Identify redemptions without feedback/sharing
- **ROI calculation**: Measure campaign effectiveness with hard data
- **Future optimization**: Use data to improve future campaigns
