there# Epic 3: tRPC Migration

**Duration:** 2 weeks  
**Priority:** MEDIUM - Important for type safety  
**Epic Owner:** Architecture Team  
**Status:** Depends on Epic 1 (Monorepo)  
**Last Updated:** 2025-08-16

## Executive Summary

Migrate from traditional REST API routes to tRPC for end-to-end type safety, better developer experience, and automatic API documentation. This migration will be done progressively to maintain backward compatibility.

## Problem Statement

Current API limitations:
- **No end-to-end type safety** between frontend and backend
- **Manual API documentation** maintenance
- **Runtime validation** errors instead of compile-time
- **Duplicate type definitions** for API contracts
- **No automatic client generation**

## Objectives

### Primary Goals
1. **Type Safety** - End-to-end type inference
2. **Progressive Migration** - No breaking changes
3. **Developer Experience** - Better autocomplete and validation
4. **API Documentation** - Auto-generated from types
5. **Performance** - Optimized data fetching

### Success Metrics
- Zero runtime type errors
- 100% API type coverage
- API response time <200ms
- No breaking changes
- Auto-generated documentation

## Implementation Strategy

### Phase 1: tRPC Setup [Days 1-3]

#### 1.1 Install and Configure (Day 1)
```typescript
// packages/api/trpc/index.ts
import { initTRPC } from '@trpc/server';
import { Context } from './context';

const t = initTRPC.context<Context>().create({
  errorFormatter: ({ shape, error }) => ({
    ...shape,
    data: {
      ...shape.data,
      zodError: error.cause instanceof ZodError 
        ? error.cause.flatten() 
        : null,
    },
  }),
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(authMiddleware);
```
- [ ] Install tRPC packages
- [ ] Setup context with auth
- [ ] Configure error handling
- [ ] Setup middleware
- [ ] Create base procedures

#### 1.2 Create App Router (Day 2)
```typescript
// app/api/trpc/[trpc]/route.ts
export const appRouter = router({
  auth: authRouter,
  profile: profileRouter,
  team: teamRouter,
  organization: organizationRouter,
  subscription: subscriptionRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
```
- [ ] Create router structure
- [ ] Setup Next.js adapter
- [ ] Configure CORS
- [ ] Add request logging
- [ ] Setup error boundaries

#### 1.3 Client Configuration (Day 3)
```typescript
// src/lib/trpc/client.ts
export const trpc = createTRPCNext<AppRouter>({
  config() {
    return {
      links: [
        httpBatchLink({
          url: '/api/trpc',
          headers: getAuthHeaders,
        }),
      ],
    };
  },
  ssr: true,
});
```
- [ ] Setup tRPC client
- [ ] Configure SSR
- [ ] Add auth headers
- [ ] Setup React Query
- [ ] Configure caching

### Phase 2: Router Implementation [Days 4-8]

#### 2.1 Auth Router (Day 4)
```typescript
export const authRouter = router({
  register: publicProcedure
    .input(registerSchema)
    .mutation(async ({ input, ctx }) => {
      return ctx.services.auth.register(input);
    }),
  
  login: publicProcedure
    .input(loginSchema)
    .mutation(async ({ input, ctx }) => {
      return ctx.services.auth.login(input);
    }),
  
  logout: protectedProcedure
    .mutation(async ({ ctx }) => {
      return ctx.services.auth.logout(ctx.user.id);
    }),
});
```
- [ ] Migrate registration
- [ ] Migrate login/logout
- [ ] Migrate password reset
- [ ] Migrate MFA endpoints
- [ ] Add rate limiting

#### 2.2 Profile Router (Day 5)
```typescript
export const profileRouter = router({
  get: protectedProcedure
    .query(async ({ ctx }) => {
      return ctx.services.profile.get(ctx.user.id);
    }),
  
  update: protectedProcedure
    .input(updateProfileSchema)
    .mutation(async ({ input, ctx }) => {
      return ctx.services.profile.update(ctx.user.id, input);
    }),
  
  uploadAvatar: protectedProcedure
    .input(z.object({ file: z.string() }))
    .mutation(async ({ input, ctx }) => {
      return ctx.services.profile.uploadAvatar(ctx.user.id, input.file);
    }),
});
```
- [ ] Migrate profile CRUD
- [ ] Migrate avatar upload
- [ ] Migrate privacy settings
- [ ] Add validation
- [ ] Test all endpoints

#### 2.3 Team Router (Day 6)
```typescript
export const teamRouter = router({
  list: protectedProcedure
    .query(async ({ ctx }) => {
      return ctx.services.team.getUserTeams(ctx.user.id);
    }),
  
  create: protectedProcedure
    .input(createTeamSchema)
    .mutation(async ({ input, ctx }) => {
      return ctx.services.team.create(input, ctx.user.id);
    }),
  
  invite: protectedProcedure
    .input(inviteSchema)
    .mutation(async ({ input, ctx }) => {
      return ctx.services.team.inviteMember(input);
    }),
});
```
- [ ] Migrate team CRUD
- [ ] Migrate invitations
- [ ] Migrate member management
- [ ] Add permission checks
- [ ] Test team flows

