# Future Campaign Creation Guide

## No Code Changes Required!

The promotional campaign system is **fully dynamic**. You never need to modify code for new campaigns.

---

## How to Create a New Campaign

1. **Go to Master Dashboard**
   - Navigate to `mydaylogs.co.uk/masterdashboard`
   - Scroll to the **Campaign Manager** card in Superuser Tools

2. **Click "Create New Campaign"**

3. **Fill in Campaign Details:**
   - **Campaign Name**: Internal name (e.g., "Summer Sale 2025")
   - **Promo Code**: What users will see (e.g., "SUMMER50")
   - **Discount Type**: Percentage or Fixed Amount
   - **Discount Value**: Number only (e.g., 25 for 25%)
   - **Max Redemptions**: Total number of codes (e.g., 200)
   - **Requirement Type**: 
     - Feedback + Social Share (recommended for viral marketing)
     - Feedback Only
     - Share Only
     - Referral
     - First-time User

4. **Click "Create Campaign"**
   - System automatically creates Stripe coupon
   - Generates unique codes (e.g., SUMMER50-A1B2C3, SUMMER50-D4E5F6)
   - Stores everything in database

5. **Activate the Campaign**
   - Toggle the "Active" switch to ON
   - Campaign goes live immediately

---

## What Happens Automatically

✅ **Homepage Banner** - Updates to show new discount percentage  
✅ **Feedback Modal** - Displays new promo code after share  
✅ **Stripe Integration** - Codes work at checkout automatically  
✅ **Tracking** - All redemptions logged with user details  
✅ **Max Redemptions** - Campaign disappears when limit reached  

---

## Managing Active Campaigns

**View Submissions:**
- Click "View Submissions" to see users who submitted feedback

**View Redeemers:**
- Click "View Redeemers" to see actual checkout conversions

**Deactivate Campaign:**
- Toggle "Active" to OFF - codes stop appearing immediately

**Delete Campaign:**
- Click delete button - removes campaign and deactivates Stripe code

---

## Campaign Lifecycle

1. **Created** → Codes generated, Stripe coupon created
2. **Activated** → Visible on homepage banner and feedback modal
3. **Running** → Users submit feedback, share, get codes, redeem at checkout
4. **Maxed Out** → Automatically disappears when redemptions = max
5. **Deactivated** → Manually turned off or deleted

---

## Important Notes

- **Only one active campaign at a time** - System shows most recent
- **Codes are unique** - Each user gets different code (e.g., FIRST100-X1Y2Z3)
- **No email quota used** - Codes displayed instantly in modal, email not required
- **Anti-fraud built-in** - One code per email, rate limiting, IP tracking
- **Budget protected** - Can't exceed max redemptions set in campaign

---

## What Changes After 100th Redemption?

**Homepage Banner Text Changes:**
- **During Campaign**: "Share them via feedback and tell others about us to get a 20% discount code!"
- **After 100 Redemptions**: "Share them via feedback to help us improve!"

**Feedback Modal:**
- Promo code section disappears completely
- Only shows social share buttons (no unlock incentive)

---

## Examples

**Black Friday Campaign:**
\`\`\`
Campaign Name: Black Friday 2025
Promo Code: BLACKFRIDAY
Discount: 40% off
Max Redemptions: 500
Requirement: Feedback + Social Share
\`\`\`

**Referral Campaign:**
\`\`\`
Campaign Name: Refer a Friend
Promo Code: FRIEND20
Discount: 20% off
Max Redemptions: 1000
Requirement: Referral
\`\`\`

**Early Adopter:**
\`\`\`
Campaign Name: Early Adopters
Promo Code: EARLY30
Discount: 30% off
Max Redemptions: 50
Requirement: First-time User
\`\`\`

---

## Zero Code Changes

You will **never** need to:
- Edit homepage banner text
- Update feedback modal
- Change discount percentages in code
- Modify Stripe integration
- Update tracking logic

Everything is **database-driven and automatic**!
