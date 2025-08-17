# Database Schema Reconciliation Report
**Date:** 2025-08-16
**Status:** Analysis Complete

## Schema Differences Found

### 1. Subscriptions Table

#### Supabase Migration (20240101000000_create_subscription_tables.sql)
```sql
CREATE TABLE subscriptions (
    id uuid PRIMARY KEY,
    organization_id uuid NOT NULL,  -- Primary key is organization_id
    plan_id uuid REFERENCES subscription_plans(id),
    status varchar CHECK (status IN ('active', 'canceled', 'past_due', 'trialing')),
    stripe_subscription_id varchar UNIQUE,
    -- ... other fields
);
```

#### Prisma Schema (schema.prisma)
```prisma
model subscriptions {
  id uuid @id,
  user_id String @unique,           -- Primary key is user_id (CONFLICT!)
  organization_id String?,          -- organization_id is OPTIONAL (CONFLICT!)
  plan subscription_plan @default(free),  -- Uses enum instead of plan_id
  status subscription_status,       -- Uses enum
  stripe_subscription_id String?,
  // ... other fields
}
```

### Key Conflicts Identified

1. **Primary Association Conflict**
   - Supabase: `organization_id` is required (NOT NULL)
   - Prisma: `user_id` is required (@unique), `organization_id` is optional

2. **Plan Reference Conflict**
   - Supabase: Uses `plan_id` referencing `subscription_plans` table
   - Prisma: Uses `plan` enum field

3. **Status Field Type**
   - Supabase: varchar with CHECK constraint
   - Prisma: enum type `subscription_status`

4. **Missing Fields in Prisma**
   - `billing_reason`
   - `invoice_url` (exists in payment_history but not subscriptions)

5. **Additional Fields in Prisma**
   - `customer_id` (Stripe customer ID)
   - `subscription_id` (different from stripe_subscription_id)

### 2. Index Differences

#### Supabase Indexes
- `idx_subscriptions_org_id` ON organization_id
- `idx_subscriptions_plan_id` ON plan_id
- `idx_subscriptions_status` ON status
- `idx_subscriptions_status_period` ON (status, current_period_end)

#### Prisma Indexes
- Missing explicit index definitions
- Relies on unique constraints for indexing

### 3. Table Existence Conflicts

#### Tables in Supabase but not in Prisma
- None identified (all tables present)

#### Tables in Prisma but not in Supabase migrations
- Multiple auth schema tables (handled by Supabase Auth)
- Some adapter-specific tables

## Recommendations

### Critical (Must Fix)

1. **Resolve user_id vs organization_id conflict**
   - Decision needed: Are subscriptions tied to users or organizations?
   - Current code uses `user_id` in many places
   - Migration uses `organization_id`
   
2. **Standardize plan reference**
   - Either use `plan_id` with foreign key (recommended)
   - Or use enum (less flexible)

3. **Add missing indexes to Prisma schema**
   - Critical for query performance

### Important (Should Fix)

1. **Align status field types**
   - Use consistent enum or varchar approach

2. **Add missing fields**
   - Ensure all business-critical fields are present

3. **Fix foreign key constraints**
   - Ensure referential integrity

## Migration Script Required

```sql
-- Fix subscription table to align with application needs
-- This needs careful consideration of existing data

-- Option 1: Add user_id to existing organization-based subscriptions
ALTER TABLE subscriptions 
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES auth.users(id);

-- Option 2: Make organization_id optional (as per Prisma)
ALTER TABLE subscriptions 
  ALTER COLUMN organization_id DROP NOT NULL;

-- Add missing indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);

-- Add missing fields
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS customer_id varchar UNIQUE,
  ADD COLUMN IF NOT EXISTS subscription_id varchar UNIQUE;
```

## Next Steps

1. **Business Decision Required**
   - Confirm if subscriptions should be user-based or organization-based
   - This affects billing logic throughout the application

2. **Create Reconciliation Migration**
   - Write migration to align schemas
   - Test on development database

3. **Update Prisma Schema**
   - Match the final decided structure
   - Run `prisma db pull` to sync

4. **Test Application**
   - Ensure all queries still work
   - Check subscription creation/update flows