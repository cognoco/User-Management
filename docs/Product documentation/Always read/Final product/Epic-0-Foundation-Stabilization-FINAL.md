# Epic 0: Foundation Stabilization

**Duration:** 1 week  
**Priority:** CRITICAL - Must complete before all other work  
**Epic Owner:** Development Team  
**Status:** Ready to Start  
**Last Updated:** 2025-08-16

## Executive Summary

Foundation Stabilization is the critical first step before any refactoring can begin. Based on comprehensive analysis, this epic addresses immediate security vulnerabilities, type safety issues, and infrastructure problems that block development.

## Problem Statement

Critical issues preventing safe development and refactoring:
- **Security vulnerabilities** including insecure cookie configuration and token logging
- **Database schema inconsistencies** between Prisma and Supabase migrations
- **3,838 `any` type usages** causing TypeScript compilation issues
- **Build timeouts** at 2+ minutes blocking development
- **E2E test framework broken** preventing regression testing
- **Missing critical implementations** like Stripe customer ID tracking

## Objectives

### Primary Goals (Week 1)
1. **Security Baseline** - Fix critical vulnerabilities immediately
2. **Database Consistency** - Reconcile schema differences
3. **TypeScript Health** - Fix compilation with proper types
4. **Build Performance** - Achieve <60 second builds
5. **Test Infrastructure** - Restore E2E testing capability

### Non-Goals (Explicitly Deferred)
- Feature additions (Epic 3)
- UI improvements
- Performance optimization beyond build time
- Comprehensive refactoring (Epic 1)

## Success Criteria

- [ ] ✅ **Security Clean**: Zero critical vulnerabilities, secure cookie configuration
- [ ] 🗄️ **Database Aligned**: Prisma and Supabase schemas match
- [ ] 📝 **TypeScript Compiles**: `npx tsc --noEmit` runs without fatal errors
- [ ] ⚡ **Build Performance**: `npm run build` completes in <60 seconds
- [ ] 🧪 **Tests Run**: E2E framework functional, core tests passing

## Detailed Task Breakdown

### Day 1: Critical Security Fixes [8 hours]
**Owner:** Security Team  
**Critical Path:** Yes - Blocks all other work

#### 1.1 Cookie Security Configuration (2h)
```typescript
// Fix in /src/lib/auth/session.ts
// Add sameSite: 'strict' to all auth cookies
// Ensure httpOnly and secure flags
```
- [ ] Add `sameSite: 'strict'` to cookie configuration
- [ ] Verify `httpOnly: true` on all auth cookies
- [ ] Ensure `secure: true` in production
- [ ] Test across Chrome, Firefox, Safari

#### 1.2 Remove Sensitive Logging (2h)
```typescript
// Files to fix:
// /src/lib/auth/utils.ts - Remove token logging
// /src/adapters/auth/providers/* - Remove debug logs
```
- [ ] Search for console.log with sensitive data
- [ ] Replace with proper log levels
- [ ] Add log sanitization utility
- [ ] Verify no tokens in production logs

#### 1.3 CSRF Protection (2h)
```typescript
// Fix in /src/middleware/csrf.ts
// Ensure all state-changing routes validate CSRF tokens
```
- [ ] Implement CSRF token validation in auth endpoints
- [ ] Add middleware to API routes
- [ ] Test CSRF protection thoroughly
- [ ] Document CSRF implementation

#### 1.4 Dependency Security Audit (2h)
```bash
npm audit fix --force
npm update @simplewebauthn/browser @simplewebauthn/server
npm update form-data xlsx
```
- [ ] Run `npm audit` and fix critical/high vulnerabilities
- [ ] Update vulnerable dependencies
- [ ] Test functionality after updates
- [ ] Document dependency changes

### Day 2: Database Schema Reconciliation [8 hours]
**Owner:** Backend Team  
**Critical Path:** Yes

#### 2.1 Schema Audit (3h)
```sql
-- Compare Prisma schema with Supabase migrations
-- Document all differences
```
- [ ] List all table differences
- [ ] Identify missing indexes
- [ ] Check foreign key constraints
- [ ] Document field naming inconsistencies

#### 2.2 Create Reconciliation Migration (3h)
```sql
-- Fix subscription table inconsistencies
-- Add missing indexes
-- Align field naming conventions
```
- [ ] Write migration to fix `subscriptions` table
- [ ] Add index on `team_members.user_id`
- [ ] Fix organization_id vs user_id inconsistency
- [ ] Test migration on dev database

