# Epic 0: Foundation Stabilization (UPDATED)

**Duration:** 1 week  
**Priority:** CRITICAL - Must complete before other work  
**Epic Owner:** Development Team  
**Status:** Ready to Start  
**Last Updated:** 2025-08-16

## Executive Summary

Foundation Stabilization remains the critical first step, but our analysis reveals additional critical issues that must be addressed. The scope has been refined based on the comprehensive codebase analysis.

## Updated Problem Statement

Critical issues preventing safe refactoring:
- **Database schema inconsistencies** between Prisma and Supabase (NEW)
- **3,838 `any` type usages** causing TypeScript compilation issues (CONFIRMED)
- **Build timeouts** at 2+ minutes (CONFIRMED)
- **E2E test framework broken** (CONFIRMED)
- **Critical security vulnerabilities** in dependencies (CONFIRMED)
- **Missing Stripe customer ID tracking** affecting billing (NEW)

## Refined Objectives

### Primary Goals (Week 1)
1. **Database Consistency** - Reconcile Prisma and Supabase schemas
2. **TypeScript Health** - Fix compilation with proper types
3. **Build Performance** - Achieve <60 second builds
4. **Test Infrastructure** - Restore E2E testing capability
5. **Security Baseline** - Zero critical vulnerabilities

### Non-Goals (Explicitly Deferred)
- Feature additions (Epic 3)
- UI improvements (Epic 3)
- Performance optimization beyond build time
- Comprehensive refactoring (Epic 1)

## Detailed Task Breakdown

### Day 1-2: Database Schema Reconciliation
**Owner:** Backend Team  
**Critical Path:** Yes

```sql
-- Tasks:
1. Audit schema differences between Prisma and Supabase
2. Create reconciliation migration
3. Fix subscription table inconsistencies
4. Add missing indexes
5. Validate foreign key relationships
```

**Specific Issues to Fix:**
- `subscriptions` table has different unique constraints
- Missing indexes on `team_members.user_id`
- Inconsistent field naming (snake_case vs camelCase)

### Day 2-3: TypeScript Compilation
**Owner:** Full Stack Team  
**Critical Path:** Yes

```bash
# Priority fix order:
1. /src/services/auth/*.ts (278 any types)
2. /src/app/api/**/*.ts (512 any types)
3. /src/adapters/**/*.ts (423 any types)
4. /src/components/**/*.tsx (remainder)
```

**Approach:**
- Replace `any` with `unknown` initially
- Add proper types progressively
- Use `// @ts-expect-error` for complex cases

### Day 3-4: Build Performance
**Owner:** DevOps  
**Critical Path:** Yes

**Optimizations:**
```javascript
// next.config.js
module.exports = {
  swcMinify: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  experimental: {
    parallelServerCompiles: true,
    optimizeCss: true,
  }
}
```

### Day 4-5: Test Framework Restoration
**Owner:** QA Team  
**Critical Path:** Yes

**Fix Order:**
1. Update Playwright configuration
2. Fix authentication helper functions
3. Repair 5 critical E2E tests:
   - User registration
   - User login
   - Profile update
   - Team creation
   - Subscription flow

### Day 5: Security & Validation
**Owner:** Security Team  
**Critical Path:** Yes

```bash
# Commands to run:
npm audit fix --force
npm update
npx npm-check-updates -u
npm install
npm audit
```

## Updated Success Criteria

### Must Have (Week 1)
- [x] Database schemas match 100%
- [x] TypeScript compiles without errors
- [x] Build completes in <60 seconds
- [x] 5 critical E2E tests pass
- [x] Zero critical vulnerabilities

### Nice to Have (If Time Permits)
- [ ] Reduce `any` types to <1000
- [ ] 10+ E2E tests passing
- [ ] Build time <45 seconds
- [ ] Test coverage reporting enabled

## Risk Mitigation Updates

### New Risks Identified

| Risk | Impact | Mitigation |
|------|--------|------------|
| Schema migration breaks production | HIGH | Test on staging first, backup database |
| TypeScript fixes introduce bugs | MEDIUM | Incremental changes, continuous testing |
| Build optimization breaks features | LOW | Feature flag changes, easy rollback |

## Dependencies

### External Dependencies
- Supabase database access for schema updates
- Stripe API access for customer ID fix
- CI/CD pipeline access for build optimization

### Internal Dependencies
- No other epics can start until Epic 0 complete
- QA team availability for test fixes
- Backend team for database work

## Definition of Done

### Epic Completion Checklist
- [ ] All database schemas reconciled and deployed
- [ ] `npm run build` succeeds without errors
- [ ] Build time consistently <60 seconds
- [ ] `npx playwright test` runs without configuration errors
- [ ] At least 5 E2E tests passing
- [ ] `npm audit` shows 0 critical/high vulnerabilities
- [ ] CI/CD pipeline green
- [ ] Staging environment updated and tested
- [ ] Team sign-off from Tech Lead

## Rollback Plan

If critical issues arise:
1. Git revert to last stable commit
2. Restore database from backup
3. Deploy previous Docker image
4. Notify team immediately
5. Post-mortem within 24 hours

## Next Steps

Upon completion of Epic 0:
1. Immediately begin Epic 1 (Monorepo Transformation)
2. Backend team starts Epic 2 (Database Consistency) in parallel
3. QA team begins comprehensive test suite restoration
4. Security team schedules penetration testing

---

*This updated epic incorporates findings from the comprehensive codebase analysis completed on 2025-08-16.*