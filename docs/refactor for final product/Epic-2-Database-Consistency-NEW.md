# Epic 2: Database Consistency & Schema Optimization (NEW)

**Duration:** 1 week  
**Priority:** CRITICAL - Blocks feature completion  
**Epic Owner:** Backend Team  
**Status:** Ready to Start  
**Prerequisites:** Epic 0 complete, can run parallel with Epic 1  
**Created:** 2025-08-16

## Executive Summary

This is a **new epic** identified from our analysis. Critical database inconsistencies exist between Prisma schema and Supabase migrations that must be resolved before adding new features or scaling the application.

## Problem Statement

Our analysis revealed significant database issues:
- **Schema mismatch** between Prisma and Supabase definitions
- **Missing foreign keys** causing referential integrity risks
- **Inconsistent naming** (snake_case vs camelCase)
- **Missing indexes** impacting query performance
- **Incomplete constraints** allowing invalid data states

## Scope

### In Scope
1. Schema reconciliation
2. Index optimization
3. Constraint enforcement
4. Migration cleanup
5. Data integrity validation

### Out of Scope
- Feature additions
- Data model changes
- Performance tuning beyond indexes
- Switching database providers

## Detailed Issues Found

### 1. Subscription Table Inconsistencies
```sql
-- Prisma defines:
model Subscription {
  id        String @id
  userId    String @unique  -- One subscription per user
  plan      Plan
}

-- Supabase has:
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY,
  organization_id UUID,  -- Different relationship!
  user_id UUID,
  -- No unique constraint on user_id
);
```

### 2. Missing Indexes
```sql
-- Critical missing indexes found:
CREATE INDEX idx_team_members_user_id ON team_members(user_id);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_audit_logs_user_id ON user_actions_log(user_id);
CREATE INDEX idx_sessions_user_id ON auth.sessions(user_id);
```

### 3. Naming Inconsistencies
```typescript
// TypeScript expects:
interface Profile {
  firstName: string;
  lastName: string;
  avatarUrl: string;
}

// Database has:
CREATE TABLE profiles (
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT
);
```

### 4. Missing Foreign Keys
```sql
-- Add missing relationships:
ALTER TABLE company_profiles 
  ADD CONSTRAINT fk_company_user 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE team_invitations
  ADD CONSTRAINT fk_invitation_team
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;
```

## Task Breakdown

### Day 1: Schema Audit
**Owner:** Database Team

1. Generate current schema from both sources:
```bash
# Prisma schema
npx prisma db pull > schema.prisma.current

# Supabase schema
supabase db dump > schema.supabase.current
```

2. Create reconciliation document
3. Identify all discrepancies
4. Plan migration strategy

### Day 2: Create Master Migration
**Owner:** Backend Team

```sql
-- 20250116_schema_reconciliation.sql
BEGIN;

-- Fix subscription table
ALTER TABLE subscriptions 
  DROP COLUMN organization_id,
  ADD CONSTRAINT unique_user_subscription UNIQUE(user_id);

-- Add missing indexes
CREATE INDEX CONCURRENTLY idx_team_members_user_id ON team_members(user_id);
-- ... other indexes

-- Fix naming (create views for backward compatibility)
CREATE VIEW profile_view AS 
  SELECT 
    first_name as firstName,
    last_name as lastName,
    avatar_url as avatarUrl
  FROM profiles;

COMMIT;
```

### Day 3: Test Migration
**Owner:** QA Team

1. Backup production database
2. Test on staging environment
3. Verify data integrity
4. Performance testing
5. Rollback testing

### Day 4: Update Application Code
**Owner:** Full Stack Team

```typescript
// Update Prisma schema
model Subscription {
  id            String   @id @default(uuid())
  userId        String   @unique @map("user_id")
  customerId    String?  @map("customer_id")
  subscriptionId String? @map("subscription_id")
  // ... align with actual database
}

// Update field mappings
const profileMapper = {
  firstName: 'first_name',
  lastName: 'last_name',
  avatarUrl: 'avatar_url'
};
```

### Day 5: Deploy and Validate
**Owner:** DevOps Team

1. Deploy to production during maintenance window
2. Run validation scripts
3. Monitor performance metrics
4. Verify application functionality
5. Document changes

## Migration Safety Checklist

### Pre-Migration
- [ ] Full database backup completed
- [ ] Staging environment tested
- [ ] Rollback script prepared
- [ ] Maintenance window scheduled
- [ ] Team notified

### During Migration
- [ ] Monitor active connections
- [ ] Check for blocking queries
- [ ] Verify each step completion
- [ ] Test critical paths

### Post-Migration
- [ ] Application health checks pass
- [ ] Performance metrics normal
- [ ] No increase in error rates
- [ ] Data integrity validated
- [ ] Documentation updated

## Success Criteria

### Must Have
- [ ] Prisma and Supabase schemas match 100%
- [ ] All foreign keys enforced
- [ ] All critical indexes created
- [ ] Zero data loss during migration
- [ ] Application functionality unchanged

### Should Have
- [ ] Query performance improved >20%
- [ ] Consistent naming conventions
- [ ] Migration reversible
- [ ] Automated schema validation

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Data corruption | LOW | CRITICAL | Comprehensive backups, staged rollout |
| Performance degradation | MEDIUM | HIGH | Index creation during low traffic |
| Application breakage | LOW | HIGH | Thorough testing, feature flags |
| Extended downtime | LOW | MEDIUM | Practiced migration, rollback ready |

## Dependencies

### Technical Dependencies
- Supabase CLI v1.142.0+
- Prisma v5.0.0+
- PostgreSQL 15+
- Database backup storage

### Team Dependencies
- Database administrator availability
- Backend team for code updates
- QA team for validation
- DevOps for deployment

## Validation Scripts

### Schema Comparison
```bash
#!/bin/bash
# compare_schemas.sh
npx prisma db pull --schema=./prisma/schema.current.prisma
supabase db dump --schema-only > supabase.current.sql
diff prisma/schema.current.prisma supabase.current.sql
```

### Data Integrity Check
```sql
-- Check for orphaned records
SELECT COUNT(*) FROM profiles p
WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p.user_id);

-- Check for missing indexes
SELECT schemaname, tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

## Long-term Improvements

### Phase 2 (Future)
1. Implement database versioning
2. Add automated schema drift detection
3. Create data archival strategy
4. Implement read replicas
5. Add query performance monitoring

## Definition of Done

- [ ] All schema discrepancies resolved
- [ ] Migration successfully deployed to production
- [ ] Zero data integrity issues
- [ ] Performance metrics improved or stable
- [ ] Documentation fully updated
- [ ] Monitoring alerts configured
- [ ] Team trained on new schema

---

*This epic ensures database consistency before proceeding with feature development and scaling.*