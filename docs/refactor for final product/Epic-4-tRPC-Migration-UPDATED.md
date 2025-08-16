# Epic 4: tRPC Migration (UPDATED)

**Duration:** 2 weeks  
**Priority:** HIGH - Enables type safety  
**Epic Owner:** Full Stack Team  
**Status:** Ready after Epic 1  
**Prerequisites:** Epic 1 (Monorepo) complete  
**Last Updated:** 2025-08-16

## Executive Summary

Originally "Epic 3" in the plan, this has been renumbered to Epic 4. The tRPC migration will provide end-to-end type safety between frontend and backend, replacing the current REST API routes while maintaining backward compatibility during transition.

## Current State Analysis

### What We Have
- ✅ Well-structured API routes in `/app/api/`
- ✅ Good service layer abstraction
- ✅ TypeScript throughout
- ❌ No type safety between client/server
- ❌ Manual API contract maintenance
- ❌ Duplicated validation logic

### Migration Benefits
1. **Type Safety**: Single source of truth for API contracts
2. **Developer Experience**: Auto-completion and type checking
3. **Reduced Bugs**: Compile-time API contract validation
4. **Less Code**: No manual type definitions for APIs
5. **Better Performance**: Automatic batching of requests

## Migration Strategy

### Parallel Implementation Approach
We'll run tRPC alongside existing REST APIs to ensure zero downtime and gradual migration.

```typescript
// app/api/trpc/[trpc]/route.ts
// tRPC runs at /api/trpc/*

// app/api/auth/login/route.ts  
// Existing REST endpoints remain at /api/*
```

## Implementation Plan

### Week 1: Core Setup & Critical Paths

#### Day 1-2: tRPC Infrastructure
```typescript
// packages/@pump/api/src/trpc.ts
import { initTRPC, TRPCError } from '@trpc/server';
import { type Context } from './context';

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError 
          ? error.cause.flatten() 
          : null,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(isAuthenticated);
```

#### Day 3-4: Authentication Router
```typescript
// packages/@pump/api/src/routers/auth.ts
export const authRouter = router({
  register: publicProcedure
    .input(RegisterSchema)
    .mutation(async ({ input, ctx }) => {
      return ctx.services.auth.register(input);
    }),
    
  login: publicProcedure
    .input(LoginSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await ctx.services.auth.login(input);
      ctx.setSession(result.session);
      return result.user;
    }),
    
  logout: protectedProcedure
    .mutation(async ({ ctx }) => {
      await ctx.services.auth.logout(ctx.session.userId);
      ctx.clearSession();
    }),
    
  me: protectedProcedure
    .query(async ({ ctx }) => {
      return ctx.services.user.getById(ctx.session.userId);
    }),
});
```

#### Day 5: Profile & User Routers
```typescript
// packages/@pump/api/src/routers/profile.ts
export const profileRouter = router({
  get: protectedProcedure
    .query(async ({ ctx }) => {
      return ctx.services.profile.getByUserId(ctx.session.userId);
    }),
    
  update: protectedProcedure
    .input(UpdateProfileSchema)
    .mutation(async ({ input, ctx }) => {
      return ctx.services.profile.update(ctx.session.userId, input);
    }),
    
  uploadAvatar: protectedProcedure
    .input(z.object({ 
      file: z.instanceof(File),
      mimeType: z.enum(['image/jpeg', 'image/png'])
    }))
    .mutation(async ({ input, ctx }) => {
      return ctx.services.profile.updateAvatar(
        ctx.session.userId, 
        input.file
      );
    }),
});
```

### Week 2: Complete Migration

#### Day 6-7: Team & Permissions
```typescript
// packages/@pump/api/src/routers/team.ts
export const teamRouter = router({
  list: protectedProcedure
    .query(async ({ ctx }) => {
      return ctx.services.team.getUserTeams(ctx.session.userId);
    }),
    
  create: protectedProcedure
    .input(CreateTeamSchema)
    .mutation(async ({ input, ctx }) => {
      return ctx.services.team.create({
        ...input,
        ownerId: ctx.session.userId
      });
    }),
    
  invite: protectedProcedure
    .input(InviteSchema)
    .use(hasPermission('team:invite'))
    .mutation(async ({ input, ctx }) => {
      return ctx.services.team.inviteMember(input);
    }),
});
```

