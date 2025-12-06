# Promotional Campaign: First 100 Users Get 20% Off

## Campaign Overview

The first 100 users who provide feedback and share MyDayLogs on social media will receive a unique 20% discount code sent via email through Resend.

## How It Works

### User Journey

1. **Submit Feedback**: User fills out feedback form with their experience
2. **Share on Social Media**: User shares about MyDayLogs on Twitter, LinkedIn, Facebook, or Instagram
3. **Provide Proof**: User submits link to their social media post (optional but encouraged)
4. **Receive Code**: Unique promo code is instantly generated and emailed to the user
5. **Use at Checkout**: User enters code during checkout for 20% off first billing period

### Technical Implementation

#### Database Table: `promotional_campaign_submissions`

Tracks all campaign submissions with the following fields:
- User email and name
- Feedback message
- Social media platform and proof URL
- Generated promo code (unique)
- Submission rank (1-100)
- Email sent status and redemption status
- Timestamps and tracking data

#### API Endpoints

1. **POST /api/promo-campaign/submit**
   - Submit feedback with social proof
   - Validates campaign is still active (under 100 submissions)
   - Generates unique promo code
   - Sends email with code via Resend
   - Returns promo code and submission rank

2. **GET /api/promo-campaign/submit**
   - Check if campaign is still active
   - Returns number of spots remaining

3. **GET /api/promo-campaign/stats** (Master Admin Only)
   - View campaign statistics
   - See all submissions and redemption rates

#### Anti-Fraud Protection

Built-in protections:
- One submission per email address (database constraint)
- IP address and user agent logging for abuse detection
- Limited to first 100 submissions only
- Promo codes work with existing anti-fraud system:
  - One code per customer (Stripe + database tracking)
  - First billing period only
  - Email verification required before checkout
  - Rate limiting on checkout attempts

#### Email Template

Professional email includes:
- Celebration emoji and congratulatory message
- Large, prominent promo code display
- Submission rank ("You're user #XX of 100")
- Clear instructions on how to redeem
- Important notes about one-time use and expiration
- Call-to-action button to sign up

### Integration with Existing Systems

The campaign integrates with:
- **Stripe Checkout**: Promo codes work at checkout (allow_promotion_codes: true)
- **Anti-Fraud System**: All existing fraud protections apply
- **Resend Email**: Professional branded emails sent automatically
- **Database Tracking**: Full audit trail of submissions and redemptions

### Campaign Management

**For Master Admins:**
- View campaign dashboard at `/api/promo-campaign/stats`
- See submission count, codes sent, and redemption rate
- Access full list of participants and their feedback
- Monitor for abuse or fraud patterns

**Campaign Limits:**
- Maximum 100 codes
- 20% discount
- First billing period only
- One code per email address
- Expires when redeemed

### Monitoring Campaign Success

Track these metrics:
- Total submissions (target: 100)
- Codes successfully sent via email
- Redemption rate (codes used at checkout)
- Social media reach (if users provide post links)
- Feedback quality and insights

## Setup Instructions

1. Run the SQL migration script to create the database table:
   \`\`\`sql
   scripts/create_promotional_campaign_table.sql
   \`\`\`

2. Ensure Resend API key is configured in environment variables

3. Test the submission flow:
   - Submit test feedback
   - Verify email delivery
   - Test promo code at checkout

4. Launch campaign with marketing materials

## Marketing Copy Suggestions

**Call to Action:**
"Be one of the first 100! Share your feedback and post about MyDayLogs on social media to get 20% off your first month or year."

**Benefits:**
- Exclusive early supporter discount
- Limited to first 100 users only
- Instant delivery via email
- Works on all plans (Growth & Scale)
- Valid for monthly or yearly billing

## Future Enhancements

Potential improvements:
- Campaign landing page with live counter
- Social media post templates for easy sharing
- Referral tracking for viral growth
- Tiered rewards (first 10 get 30%, next 40 get 25%, final 50 get 20%)
- Leaderboard of top sharers
