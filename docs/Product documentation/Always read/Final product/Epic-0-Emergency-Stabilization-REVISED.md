# Epic 0: Emergency Stabilization & Simplification

**Duration:** 1 week (40 hours)  
**Priority:** CRITICAL - Blocking all other work  
**Epic Owner:** Full Development Team  
**Status:** ⚠️ REDEFINED - Complete strategy change  
**Updated:** 2025-08-18 (Emergency Revision)

## Executive Summary

This epic completely redefines Epic 0 based on brutal honesty about the current state. The goal is no longer "stabilization" but **"emergency resuscitation"** followed by **aggressive simplification**. We're moving from 3,838 `any` types and complex abstractions to a working, deployable system.

## Problem Statement (Revised)

The current codebase is **architecturally sound but executionally broken**:
- Build fails completely (times out after 2 minutes)
- Over-engineered for current needs (100+ adapter files for 1 implementation)
- False abstractions that don't actually work
- Cannot deploy, test, or demonstrate functionality
- Complexity is blocking progress, not enabling it

## Objectives (Complete Rewrite)

### Primary Goal: **WORKING BUILD IN 24 HOURS**
1. **Emergency Triage** - Fix critical build errors
2. **Radical Simplification** - Delete 70% of complexity
3. **Direct Implementation** - Remove abstractions that don't serve us
4. **Deployable State** - Get to production-ready baseline