#### Day 8: Subscription & Billing
```typescript
// packages/@pump/api/src/routers/subscription.ts
export const subscriptionRouter = router({
  current: protectedProcedure
    .query(async ({ ctx }) => {
      return ctx.services.subscription.getByUserId(ctx.session.userId);
    }),
    
  createCheckout: protectedProcedure
    .input(z.object({ priceId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      return ctx.services.subscription.createCheckoutSession(
        ctx.session.userId,
        input.priceId
      );
    }),
    
  portal: protectedProcedure
    .mutation(async ({ ctx }) => {
      return ctx.services.subscription.createPortalSession(
        ctx.session.userId
      );
    }),
});
```

#### Day 9-10: Client Migration
```typescript
// packages/@pump/client/src/trpc.ts
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@pump/api';

export const trpc = createTRPCReact<AppRouter>();

// Usage in components
function ProfilePage() {
  const { data: profile, isLoading } = trpc.profile.get.useQuery();
  const updateProfile = trpc.profile.update.useMutation();
  
  // Type-safe throughout!
  const handleUpdate = async (data: UpdateProfileInput) => {
    await updateProfile.mutateAsync(data);
  };
}
```

## Migration Checklist

### API Routes to Migrate
- [ ] `/api/auth/*` → `trpc.auth.*`
- [ ] `/api/profile/*` → `trpc.profile.*`
- [ ] `/api/team/*` → `trpc.team.*`
- [ ] `/api/subscription/*` → `trpc.subscription.*`
- [ ] `/api/admin/*` → `trpc.admin.*`
- [ ] `/api/notifications/*` → `trpc.notifications.*`
- [ ] `/api/settings/*` → `trpc.settings.*`

### Components to Update
- [ ] Authentication forms
- [ ] Profile management
- [ ] Team management
- [ ] Subscription flows
- [ ] Admin dashboard
- [ ] Settings pages

## Backward Compatibility

### Dual API Period (2 weeks)
```typescript
// Keep REST endpoint
app.post('/api/auth/login', loginHandler);

// Add tRPC endpoint
trpcRouter.auth.login(loginProcedure);

// Frontend can use either:
// REST: await fetch('/api/auth/login', ...)
// tRPC: await trpc.auth.login.mutate(...)
```

### Deprecation Timeline
1. Week 1-2: Both APIs available
2. Week 3: Console warnings for REST usage
3. Week 4: REST marked deprecated
4. Month 2: REST endpoints removed

## Type Safety Benefits

### Before (REST)
```typescript
// Manual type definitions
interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  user: User;
  token: string;
}

// No compile-time validation
const response = await fetch('/api/auth/login', {
  body: JSON.stringify({ email, pass }) // Wrong field!
});
```

### After (tRPC)
```typescript
// Automatic type inference
const { user } = await trpc.auth.login.mutate({
  email,
  pass // TypeScript error: Object literal may only specify known properties
});
```

## Performance Optimizations

### Request Batching
```typescript
// Multiple queries batched automatically
const [profile, teams, subscription] = await Promise.all([
  trpc.profile.get.query(),
  trpc.team.list.query(),
  trpc.subscription.current.query(),
]);
// Sent as single HTTP request!
```

### Subscription Support
```typescript
// Real-time updates
trpc.notifications.onNew.useSubscription(undefined, {
  onData(notification) {
    toast.show(notification.message);
  },
});
```

## Testing Strategy

### Unit Tests
```typescript
// packages/@pump/api/src/routers/__tests__/auth.test.ts
describe('authRouter', () => {
  it('registers new user', async () => {
    const caller = createCaller({ services: mockServices });
    const user = await caller.auth.register({
      email: 'test@example.com',
      password: 'SecurePass123!'
    });
    expect(user.email).toBe('test@example.com');
  });
});
```

### E2E Tests
```typescript
// e2e/auth.spec.ts
test('login flow', async ({ page }) => {
  // tRPC client automatically typed in tests
  const client = createTestClient();
  await client.auth.login.mutate({
    email: 'test@example.com',
    password: 'password'
  });
});
```

## Success Criteria

### Must Have
- [ ] All API routes migrated to tRPC
- [ ] Full type safety client to server
- [ ] No regression in functionality
- [ ] Performance equal or better
- [ ] All tests passing

### Should Have
- [ ] Request batching enabled
- [ ] Error handling standardized
- [ ] Development tools integrated
- [ ] Monitoring configured

## Definition of Done

- [ ] All REST endpoints have tRPC equivalents
- [ ] Frontend fully migrated to tRPC client
- [ ] Zero TypeScript errors
- [ ] API documentation generated
- [ ] Performance benchmarks passed
- [ ] Security review completed
- [ ] Team trained on tRPC

---

*This epic provides the foundation for a truly type-safe application stack.*