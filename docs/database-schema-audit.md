# Database Schema Audit Report
**Date:** 2025-08-17
**Status:** In Progress

## Executive Summary
Comparison between Prisma schema and Supabase migrations to identify discrepancies and required reconciliation steps.

## Key Findings

### 1. Subscription Table Discrepancies

#### Prisma Schema (Current)
```prisma
model subscriptions {
  id                     String              @id @default(dbgenerated("uuid_generate_v4()"))
  user_id                String?             @db.Uuid // Optional - for private users
  organization_id        String?             @db.Uuid // Optional - for corporate users
  subscription_type      String              @default("user") @db.VarChar(20)
  customer_id            String?             @unique // Stripe customer ID
  subscription_id        String?             @unique 
  plan                   subscription_plan   @default(free) // ENUM field
  status                 subscription_status @default(incomplete) // ENUM field
  current_period_end     DateTime?           @db.Timestamptz(6)
  cancel_at_period_end   Boolean             @default(false)
  trial_end              DateTime?           @db.Timestamptz(6)
  created_at             DateTime            @default(now())
  updated_at             DateTime            @default(now())
  plan_id                String?             @db.Uuid
  current_period_start   DateTime?           @db.Timestamptz(6)
  stripe_subscription_id String?             @db.VarChar
}
```

#### Supabase Migrations (Latest)
```sql
-- Initial creation (20240101000000)
CREATE TABLE subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL,
    plan_id uuid REFERENCES subscription_plans(id),
    status varchar CHECK (status IN ('active', 'canceled', 'past_due', 'trialing')),
    current_period_start timestamp with time zone,
    current_period_end timestamp with time zone,
    cancel_at_period_end boolean DEFAULT false,
    trial_end timestamp with time zone,
    stripe_subscription_id varchar UNIQUE,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Recent reconciliation (20250816000000)
ALTER TABLE subscriptions 
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS subscription_type varchar(20) DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS customer_id varchar UNIQUE,
  ADD COLUMN IF NOT EXISTS subscription_id varchar UNIQUE;
```

### 2. Identified Discrepancies

#### Critical Issues
1. **ENUM vs VARCHAR**: 
   - Prisma uses ENUMs for `plan` and `status`
   - Supabase uses VARCHAR with CHECK constraints
   
2. **Missing in Supabase**:
   - `plan` enum field (Prisma has this as separate field from plan_id)
   
3. **Field Name Differences**:
   - Prisma: `subscription_id` (generic field)
   - Supabase: `stripe_subscription_id` (specific field)

4. **Constraint Differences**:
   - Supabase has CHECK constraint ensuring either user_id OR organization_id is set
   - Prisma schema doesn't enforce this at the database level

### 3. Payment History Table
✅ **Status: Aligned**
- Structure matches between Prisma and Supabase
- Foreign keys properly configured
- Indexes present in both

### 4. Subscription Plans Table
✅ **Status: Aligned**
- Structure matches between Prisma and Supabase
- All fields present and correctly typed

### 5. Missing Tables in Prisma Schema

Tables present in Supabase migrations but not in Prisma schema:
1. `company_domains` (20240519000000)
2. `company_notifications` (20240519000001)
3. `data_exports` (20240601000000)
4. `notification_preferences` (20240610)
5. `access_rules` (20240620000000)
6. `csrf_tokens` (20240630000000)
7. `role_hierarchy` (20240630120000)
8. `resource_relationships` (20240701000000)

## Required Actions

### Priority 1: Fix Subscription Table
1. Remove conflicting ENUM types in Prisma or add them to Supabase
2. Standardize field naming (subscription_id vs stripe_subscription_id)
3. Add missing CHECK constraints to Prisma

### Priority 2: Add Missing Tables to Prisma
1. Generate Prisma models for all missing tables
2. Ensure foreign key relationships are properly defined

### Priority 3: Index Optimization
1. Verify all indexes from Supabase exist in Prisma
2. Add missing indexes for performance

## Migration Script Required

```sql
-- Fix subscription table ENUMs
CREATE TYPE subscription_plan AS ENUM ('free', 'starter', 'pro', 'enterprise');
CREATE TYPE subscription_status AS ENUM ('incomplete', 'active', 'canceled', 'past_due', 'trialing');

-- Update existing varchar fields to ENUMs (requires data migration)
-- This will be handled in a separate migration script
```

## Next Steps
1. Create migration script to reconcile differences
2. Update Prisma schema to match Supabase structure
3. Test migrations in development environment
4. Deploy to production with rollback plan