### Non-Goals (Explicitly Deferred)
- Perfect architecture (we have that, it doesn't work)
- Multiple adapters (implement 1 well, not 10 poorly)
- Complete feature set (get core working first)
- Comprehensive testing (fix the code first)

## Success Criteria (Redefined)

- [ ] **Build Succeeds**: npm run build completes in <60 seconds
- [ ] **Core Features Work**: Login, profile, basic team functionality
- [ ] **Deployable**: Can deploy to Vercel without errors
- [ ] **<50 Adapter Files**: Reduced from 100+ to essentials only
- [ ] **<2000 LOC in Adapters**: Down from current bloat
- [ ] **Working Demo**: Can show login → dashboard → profile flow

## Detailed Task Breakdown

### Day 1: Emergency Resuscitation [8 hours]
**Owner:** Full Team (All Hands)  
**Critical Path:** Everything depends on this

#### Hour 1: Stop the Bleeding
```bash
# Immediate fixes
./scripts/emergency-fix.sh
npm run build:minimal
npm run dev
```

**Tasks:**
- [x] Run emergency fix script
- [ ] Fix "getP endingInvites" typo
- [ ] Replace critical `any` types with `unknown`
- [ ] Create minimal build config
- [ ] Verify local development works

#### Hour 2-3: Radical Deletion
**Delete These Directories** (Keep in git history):
- [ ] `src/adapters/saved-search/`
- [ ] `src/adapters/resource-relationship/`
- [ ] `src/adapters/webhooks/`
- [ ] `src/adapters/company-notification/`
- [ ] `src/adapters/consent/`
- [ ] `src/adapters/csrf/`
- [ ] `src/adapters/data-export/`
- [ ] `src/adapters/admin/`
- [ ] `src/adapters/api-keys/`
- [ ] All `__tests__/` folders (temporarily)

**Keep Only Essential Adapters:**
- `auth/` (login, logout, register)
- `user/` (profile CRUD)
- `team/` (basic team operations)
- `subscription/` (billing)
- `database/` (core data operations)
- `notification/` (basic notifications)

#### Hour 4-6: Direct Implementation
Create `src/lib/simple-services.ts`:

```typescript
// Replace complex initialization with direct Supabase
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export const simpleAuth = {
  login: (email: string, password: string) => 
    supabase.auth.signInWithPassword({ email, password }),
  logout: () => supabase.auth.signOut(),
  register: (email: string, password: string) => 
    supabase.auth.signUp({ email, password })
}

export const simpleUsers = {
  getProfile: (userId: string) => 
    supabase.from('profiles').select('*').eq('id', userId).single(),
  updateProfile: (userId: string, data: any) => 
    supabase.from('profiles').update(data).eq('id', userId)
}

export { supabase }
```

#### Hour 7-8: Wire Up Core Pages
- [ ] Replace complex auth with direct Supabase calls
- [ ] Fix login page to use simple auth
- [ ] Fix profile page to use simple users
- [ ] Verify end-to-end flow works

### Day 2: Service Consolidation [8 hours]
**Owner:** Backend Team

#### Consolidate Services (6 → 20+ services)

**BEFORE (Delete):**
- 20+ individual services with complex factories
- Multiple adapter layers
- Abstract interfaces with single implementations

**AFTER (Create):**
```typescript
// 6 consolidated services only
export const services = {
  auth: new AuthService(supabase),      // login, mfa, sso
  users: new UserService(supabase),     // profile, settings
  teams: new TeamService(supabase),     // teams, roles, invites
  billing: new BillingService(stripe),  // subscriptions, payments
  notifications: new NotificationService(supabase), // email, push
  audit: new AuditService(supabase)     // logging, compliance
}
```

#### Simplify Factory Pattern
- [ ] Remove 90% of factory files
- [ ] Keep only `createServices(config)` function
- [ ] Environment-based configuration only

### Day 3: Component Simplification [8 hours]
**Owner:** Frontend Team

#### Fix Component Hierarchy
```typescript
// BEFORE: Complex patterns
Headless → Styled → Primitive → Component

// AFTER: Simple patterns  
Component → Supabase → Done
```

#### Core Pages Working
- [ ] `/login` - Direct Supabase auth
- [ ] `/register` - Direct Supabase auth
- [ ] `/dashboard` - Simple profile display
- [ ] `/settings` - Basic profile editing
- [ ] `/team` - Team list and basic operations

### Day 4: Integration & Testing [8 hours]
**Owner:** Full Team

#### End-to-End Verification
- [ ] User can register
- [ ] User can login
- [ ] User can view/edit profile
- [ ] User can create/join team
- [ ] User can logout
- [ ] All flows work without errors

#### Performance Verification  
- [ ] Build time <60 seconds
- [ ] Page load time <2 seconds
- [ ] No TypeScript errors
- [ ] No console errors

### Day 5: Documentation & Deployment [8 hours]
**Owner:** DevOps + Documentation

#### Create Simplified Documentation
- [ ] Update architecture docs to match reality
- [ ] Document new service patterns
- [ ] Create deployment guide
- [ ] Update development setup

#### Production Deployment
- [ ] Deploy to Vercel
- [ ] Verify production build
- [ ] Test production environment
- [ ] Document environment setup

## Before/After Comparison

### File Count Reduction
| Category | Before | After | Reduction |
|----------|--------|--------|-----------|
| Adapters | 100+ files | 20 files | 80% |
| Services | 25 services | 6 services | 76% |
| Factories | 30 files | 3 files | 90% |
| Tests | 200+ (broken) | 0 (delete all) | 100% |
| **Total** | ~1000 files | ~300 files | **70%** |

### Complexity Reduction
| Metric | Before | After | Change |
|--------|---------|--------|--------|
| Build Time | Timeout | <60s | ✅ Fixed |
| Any Types | 3,838 | <100 | 97% reduction |
| Abstractions | 10 layers | 2 layers | 80% simpler |
| Working Features | 40% | 80% | 100% improvement |

## Risk Mitigation

### Risk: "We're throwing away good architecture"
**Response:** The architecture exists in git history. We're not deleting concepts, just implementations that don't work.

### Risk: "We'll have to rebuild everything"
**Response:** We're building what we actually need, not what we think we might need.

### Risk: "Loss of pluggability"
**Response:** Current system isn't actually pluggable - it's just complex. We'll add real pluggability later.

## Definition of Done

### Epic 0 Complete When:
- [ ] Build succeeds in <60 seconds
- [ ] Core user journey works end-to-end
- [ ] Deployed to production successfully
- [ ] Team can demonstrate working features
- [ ] Foundation ready for Epic 1 (simplified monorepo)

## Next Epic Preview

**Epic 1: Simplified Monorepo (Week 2)**
- Convert working system to Turborepo
- Extract only proven patterns
- Create minimal SDK
- Add back complexity only as needed

---

**Philosophy Change:**
> "Perfect is the enemy of good. Ship working software first, optimize later."

The old Epic 0 tried to fix a broken system. The new Epic 0 builds a working system.