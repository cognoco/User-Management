# Epic 0: Foundation Stabilization (REVISED)

**Duration:** 3 weeks (Realistic estimate based on actual state)  
**Priority:** CRITICAL - Must complete before all other work  
**Epic Owner:** Development Team  
**Current Status:** 40% Complete  
**Created:** 2025-08-18 (Based on code verification)

## Executive Summary

This is a **revised and realistic** Epic 0 plan based on actual code verification. The original epic significantly overestimated completion status. This revision provides an actionable roadmap to achieve true foundation stability.

## Current State Assessment

### What's Actually Working:
- ✅ Dependencies are secure (npm audit clean)
- ✅ Core interfaces are properly defined
- ✅ CSRF middleware exists (needs integration)
- ✅ Basic architecture is sound

### Critical Blockers:
- 🔴 **Build completely broken** - 4 syntax errors prevent compilation
- 🔴 **Major security vulnerabilities** - No cookie security, localStorage for sessions
- 🔴 **No test coverage** - Zero working tests despite config existing
- 🔴 **Missing core features** - MFA/TOTP not implemented despite claims

## Revised Objectives

### Week 1: Make It Build (Immediate Stabilization)
**Goal:** Get the application building and running again

### Week 2: Make It Secure (Critical Vulnerabilities)
**Goal:** Fix all critical security vulnerabilities

### Week 3: Make It Testable (Quality Foundation)
**Goal:** Establish basic test coverage and documentation

## Week 1: Make It Build

### Day 1-2: Fix Build Errors (CRITICAL PATH)

#### Task 1.1: Fix Syntax Errors (4 hours)
**Priority:** P0 - Blocks everything  
**Owner:** Any available developer

```typescript
// Files to fix:
1. src/ui/headless/auth/MFAVerificationForm.tsx:72
   - Fix: Change ): React.ReactElement => { to ) { 
   
2. src/ui/headless/auth/RegistrationForm.tsx:86
   - Fix: Change ): React.ReactElement => { to ) {
   
3. src/ui/headless/company/AddressCard.tsx:11
   - Fix: Change ): React.ReactElement => { to ) {
   
4. src/services/subscription/seat-manager.ts:87
   - Fix: Change "getP endingInvites" to "getPendingInvites"
```

**Verification:**
```bash
npm run build  # Should complete without errors
```

#### Task 1.2: Fix Type Errors (8 hours)
**Priority:** P0  
**Owner:** TypeScript specialist

- [ ] Fix remaining `any` types in critical paths
- [ ] Add proper return types to all components
- [ ] Fix unused variable warnings
- [ ] Ensure TypeScript strict mode compliance

**Success Criteria:**
- Build completes in under 60 seconds
- No critical TypeScript errors
- Dev server starts successfully

### Day 3-4: Establish Development Workflow

#### Task 1.3: Create Build Verification Script (4 hours)
```bash
#!/bin/bash
# scripts/verify-build.sh
npm run lint
npm run build
npm run test -- --run
echo "Build verification complete"
```

#### Task 1.4: Document Current State (4 hours)
- [ ] Create KNOWN_ISSUES.md with all warnings
- [ ] Document workarounds for remaining issues
- [ ] Update README with accurate build instructions

### Day 5: Build Pipeline Optimization

#### Task 1.5: Optimize Build Performance (8 hours)
- [ ] Configure TypeScript incremental compilation
- [ ] Set up build caching
- [ ] Remove unused dependencies
- [ ] Configure proper module resolution

**Success Metric:** Build time < 45 seconds

## Week 2: Make It Secure

### Day 6-7: Cookie Security Implementation

#### Task 2.1: Implement Secure Cookie Configuration (8 hours)
**Priority:** P0 - Critical vulnerability  
**Owner:** Security team

```typescript
// src/lib/auth/cookie-config.ts
export const cookieConfig = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 60 * 60 * 24 * 7, // 7 days
  path: '/'
};

// Apply to all auth endpoints
```

**Implementation:**
1. Create centralized cookie configuration
2. Apply to all session/auth cookies
3. Update middleware to use configuration
4. Test in development and production environments

### Day 8: Remove localStorage Usage

#### Task 2.2: Migrate from localStorage to Secure Storage (8 hours)
**Priority:** P0 - XSS vulnerability

**Files to update:**
- `src/services/notification/default-notification.handler.ts`
- `app/settings/page.tsx`
- All test files using localStorage

**Approach:**
1. Create secure session storage service
2. Replace all localStorage calls
3. Use httpOnly cookies for sensitive data
4. Keep only non-sensitive data in sessionStorage

### Day 9: Complete CSRF Integration

#### Task 2.3: Integrate CSRF Protection (8 hours)
**Priority:** P0

```typescript
// Apply CSRF middleware to all state-changing routes
// src/app/api/[...]/route.ts
import { withCSRF } from '@/middleware/csrf';

export const POST = withCSRF(async (req) => {
  // Handle request
});
```

**Coverage Required:**
- All POST/PUT/DELETE endpoints
- All form submissions
- All state-changing operations

### Day 10: Clean Up Logging

#### Task 2.4: Remove Sensitive Logging (4 hours)
**Priority:** P1

