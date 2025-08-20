# Epic 0: Performance Optimization & Configuration

**Duration:** 3-5 days  
**Priority:** CRITICAL - Must complete before feature work  
**Epic Owner:** Development Team  
**Status:** Ready to Start  
**Last Updated:** 2025-08-20 (Based on actual testing)

## Executive Summary

Based on comprehensive testing, the system is **architecturally sound but performance-impaired**. The build works but takes 40+ seconds to start. The architecture is excellent and should be preserved. Focus should be on optimization and configuration, not rebuilding.

## Current State (Actual Testing Results)

### What's Working ✅
- **Build succeeds** (slow but functional)
- **Core authentication** (login, registration, sessions)
- **Excellent architecture** (proper separation of concerns)
- **Database adapters** (well-implemented pattern)
- **Security fundamentals** (httpOnly cookies, CSRF middleware)
- **170+ E2E tests written** (can't run due to performance)

### What's Not Working ❌
- **40-second dev server startup** (was 72s, improved but still critical)
- **Email service not configured** (blocking password reset)
- **Stripe not configured** (no API keys)
- **E2E tests timeout** (due to slow performance)
- **Avatar upload disconnected** (UI exists, backend not wired)

### What's Partially Working 🟨
- **MFA/SSO frameworks** (UI exists, needs configuration)
- **Team management** (structure exists, needs completion)
- **Business features** (forms exist, validation incomplete)

## Problem Statement

The main issues are:
1. **Performance**: Prisma instrumentation and Sentry telemetry causing 40s+ startup
2. **Configuration**: Critical services (email, Stripe) not configured
3. **Wiring**: UI components exist but not connected to backends
4. **Testing**: Tests exist but can't run due to timeouts

## Objectives

### Primary Goals (Days 1-3)
1. **Performance Fix** - Achieve <15s dev server startup
2. **Service Configuration** - Email and Stripe setup
3. **Feature Wiring** - Connect existing UI to backends
4. **Test Enablement** - Make E2E tests runnable

### Non-Goals (Explicitly Preserved)
- **DO NOT delete adapter pattern** (it's well-implemented)
- **DO NOT remove "complexity"** (it serves pluggability)
- **DO NOT rebuild services** (they work, just need optimization)
- **DO NOT delete tests** (fix performance so they can run)

## Success Criteria

- [ ] **Dev server starts in <15 seconds**
- [ ] **E2E tests can execute without timeout**
- [ ] **Email service configured and working**
- [ ] **All Phase 1-2 features connected**
- [ ] **No build warnings about instrumentation**

## Detailed Task Breakdown

### Day 1: Performance Optimization [8 hours]
**Owner:** Full Team  
**Critical Path:** Yes - Blocks everything

#### 1.1 Remove Prisma Instrumentation (2h)
```bash
# Current issue: Multiple warnings about @prisma/instrumentation
# Impact: Significant build overhead
```
- [ ] Uninstall @prisma/instrumentation
- [ ] Remove all instrumentation imports
- [ ] Test build performance improvement
- [ ] Verify Prisma still works without instrumentation

#### 1.2 Disable Development Telemetry (2h)
```typescript
// Current: Sentry initializing in development
// Solution: Conditional initialization
if (process.env.NODE_ENV === 'production') {
  // Initialize Sentry
}
```
- [ ] Add environment check for Sentry
- [ ] Disable telemetry in development
- [ ] Keep for production only
- [ ] Test performance improvement

#### 1.3 Optimize Service Initialization (4h)
```typescript
// Current: All services initialize on every request
// Solution: Lazy loading and singleton pattern
```
- [ ] Implement lazy service loading
- [ ] Use singleton pattern for services
- [ ] Cache service instances
- [ ] Dynamic imports for non-critical services

### Day 2: Service Configuration [8 hours]
**Owner:** Backend Team  
**Critical Path:** Yes for auth features

#### 2.1 Email Service Setup (4h)
```typescript
// Options: Resend, SendGrid, or Mailtrap for dev
// Current: EMAIL_SERVER not configured
```
- [ ] Choose email provider (recommend Resend)
- [ ] Configure EMAIL_SERVER in .env
- [ ] Test email sending
- [ ] Verify password reset flow
- [ ] Test email verification

#### 2.2 Stripe Configuration (4h)
```typescript
// Current: Stripe service exists but no keys
// Need: STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY
```
- [ ] Create Stripe account (test mode)
- [ ] Add API keys to .env
- [ ] Test checkout session creation
- [ ] Verify webhook endpoint
- [ ] Test customer portal

### Day 3: Feature Wiring [8 hours]
**Owner:** Full Stack Team  
**Critical Path:** For feature completeness

#### 3.1 Avatar Upload Connection (3h)
```typescript
// Current: UI exists at ProfileAvatarSection.tsx
// Need: Wire to storage adapter
```
- [ ] Connect upload UI to backend
- [ ] Implement storage service call
- [ ] Add image optimization
- [ ] Test upload flow

#### 3.2 Fix Route Inconsistencies (2h)
```typescript
// Current: /register returns 404
// Actual: /auth/register works
```
- [ ] Audit all routes
- [ ] Fix inconsistent paths
- [ ] Update navigation links
- [ ] Test all auth flows

#### 3.3 Complete Password Reset (3h)
```typescript
// Current: Logic exists but email blocks it
// After email setup: Should work
```
- [ ] Test reset email sending
- [ ] Verify token generation
- [ ] Test password update
- [ ] Complete full flow

### Day 4-5: Testing & Stabilization [16 hours]
**Owner:** QA Team  
**Depends on:** Performance fixes

#### 4.1 Enable E2E Tests (4h)
```bash
# Current: Tests timeout due to slow server
# After optimization: Should run
```
- [ ] Verify server starts <15s
- [ ] Run registration tests
- [ ] Run login tests
- [ ] Fix any failing tests

#### 4.2 Fix Critical Bugs (8h)
- [ ] Address any bugs found in testing
- [ ] Complete partially working features
- [ ] Verify all Phase 1-2 features
- [ ] Document remaining issues

#### 4.3 Performance Verification (4h)
- [ ] Measure final startup time
- [ ] Test hot reload speed
- [ ] Verify build time <60s
- [ ] Document performance metrics

## What We're NOT Doing (And Why)

### Not Deleting Adapters
The adapter pattern is **correctly implemented** and essential for:
- Database agnosticism
- Pluggable architecture
- SDK distribution goals
- Testing with mocks

### Not "Simplifying" Services
The service separation is **intentional and correct**:
- Proper separation of concerns
- Enables monorepo extraction
- Supports interface-first design
- Allows service swapping

### Not Removing "Complexity"
What looks like complexity is actually **necessary architecture**:
- Supports pluggability
- Enables customization
- Follows SOLID principles
- Prepared for SDK distribution

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Performance not fixable | 10% | High | Have specific targets, measure progress |
| Email service issues | 20% | Medium | Use established service (Resend) |
| Test failures | 30% | Low | Fix incrementally |
| Stripe complexity | 20% | Medium | Start with test mode |

## Comparison with Previous Epic 0

| Previous Epic 0 | New Epic 0 | Rationale |
|-----------------|------------|-----------|
| "Emergency resuscitation" | Performance optimization | System works, just slow |
| Delete 70% of code | Preserve architecture | Architecture is excellent |
| Remove abstractions | Keep adapter pattern | Essential for pluggability |
| Consolidate services | Optimize initialization | Separation is intentional |
| Direct Supabase calls | Keep adapters | Breaks pluggability |

## Success Metrics

### Day 1 Complete When:
- Dev server starts in <30s (from 40s)
- No Prisma instrumentation warnings
- Sentry disabled in development

### Day 2 Complete When:
- Can send test emails
- Password reset works end-to-end
- Stripe test payment succeeds

### Day 3 Complete When:
- Avatar upload works
- All routes consistent
- Password reset complete

### Days 4-5 Complete When:
- Dev server <15s startup
- 50+ E2E tests passing
- All Phase 1-2 features working

## Next Steps After Epic 0

1. **Epic 1**: Complete remaining features (Week 2)
2. **Epic 2**: Monorepo transformation (Week 3)
3. **Epic 3**: Quality assurance (Week 4)
4. **Epic 4**: Production deployment (Week 5)

## Conclusion

The system doesn't need emergency resuscitation - it needs optimization and configuration. The architecture is sound, the code quality is good, and most features exist. With 3-5 days of focused effort on performance and configuration, this will be ready for feature completion and eventual SDK distribution.

**Remember:** This is a marathon, not a sprint. The foundation is solid - we just need to optimize it.

---

*Updated based on actual testing performed on 2025-08-20*