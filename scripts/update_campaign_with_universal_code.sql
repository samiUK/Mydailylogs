-- Update the existing campaign to use a universal promo code
UPDATE promo_campaigns
SET promo_code_template = 'SOCIAL20',
    description = 'First 100 users to share feedback and post on social media get 20% off their first paid month using code SOCIAL20'
WHERE campaign_id = 'feedback-social-20';
