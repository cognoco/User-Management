# Epic Roadmap - Refactoring Plan

**Timeline:** 8 weeks  
**Start Date:** TBD  
**Status:** Ready to Execute

## 📅 Week-by-Week Overview

```
Week 1: Foundation Stabilization (Epic 0)
Week 2-3: Monorepo Transformation (Epic 1) + Database Consistency (Epic 2)
Week 4-5: Feature Completion (Epic 3)
Week 6-7: tRPC Migration (Epic 4)
Week 8: Testing & Polish
```

---

## Epic 0: Foundation Stabilization ✅
**Duration:** 1 week  
**Status:** Ready to Start  
**Owner:** Development Team

### Critical Issues to Fix
1. **Database Schema Reconciliation** - Prisma vs Supabase mismatch
2. **TypeScript Compilation** - 3,838 `any` types
3. **Build Performance** - Currently 2+ minutes, target <60 seconds
4. **E2E Test Framework** - Currently broken
5. **Security Vulnerabilities** - 2 critical/high issues

### Success Criteria
- [ ] Schemas match 100%
- [ ] TypeScript compiles without errors
- [ ] Build <60 seconds
- [ ] 5 critical E2E tests pass
- [ ] Zero critical vulnerabilities

---

## Epic 1: Monorepo Transformation 🏗️
**Duration:** 2 weeks  
**Status:** Depends on Epic 0  
**Owner:** Platform Architecture Team

### Package Structure
```
/apps/user-mgmt/        → Main application
/packages/
  @pump/core/          → Types and interfaces
  @pump/services/      → Business logic (preserve existing)
  @pump/adapters/      → Data providers (preserve existing)
  @pump/ui-headless/   → Logic components
  @pump/ui-primitives/ → Basic components
  @pump/ui-styled/     → Full components
```

### Key Changes
- Convert to pnpm workspaces
- Extract packages while preserving all functionality
- No feature changes, just reorganization
- Maintain all existing service/adapter architecture

---

## Epic 2: Database Consistency 🗄️
**Duration:** 1 week (parallel with Epic 1)  
**Status:** Can start after Epic 0  
**Owner:** Backend Team

### Issues to Resolve
- Subscription table inconsistencies
- Missing foreign keys and indexes
- Field naming (snake_case vs camelCase)
- Missing device management table

### Migration Safety
- Full backup before migration
- Test on staging first
- Rollback plan ready
- Zero data loss requirement

---

## Epic 3: Feature Completion ✨
**Duration:** 2 weeks  
**Status:** After Epic 0  
**Owner:** Full Stack Team

### Priority 1 (Week 1)
1. **Avatar Upload** (3 days)
   - Wire existing UI to storage service
   - 2MB limit, JPEG/PNG only
   
2. **Stripe Integration** (4 days)
   - Customer creation on registration
   - Webhook signature verification
   - Checkout session management

3. **Password Reset** (2 days)
   - Complete backend flow
   - Email template
   - Token expiration

### Priority 2 (Week 2)
1. Privacy Settings Storage
2. Device Management
3. Backup Codes Refactor

---

## Epic 4: tRPC Migration 🔌
**Duration:** 2 weeks  
**Status:** After Epic 1  
**Owner:** Full Stack Team

### Migration Strategy
- Run tRPC alongside REST APIs (no breaking changes)
- Progressive endpoint migration
- Type-safe contracts
- Deprecate REST after validation

### Router Priority
1. Authentication (Day 1-2)
2. Profile & User (Day 3-4)
3. Team & Permissions (Day 5-6)
4. Subscription (Day 7-8)
5. Admin Functions (Day 9-10)

---

## Week 8: Final Polish 🎯

### Quality Assurance
- [ ] Test coverage >80%
- [ ] All E2E tests passing
- [ ] Performance benchmarks met
- [ ] Security audit passed

### Documentation
- [ ] API documentation complete
- [ ] Deployment guide updated
- [ ] Team training materials
- [ ] Migration guide for REST→tRPC

### Launch Readiness
- [ ] Staging environment validated
- [ ] Rollback procedures tested
- [ ] Monitoring configured
- [ ] Team sign-off

---

## Success Metrics

### Technical Metrics
- Build time: <60 seconds (from 2+ minutes)
- TypeScript errors: 0 (from 3,838)
- Test coverage: >80% (from ~60%)
- Bundle size: -20% reduction

### Business Metrics
- Zero functionality regression
- All critical features complete
- Development velocity improved
- Team confidence high

---

## Risk Register

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Schema migration failure | Low | Critical | Backup, staging test, rollback plan |
| Monorepo complexity | Medium | High | Incremental migration, training |
| Stripe integration issues | Medium | High | Vendor support, fallback payment |
| Timeline slippage | Medium | Medium | Weekly reviews, scope adjustment |

---

## Decision Points

### Week 1 Review
- Continue if Epic 0 complete?
- Adjust Epic 1 scope based on learnings?

### Week 3 Review
- Monorepo working well?
- Database stable?
- Adjust feature priorities?

### Week 5 Review
- Features complete enough?
- Begin tRPC or focus on features?

### Week 7 Review
- Ready for production?
- Need additional week?

---

## Team Allocation

### Weeks 1-2
- 2 Backend Engineers
- 1 Frontend Engineer
- 1 DevOps
- 1 QA

### Weeks 3-5
- 2 Backend Engineers
- 2 Frontend Engineers
- 1 QA

### Weeks 6-8
- 3 Full Stack Engineers
- 2 QA Engineers
- 1 Security Engineer

---

## Post-Launch Roadmap

### Month 3
- Multiple adapter implementations
- Advanced MFA (WebAuthn)
- Enhanced audit logging
- Usage-based billing

### Month 4-6
- SDK extraction
- Multi-tenant isolation
- Analytics dashboard
- API versioning

---

*This roadmap consolidates all Epic planning documents. Individual epic details available in Epic-[N]-*.md files.*