1. Remove all console.log from `src/lib/services/retention.service.ts`
2. Create proper logger utility with levels
3. Implement log sanitization
4. Configure environment-based logging

```typescript
// src/lib/utils/logger.ts
export const logger = {
  info: (msg: string, data?: any) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(msg, sanitize(data));
    }
  },
  error: (msg: string, error?: any) => {
    console.error(msg, sanitize(error));
  }
};
```

## Week 3: Make It Testable

### Day 11-12: Create Core Test Suite

#### Task 3.1: Write Critical Path Tests (16 hours)
**Priority:** P0  
**Owner:** QA team

```typescript
// src/tests/critical/auth.test.ts
describe('Authentication Flow', () => {
  it('should allow user registration', async () => {});
  it('should allow user login', async () => {});
  it('should handle password reset', async () => {});
  it('should enforce protected routes', async () => {});
});

// src/tests/critical/security.test.ts
describe('Security', () => {
  it('should set secure cookies', async () => {});
  it('should validate CSRF tokens', async () => {});
  it('should not expose sensitive data', async () => {});
});
```

### Day 13: Implement Basic MFA

#### Task 3.2: Create Minimal MFA Implementation (8 hours)
**Priority:** P1

Since MFA is claimed complete but doesn't exist:
1. Create `src/services/mfa/` directory
2. Implement basic TOTP support using existing dependencies
3. Add backup codes generation
4. Create database schema for MFA data

```typescript
// src/services/mfa/totp.service.ts
import { authenticator } from 'otplib';

export class TOTPService {
  generateSecret(user: User): string {
    return authenticator.generateSecret();
  }
  
  verifyToken(token: string, secret: string): boolean {
    return authenticator.verify({ token, secret });
  }
  
  generateBackupCodes(): string[] {
    // Generate 8 backup codes
    return Array.from({ length: 8 }, () => 
      crypto.randomBytes(4).toString('hex')
    );
  }
}
```

### Day 14: Test Infrastructure

#### Task 3.3: Fix Test Execution (8 hours)
**Priority:** P1

1. Fix test timeout issues
2. Create test database setup
3. Add test data seeders
4. Configure proper test environment

```json
// package.json
{
  "scripts": {
    "test": "vitest run --reporter=verbose",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "test:coverage": "vitest run --coverage"
  }
}
```

### Day 15: Documentation and Handoff

#### Task 3.4: Complete Documentation (8 hours)
**Priority:** P1

Create/Update:
1. `SECURITY.md` - Document all security implementations
2. `TESTING.md` - How to run and write tests
3. `KNOWN_ISSUES.md` - Remaining issues and workarounds
4. `DEPLOYMENT.md` - Production deployment checklist

## Success Metrics

### Week 1 Completion Criteria:
- [ ] Build completes without errors
- [ ] Dev server runs successfully
- [ ] Build time < 60 seconds
- [ ] All syntax errors fixed

### Week 2 Completion Criteria:
- [ ] All cookies use httpOnly/secure/sameSite
- [ ] No sensitive data in localStorage
- [ ] CSRF protection on all endpoints
- [ ] No sensitive data in logs
- [ ] Security audit passing

### Week 3 Completion Criteria:
- [ ] 10+ critical path tests passing
- [ ] Basic MFA implementation working
- [ ] Test suite runs in < 2 minutes
- [ ] Documentation complete

## Risk Mitigation

| Risk | Mitigation | Contingency |
|------|------------|-------------|
| Build fixes break functionality | Test each fix incrementally | Revert commits if needed |
| Security fixes impact performance | Profile before/after | Accept minor performance hit |
| MFA implementation too complex | Start with basic TOTP only | Defer advanced features |
| Test suite takes too long | Focus on critical paths only | Add more tests later |

## Dependencies

### Required Before Starting:
- Team availability for 3 weeks
- Staging environment for testing
- Database backup before migrations

### External Dependencies:
- No external blockers identified

## Team Allocation

### Week 1:
- 2 developers on build fixes
- 1 developer on type safety
- 1 on documentation

### Week 2:
- 2 developers on security fixes
- 1 on CSRF integration
- 1 on testing security

### Week 3:
- 1 developer on MFA
- 2 on test suite
- 1 on documentation

## Definition of Done

### Epic Complete When:
1. **Build** - npm run build completes without errors
2. **Security** - All critical vulnerabilities fixed
3. **Tests** - Core test suite passing
4. **Documentation** - All docs updated
5. **Handoff** - Team trained on changes

## Post-Epic Next Steps

After Epic 0 completion:
1. Run security penetration testing
2. Performance profiling and optimization
3. Begin Epic 1 (Monorepo) or Epic 3 (Features)
4. Set up continuous security scanning

## Notes

This revised epic is based on actual code verification, not assumptions. The timeline is realistic given the current state. It's critical to complete this epic before any other work to avoid building on an unstable foundation.

**Key Changes from Original:**
- Extended timeline from 1 to 3 weeks
- Reduced scope to truly critical items
- Added specific implementation details
- Based on verified current state
- Realistic resource allocation

---

*This epic revision supersedes the original Epic 0 document. All stakeholders should use this as the authoritative plan.*