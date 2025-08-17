-- Migration: Schema Reconciliation - Fix Prisma/Supabase Inconsistencies
-- Date: 2025-08-17
-- Purpose: Align database schema between Prisma and Supabase migrations

-- ============================================
-- PART 1: Fix Subscription Table
-- ============================================

-- Step 1: Create ENUM types if they don't exist
DO $$ 
BEGIN
  -- Create subscription_plan enum if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_plan') THEN
    CREATE TYPE subscription_plan AS ENUM ('free', 'starter', 'pro', 'enterprise');
  END IF;
  
  -- Create subscription_status enum if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status') THEN
    CREATE TYPE subscription_status AS ENUM ('incomplete', 'active', 'canceled', 'past_due', 'trialing');
  END IF;
END $$;

-- Step 2: Add missing columns to subscriptions table
ALTER TABLE subscriptions 
  ADD COLUMN IF NOT EXISTS plan subscription_plan DEFAULT 'free';

-- Step 3: Migrate existing status data to ENUM (if not already done)
DO $$
BEGIN
  -- Check if status column is still varchar
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'subscriptions' 
    AND column_name = 'status' 
    AND data_type = 'character varying'
  ) THEN
    -- Create temporary column
    ALTER TABLE subscriptions ADD COLUMN status_new subscription_status;
    
    -- Migrate data with proper mapping
    UPDATE subscriptions SET status_new = 
      CASE 
        WHEN status = 'active' THEN 'active'::subscription_status
        WHEN status = 'canceled' THEN 'canceled'::subscription_status
        WHEN status = 'past_due' THEN 'past_due'::subscription_status
        WHEN status = 'trialing' THEN 'trialing'::subscription_status
        ELSE 'incomplete'::subscription_status
      END;
    
    -- Drop old column and rename new one
    ALTER TABLE subscriptions DROP COLUMN status;
    ALTER TABLE subscriptions RENAME COLUMN status_new TO status;
    
    -- Set default
    ALTER TABLE subscriptions ALTER COLUMN status SET DEFAULT 'incomplete'::subscription_status;
  END IF;
END $$;

-- Step 4: Ensure all required columns exist with proper types
ALTER TABLE subscriptions
  ALTER COLUMN organization_id DROP NOT NULL; -- Make nullable for user subscriptions

-- Step 5: Update constraints to match Prisma schema
-- Drop old constraint if exists
ALTER TABLE subscriptions 
  DROP CONSTRAINT IF EXISTS check_subscription_ownership;

-- Add new constraint that matches the business logic
ALTER TABLE subscriptions
  ADD CONSTRAINT check_subscription_ownership CHECK (
    (subscription_type = 'user' AND user_id IS NOT NULL) OR
    (subscription_type = 'organization' AND organization_id IS NOT NULL)
  );

-- ============================================
-- PART 2: Add Missing Tables from Migrations
-- ============================================

-- These tables exist in migrations but not in Prisma schema
-- Adding comments to track them for Prisma introspection

-- Company domains table
COMMENT ON TABLE company_domains IS 'Track verified domains for companies - needs Prisma model';

-- Company notifications table  
COMMENT ON TABLE company_notifications IS 'Company-wide notification settings - needs Prisma model';

-- Data exports table
COMMENT ON TABLE data_exports IS 'Track user data export requests - needs Prisma model';

-- Notification preferences table
COMMENT ON TABLE notification_preferences IS 'User notification preferences - needs Prisma model';

-- Access rules table
COMMENT ON TABLE access_rules IS 'Dynamic access control rules - needs Prisma model';

-- CSRF tokens table
COMMENT ON TABLE csrf_tokens IS 'CSRF token storage - needs Prisma model';

-- Role hierarchy table
COMMENT ON TABLE role_hierarchy IS 'Role inheritance structure - needs Prisma model';

-- Resource relationships table
COMMENT ON TABLE resource_relationships IS 'Resource ownership and relationships - needs Prisma model';

-- ============================================
-- PART 3: Add Missing Indexes
-- ============================================

-- Ensure all performance-critical indexes exist
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_customer_id ON subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_subscription_type ON subscriptions(subscription_type);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan ON subscriptions(plan);

-- Add composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status 
  ON subscriptions(user_id, status) 
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_subscriptions_org_status 
  ON subscriptions(organization_id, status) 
  WHERE organization_id IS NOT NULL;

-- ============================================
-- PART 4: Add Missing Team Members Index
-- ============================================

-- This was mentioned in Epic 0 as missing
CREATE INDEX IF NOT EXISTS idx_team_members_user_id 
  ON team_members(user_id);

-- ============================================
-- PART 5: Fix Organizations Table
-- ============================================

-- Ensure organizations table exists (referenced by subscriptions)
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar NOT NULL,
  slug varchar UNIQUE,
  owner_id uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create organization_members if not exists
CREATE TABLE IF NOT EXISTS organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role varchar CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- Add indexes for organization tables
CREATE INDEX IF NOT EXISTS idx_organizations_owner_id ON organizations(owner_id);
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON organization_members(organization_id);

-- ============================================
-- PART 6: Add Team Members Table (if missing)
-- ============================================

-- Create team_members table if it doesn't exist
CREATE TABLE IF NOT EXISTS team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role varchar CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  invited_by uuid REFERENCES auth.users(id),
  invited_at timestamp with time zone,
  joined_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Add index mentioned in Epic 0
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);

-- ============================================
-- PART 7: Update Timestamps Triggers
-- ============================================

-- Ensure all tables have updated_at triggers
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for tables that might be missing them
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN 
    SELECT table_name 
    FROM information_schema.columns 
    WHERE column_name = 'updated_at' 
    AND table_schema = 'public'
  LOOP
    EXECUTE format('
      CREATE TRIGGER set_%I_timestamp
      BEFORE UPDATE ON %I
      FOR EACH ROW
      EXECUTE FUNCTION trigger_set_timestamp()', t, t);
  EXCEPTION 
    WHEN duplicate_object THEN
      NULL; -- Trigger already exists, ignore
  END LOOP;
END $$;

-- ============================================
-- PART 8: Add Comments for Documentation
-- ============================================

COMMENT ON TABLE subscriptions IS 'Hybrid subscription model supporting both private users (user_id) and corporate accounts (organization_id)';
COMMENT ON COLUMN subscriptions.subscription_type IS 'Type of subscription: "user" for private accounts, "organization" for corporate accounts';
COMMENT ON COLUMN subscriptions.plan IS 'Subscription plan tier (free, starter, pro, enterprise)';
COMMENT ON COLUMN subscriptions.status IS 'Current subscription status';
COMMENT ON COLUMN subscriptions.customer_id IS 'Stripe customer ID for billing';
COMMENT ON COLUMN subscriptions.subscription_id IS 'Internal subscription identifier';
COMMENT ON COLUMN subscriptions.stripe_subscription_id IS 'Stripe subscription ID for API integration';

-- ============================================
-- VERIFICATION QUERIES (Run manually to verify)
-- ============================================

/*
-- Check subscription table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'subscriptions'
ORDER BY ordinal_position;

-- Check ENUM types
SELECT 
  t.typname as enum_name,
  array_agg(e.enumlabel ORDER BY e.enumsortorder) as enum_values
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname IN ('subscription_plan', 'subscription_status')
GROUP BY t.typname;

-- Check indexes
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'subscriptions';

-- Check constraints
SELECT 
  conname,
  pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'subscriptions'::regclass;
*/