#### 2.4 Subscription Router (Day 7)
```typescript
export const subscriptionRouter = router({
  current: protectedProcedure
    .query(async ({ ctx }) => {
      return ctx.services.subscription.getCurrent(ctx.user.id);
    }),
  
  createCheckout: protectedProcedure
    .input(z.object({ priceId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      return ctx.services.payment.createCheckoutSession(
        ctx.user.id, 
        input.priceId
      );
    }),
  
  portal: protectedProcedure
    .mutation(async ({ ctx }) => {
      return ctx.services.payment.createPortalSession(ctx.user.id);
    }),
});
```
- [ ] Migrate subscription endpoints
- [ ] Migrate payment endpoints
- [ ] Add webhook handling
- [ ] Test payment flows
- [ ] Verify Stripe integration

#### 2.5 Admin Router (Day 8)
```typescript
export const adminRouter = router({
  users: adminProcedure
    .query(async ({ ctx }) => {
      return ctx.services.admin.listUsers();
    }),
  
  updateUserRole: adminProcedure
    .input(z.object({ 
      userId: z.string(), 
      role: z.enum(['admin', 'user']) 
    }))
    .mutation(async ({ input, ctx }) => {
      return ctx.services.admin.updateUserRole(input.userId, input.role);
    }),
});
```
- [ ] Migrate admin endpoints
- [ ] Add permission middleware
- [ ] Migrate analytics endpoints
- [ ] Test admin functions
- [ ] Add audit logging

### Phase 3: Frontend Migration [Days 9-12]

#### 3.1 Replace API Calls (Days 9-10)
```typescript
// Before
const response = await fetch('/api/profile', {
  method: 'GET',
  headers: { 'Authorization': `Bearer ${token}` }
});
const profile = await response.json();

// After
const { data: profile } = trpc.profile.get.useQuery();
```
- [ ] Replace auth API calls
- [ ] Replace profile API calls
- [ ] Replace team API calls
- [ ] Replace subscription calls
- [ ] Replace admin API calls

#### 3.2 Update State Management (Day 11)
```typescript
// Use tRPC mutations with optimistic updates
const updateProfile = trpc.profile.update.useMutation({
  onMutate: async (newProfile) => {
    // Optimistic update
    await queryClient.cancelQueries(['profile']);
    const previousProfile = queryClient.getQueryData(['profile']);
    queryClient.setQueryData(['profile'], newProfile);
    return { previousProfile };
  },
  onError: (err, newProfile, context) => {
    // Rollback on error
    queryClient.setQueryData(['profile'], context.previousProfile);
  },
  onSettled: () => {
    // Refetch after mutation
    queryClient.invalidateQueries(['profile']);
  },
});
```
- [ ] Add optimistic updates
- [ ] Configure cache invalidation
- [ ] Setup error handling
- [ ] Add loading states
- [ ] Test state synchronization

#### 3.3 Deprecate REST Endpoints (Day 12)
- [ ] Mark REST endpoints as deprecated
- [ ] Add migration warnings
- [ ] Update documentation
- [ ] Plan sunset timeline
- [ ] Notify API consumers

### Phase 4: Testing & Documentation [Days 13-14]

#### 4.1 Testing (Day 13)
- [ ] Unit test all procedures
- [ ] Integration test routers
- [ ] E2E test API flows
- [ ] Performance testing
- [ ] Security testing

#### 4.2 Documentation (Day 14)
- [ ] Generate API documentation
- [ ] Create migration guide
- [ ] Update developer docs
- [ ] Create usage examples
- [ ] Record training videos

## Technical Considerations

### Type Safety
- Zod schemas for input validation
- Automatic type inference
- Shared types between client/server
- Compile-time validation

### Performance
- Request batching
- Automatic retries
- Optimistic updates
- Smart caching

### Security
- Input validation
- Rate limiting per procedure
- Authentication middleware
- CORS configuration

## Migration Strategy

### Parallel Operation
1. Keep REST endpoints running
2. Implement tRPC alongside
3. Gradually migrate frontend
4. Monitor both systems
5. Deprecate REST after stability

### Rollback Plan
- Feature flag for tRPC
- Keep REST endpoints for 2 releases
- Monitor error rates
- Quick switch back if needed

## Risk Mitigation

| Risk | Impact | Mitigation | Contingency |
|------|--------|------------|-------------|
| Breaking changes | HIGH | Parallel operation | Keep REST endpoints |
| Performance regression | MEDIUM | Load testing | Optimize problem procedures |
| Type conflicts | LOW | Gradual migration | Fix types incrementally |
| Learning curve | MEDIUM | Team training | Pair programming |

## Success Criteria

- [ ] tRPC fully configured
- [ ] All critical endpoints migrated
- [ ] Zero runtime type errors
- [ ] API response time <200ms
- [ ] 100% type coverage
- [ ] Documentation generated
- [ ] Team trained on tRPC
- [ ] REST endpoints deprecated

## Dependencies

- Epic 1 (Monorepo) should be complete
- Services layer must be stable
- TypeScript compilation working

## Next Steps

After Epic 3 completion:
1. Monitor API performance
2. Gather developer feedback
3. Plan REST sunset
4. Consider GraphQL for specific use cases

---

*This migration provides end-to-end type safety and significantly improves the developer experience while maintaining backward compatibility.*