#### 2.3 Validate and Deploy (2h)
- [ ] Run migration on test environment
- [ ] Verify all queries still work
- [ ] Update Prisma schema to match
- [ ] Document schema changes

### Day 3: TypeScript Compilation Fix [8 hours]
**Owner:** Full Stack Team  
**Critical Path:** Yes

#### 3.1 Consolidate Type Definitions (4h)
```typescript
// Priority files:
// /src/core/auth/models.ts - User type conflicts
// /src/types/auth.ts - Registration payload
// /src/types/user.ts - Profile types
```
- [ ] Create single source of truth for User type
- [ ] Unify Profile interfaces
- [ ] Standardize Registration payload
- [ ] Fix service interface mismatches

#### 3.2 Replace Critical Any Types (4h)
```bash
# Fix in priority order:
1. /src/services/auth/*.ts (278 any types)
2. /src/app/api/**/*.ts (512 any types)
3. /src/adapters/**/*.ts (423 any types)
```
- [ ] Replace `any` with `unknown` initially
- [ ] Add proper types progressively
- [ ] Use `@ts-expect-error` for complex cases
- [ ] Ensure compilation succeeds

### Day 4: Build Performance Optimization [8 hours]
**Owner:** DevOps Team  
**Critical Path:** Yes

#### 4.1 Next.js Configuration (3h)
```javascript
// next.config.js optimizations
module.exports = {
  swcMinify: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  experimental: {
    optimizeCss: true,
  }
}
```
- [ ] Enable SWC minification
- [ ] Configure build caching
- [ ] Optimize bundle splitting
- [ ] Remove unused dependencies

#### 4.2 Dependency Analysis (3h)
```bash
# Analyze and optimize
npx depcheck
npm ls --depth=0
```
- [ ] Remove unused dependencies
- [ ] Update to lighter alternatives
- [ ] Implement lazy loading
- [ ] Optimize import statements

#### 4.3 Build Pipeline (2h)
- [ ] Setup parallel builds
- [ ] Configure build caching
- [ ] Optimize TypeScript compilation
- [ ] Verify <60 second build time

### Day 5: Test Framework Restoration [8 hours]
**Owner:** QA Team  
**Critical Path:** Yes

#### 5.1 Playwright Configuration (3h)
```javascript
// Fix playwright.config.ts
// Update test helpers
```
- [ ] Update Playwright to latest version
- [ ] Fix authentication helpers
- [ ] Configure test timeouts
- [ ] Setup test data fixtures

#### 5.2 Fix Critical E2E Tests (3h)
```bash
# Priority tests to fix:
- auth/login.spec.ts
- auth/register.spec.ts
- profile/update.spec.ts
```
- [ ] Fix login test suite
- [ ] Fix registration tests
- [ ] Repair profile tests
- [ ] Ensure CI pipeline passes

#### 5.3 Test Infrastructure (2h)
- [ ] Setup test database
- [ ] Configure test environment variables
- [ ] Add test data seeders
- [ ] Document test running procedures

## Risk Mitigation

| Risk | Impact | Mitigation | Contingency |
|------|--------|------------|-------------|
| Schema migration breaks app | HIGH | Test thoroughly on staging | Rollback script ready |
| Type fixes introduce bugs | MEDIUM | Incremental changes with tests | Use @ts-ignore temporarily |
| Build optimizations fail | LOW | Keep current config as backup | Accept longer build times |
| Security fixes break auth | HIGH | Comprehensive auth testing | Feature flag for rollback |

## Dependencies

- No external dependencies - this epic unblocks all others
- Team availability for dedicated week
- Staging environment for testing

## Deliverables

1. **Security Report** - Document all vulnerabilities fixed
2. **Schema Migration** - Reconciliation scripts and documentation
3. **Type Safety Report** - TypeScript coverage metrics
4. **Build Performance** - Before/after metrics
5. **Test Suite Status** - Working tests documentation

## Definition of Done

- [ ] All security vulnerabilities patched
- [ ] Database schemas reconciled
- [ ] TypeScript compiles without errors
- [ ] Build completes in <60 seconds
- [ ] Core E2E tests passing
- [ ] CI/CD pipeline green
- [ ] Documentation updated
- [ ] Team trained on changes

## Next Steps

After Epic 0 completion:
1. Begin Epic 1 (Monorepo Transformation) OR
2. Begin Epic 3 (Feature Completion) if urgent
3. Both can run in parallel with separate teams

---

*This epic is the foundation for all subsequent work. No other epics should begin until Epic 0 is complete.*