-- Grant Base subscription to coolsami_uk@yahoo.com for 12 months (testing purposes)

DO $$
DECLARE
    test_org_id UUID;
    base_plan_id UUID;
    existing_subscription_id UUID;
BEGIN
    -- Find the organization ID for the test user
    SELECT organization_id INTO test_org_id
    FROM profiles 
    WHERE email = 'coolsami_uk@yahoo.com'
    LIMIT 1;
    
    -- Get the Base plan ID
    SELECT id INTO base_plan_id
    FROM subscription_plans 
    WHERE name = 'Base'
    LIMIT 1;
    
    -- Check if organization exists
    IF test_org_id IS NULL THEN
        RAISE NOTICE 'User coolsami_uk@yahoo.com not found or has no organization';
        RETURN;
    END IF;
    
    -- Check if Base plan exists
    IF base_plan_id IS NULL THEN
        RAISE NOTICE 'Base subscription plan not found';
        RETURN;
    END IF;
    
    -- Check if subscription already exists for this organization
    SELECT id INTO existing_subscription_id
    FROM subscriptions 
    WHERE organization_id = test_org_id;
    
    IF existing_subscription_id IS NOT NULL THEN
        -- Update existing subscription to Base plan for 12 months
        UPDATE subscriptions 
        SET 
            plan_id = base_plan_id,
            status = 'active',
            current_period_start = NOW(),
            current_period_end = NOW() + INTERVAL '12 months',
            cancel_at_period_end = false,
            updated_at = NOW()
        WHERE id = existing_subscription_id;
        
        RAISE NOTICE 'Updated existing subscription for organization % to Base plan for 12 months', test_org_id;
    ELSE
        -- Create new subscription for the organization
        INSERT INTO subscriptions (
            organization_id,
            plan_id,
            status,
            current_period_start,
            current_period_end,
            cancel_at_period_end
        ) VALUES (
            test_org_id,
            base_plan_id,
            'active',
            NOW(),
            NOW() + INTERVAL '12 months',
            false
        );
        
        RAISE NOTICE 'Created new Base subscription for organization % for 12 months', test_org_id;
    END IF;
    
    -- Update the organization to link to the subscription
    UPDATE organizations 
    SET subscription_id = (
        SELECT id FROM subscriptions WHERE organization_id = test_org_id LIMIT 1
    )
    WHERE id = test_org_id;
    
    RAISE NOTICE 'Successfully granted Base subscription to coolsami_uk@yahoo.com for 12 months';
    
END $$;
