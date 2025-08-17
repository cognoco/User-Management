-- Migration: Reconcile Subscription Ownership for Private and Corporate Users
-- Date: 2025-08-16
-- Purpose: Support both user-based (private) and organization-based (corporate) subscriptions

-- Step 1: Modify subscriptions table to support both models
ALTER TABLE subscriptions 
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS subscription_type varchar(20) DEFAULT 'user';

-- Add check constraint to ensure proper ownership based on type
ALTER TABLE subscriptions
  ADD CONSTRAINT check_subscription_ownership CHECK (
    (subscription_type = 'user' AND user_id IS NOT NULL AND organization_id IS NULL) OR
    (subscription_type = 'organization' AND organization_id IS NOT NULL AND user_id IS NULL)
  );

-- Step 2: Add foreign key constraints
ALTER TABLE subscriptions
  ADD CONSTRAINT fk_user_id FOREIGN KEY (user_id) 
    REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_organization_id FOREIGN KEY (organization_id) 
    REFERENCES organizations(id) ON DELETE CASCADE;

-- Step 3: Add missing Stripe-related fields (from Prisma schema)
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS customer_id varchar UNIQUE,
  ADD COLUMN IF NOT EXISTS subscription_id varchar UNIQUE;

-- Step 4: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_type ON subscriptions(subscription_type);
CREATE INDEX IF NOT EXISTS idx_subscriptions_customer_id ON subscriptions(customer_id);

-- Step 5: Create a view to simplify subscription queries
CREATE OR REPLACE VIEW active_subscriptions AS
SELECT 
  s.*,
  CASE 
    WHEN s.subscription_type = 'user' THEN u.email
    WHEN s.subscription_type = 'organization' THEN o.name
  END as subscriber_name,
  CASE 
    WHEN s.subscription_type = 'user' THEN u.raw_user_meta_data->>'userType'
    ELSE 'CORPORATE'
  END as user_type
FROM subscriptions s
LEFT JOIN auth.users u ON s.user_id = u.id
LEFT JOIN organizations o ON s.organization_id = o.id
WHERE s.status = 'active';

-- Step 6: Function to get subscription for a user (handles both private and corporate)
CREATE OR REPLACE FUNCTION get_user_subscription(p_user_id uuid)
RETURNS TABLE (
  subscription_id uuid,
  plan_id uuid,
  status varchar,
  subscription_type varchar,
  owner_id uuid
) AS $$
BEGIN
  RETURN QUERY
  -- First check for direct user subscription
  SELECT 
    s.id as subscription_id,
    s.plan_id,
    s.status,
    s.subscription_type,
    COALESCE(s.user_id, s.organization_id) as owner_id
  FROM subscriptions s
  WHERE s.user_id = p_user_id AND s.status = 'active'
  
  UNION
  
  -- Then check for organization subscription
  SELECT 
    s.id as subscription_id,
    s.plan_id,
    s.status,
    s.subscription_type,
    s.organization_id as owner_id
  FROM subscriptions s
  INNER JOIN organization_members om ON s.organization_id = om.organization_id
  WHERE om.user_id = p_user_id AND s.status = 'active'
  
  LIMIT 1; -- User should only have one active subscription (direct or through org)
END;
$$ LANGUAGE plpgsql;

-- Step 7: Add RLS policies for subscription access
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy for users to see their own subscriptions
CREATE POLICY "Users can view own subscriptions" ON subscriptions
  FOR SELECT
  USING (
    auth.uid() = user_id OR
    auth.uid() IN (
      SELECT user_id FROM organization_members 
      WHERE organization_id = subscriptions.organization_id
    )
  );

-- Policy for users to update their own private subscriptions
CREATE POLICY "Users can update own private subscriptions" ON subscriptions
  FOR UPDATE
  USING (
    subscription_type = 'user' AND auth.uid() = user_id
  );

-- Policy for org admins to update organization subscriptions
CREATE POLICY "Org admins can update org subscriptions" ON subscriptions
  FOR UPDATE
  USING (
    subscription_type = 'organization' AND
    auth.uid() IN (
      SELECT user_id FROM organization_members 
      WHERE organization_id = subscriptions.organization_id 
      AND role IN ('owner', 'admin')
    )
  );

-- Step 8: Migration helpers for existing data
-- Update existing subscriptions based on user type (if needed)
-- This assumes existing data needs to be categorized
DO $$
BEGIN
  -- Mark subscriptions with user_id as 'user' type
  UPDATE subscriptions 
  SET subscription_type = 'user'
  WHERE user_id IS NOT NULL AND subscription_type IS NULL;
  
  -- Mark subscriptions with only organization_id as 'organization' type
  UPDATE subscriptions 
  SET subscription_type = 'organization'
  WHERE organization_id IS NOT NULL AND user_id IS NULL AND subscription_type IS NULL;
END $$;

-- Add comment for documentation
COMMENT ON TABLE subscriptions IS 'Hybrid subscription model supporting both private users (user_id) and corporate accounts (organization_id)';
COMMENT ON COLUMN subscriptions.subscription_type IS 'Type of subscription: "user" for private accounts, "organization" for corporate accounts';