# Epic 3: tRPC Migration

**Duration:** 2 weeks  
**Priority:** High - API modernization for type safety  
**Epic Owner:** Backend & API Team  
**Status:** Not Started  
**Prerequisites:** Epic 1 (Monorepo) and Epic 2 (Component Library) must be complete

## Executive Summary

tRPC Migration replaces the existing REST API routes with type-safe tRPC procedures, enabling end-to-end type safety from database to UI components. This epic modernizes the API layer to support the pluggable platform vision while providing superior developer experience and runtime safety.

**Key Insight:** We're not just changing the API format - we're enabling a completely type-safe development experience where API contracts are enforced at compile time.

## Problem Statement

Current REST API architecture blocks type safety and developer productivity:
- **No type safety**: Frontend and backend can drift apart silently
- **Manual API contracts**: OpenAPI schemas require manual maintenance
- **Runtime errors**: Type mismatches discovered only at runtime
- **Poor developer experience**: No IntelliSense for API calls
- **SDK development blocked**: Cannot create type-safe client SDK

## Objectives

### Primary Goal
Create a fully type-safe API layer:
- End-to-end TypeScript types from database to UI
- Compile-time API contract validation
- Automatic client-side query/mutation hooks
- Real-time type checking in development

### Secondary Goals
- Maintain backward compatibility during transition
- Improve API performance and caching
- Enable automatic API documentation generation
- Create foundation for SDK development

## Success Criteria

### Critical Success Factors
- [ ] 🔒 **Type Safety**: End-to-end types from DB to UI with zero `any`
- [ ] 🚀 **Performance**: API response times equal or better than REST
- [ ] 🔄 **Compatibility**: Gradual migration without breaking existing functionality
- [ ] 📚 **Documentation**: Auto-generated API docs from TypeScript types
- [ ] 🛠️ **Developer Experience**: IntelliSense and compile-time validation
- [ ] 🧪 **Testing**: All existing API tests pass with new implementation

### Quality Gates
1. All API endpoints available as tRPC procedures
2. Frontend components use tRPC hooks exclusively
3. Type errors caught at compile time, not runtime
4. API documentation auto-generates from types
5. SDK generation is possible from tRPC router

## Target tRPC Architecture

```
apps/user-mgmt/src/
├── server/
│   ├── trpc/
│   │   ├── context.ts           # Request context setup
│   │   ├── router.ts            # Main tRPC router
│   │   ├── procedures/          # Reusable procedure factories
│   │   │   ├── auth.ts          # Auth middleware procedures
│   │   │   ├── admin.ts         # Admin-only procedures
│   │   │   └── public.ts        # Public procedures
│   │   └── routers/             # Feature-specific routers
│   │       ├── auth.ts          # Authentication procedures
│   │       ├── user.ts          # User management
│   │       ├── admin.ts         # Admin operations
│   │       ├── billing.ts       # Subscription & billing
│   │       └── organization.ts  # Team/org management
│   └── api/
│       └── trpc/
│           └── [trpc]/
│               └── route.ts     # Next.js API route handler
├── lib/
│   ├── trpc/
│   │   ├── client.ts            # tRPC client setup
│   │   ├── react.tsx            # React Query integration
│   │   └── types.ts             # Shared type exports
│   └── schemas/                 # Zod validation schemas
│       ├── auth.ts
│       ├── user.ts
│       └── admin.ts
└── hooks/                       # Generated tRPC hooks
    └── api.ts                   # Auto-generated API hooks
```

## Detailed Task Breakdown

### Task 3.1: tRPC Infrastructure Setup
**Owner:** Backend Architecture Team  
**Duration:** 3 days  
**Priority:** Critical

#### Day 1: Core tRPC Setup

**Context Configuration**
```typescript
// apps/user-mgmt/src/server/trpc/context.ts
import { getServerSession } from 'next-auth';
import { db } from '@/lib/database';
import type { Session } from 'next-auth';

export interface CreateContextOptions {
  session: Session | null;
  req?: NextRequest;
}

export const createTRPCContext = async (opts: {
  req: NextRequest;
}): Promise<CreateContextOptions> => {
  const session = await getServerSession();
  
  return {
    session,
    req: opts.req,
    db, // Database client
  };
};

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;
```

**Base tRPC Configuration**
```typescript
// apps/user-mgmt/src/server/trpc/router.ts
import { initTRPC, TRPCError } from '@trpc/server';
import { ZodError } from 'zod';
import type { Context } from './context';

const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const router = t.router;
export const middleware = t.middleware;
export const publicProcedure = t.procedure;
```

#### Day 2: Authentication Middleware
```typescript
// apps/user-mgmt/src/server/trpc/procedures/auth.ts
const isAuthenticated = middleware(async ({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  
  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      user: ctx.session.user,
    },
  });
});

const isAdmin = middleware(async ({ ctx, next }) => {
  if (!ctx.session?.user?.roles?.includes('admin')) {
    throw new TRPCError({ code: 'FORBIDDEN' });
  }
  
  return next({
    ctx: {
      ...ctx,
      user: ctx.session.user,
    },
  });
});

export const protectedProcedure = publicProcedure.use(isAuthenticated);
export const adminProcedure = protectedProcedure.use(isAdmin);
```

#### Day 3: Client Setup & React Integration
```typescript
// apps/user-mgmt/src/lib/trpc/client.ts
import { httpBatchLink } from '@trpc/client';
import { createTRPCNext } from '@trpc/next';
import type { AppRouter } from '@/server/trpc/router';

export const trpc = createTRPCNext<AppRouter>({
  config() {
    return {
      links: [
        httpBatchLink({
          url: '/api/trpc',
          headers() {
            return {
              'x-trpc-source': 'nextjs-react',
            };
          },
        }),
      ],
    };
  },
});
```

#### Acceptance Criteria
- [ ] tRPC server initialized with proper context
- [ ] Authentication middleware working
- [ ] Client-server connection established
- [ ] Basic procedure can be called from frontend

---

### Task 3.2: Authentication Router Migration
**Owner:** Auth Team  
**Duration:** 3 days  
**Priority:** Critical

#### Auth Schema Definitions
```typescript
// apps/user-mgmt/src/lib/schemas/auth.ts
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  rememberMe: z.boolean().optional().default(false),
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[A-Z])(?=.*[0-9])/, 'Password must contain uppercase and number'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  acceptTerms: z.boolean().refine(val => val === true, 'Must accept terms'),
});

export const passwordResetSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const updatePasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});
```

#### Authentication Procedures
```typescript
// apps/user-mgmt/src/server/trpc/routers/auth.ts
import { router, publicProcedure, protectedProcedure } from '../router';
import { 
  loginSchema, 
  registerSchema, 
  passwordResetSchema,
  updatePasswordSchema 
} from '@/lib/schemas/auth';
import { authService } from '@/services/auth';

export const authRouter = router({
  login: publicProcedure
    .input(loginSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await authService.login(input);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: result.error || 'Invalid credentials',
        });
      }
      
      return {
        user: result.user,
        session: result.session,
      };
    }),

  register: publicProcedure
    .input(registerSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const result = await authService.register(input);
        
        return {
          user: result.user,
          message: 'Registration successful. Please check your email for verification.',
        };
      } catch (error) {
        if (error.code === 'EMAIL_EXISTS') {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'An account with this email already exists',
          });
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Registration failed',
        });
      }
    }),

  logout: protectedProcedure
    .mutation(async ({ ctx }) => {
      await authService.logout(ctx.user.id);
      return { success: true };
    }),

  me: protectedProcedure
    .query(async ({ ctx }) => {
      return ctx.user;
    }),

  requestPasswordReset: publicProcedure
    .input(passwordResetSchema)
    .mutation(async ({ input }) => {
      await authService.requestPasswordReset(input.email);
      // Always return success to prevent email enumeration
      return { 
        message: 'If an account exists, a reset link has been sent to your email.' 
      };
    }),

  updatePassword: publicProcedure
    .input(updatePasswordSchema)
    .mutation(async ({ input }) => {
      const result = await authService.updatePasswordWithToken(
        input.token, 
        input.password
      );
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid or expired reset token',
        });
      }
      
      return { message: 'Password updated successfully' };
    }),
});
```

#### Frontend Integration
```typescript
// Example usage in components
const LoginForm = () => {
  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      // Handle successful login
      router.push('/dashboard');
    },
    onError: (error) => {
      // Handle login error
      setError(error.message);
    },
  });

  const handleSubmit = (formData: LoginFormData) => {
    loginMutation.mutate(formData);
  };

  return (
    // Form implementation with full type safety
    // TypeScript knows exact shape of formData and error types
  );
};
```

#### Acceptance Criteria
- [ ] All auth endpoints migrated to tRPC
- [ ] Frontend auth forms use tRPC hooks
- [ ] Type safety validated for auth flows
- [ ] Error handling properly typed
- [ ] Existing auth tests pass

---

### Task 3.3: User Management Router Migration
**Owner:** User Management Team  
**Duration:** 3 days  
**Priority:** High

#### User Schema Definitions
```typescript
// apps/user-mgmt/src/lib/schemas/user.ts
export const updateProfileSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  bio: z.string().max(500).optional(),
  website: z.string().url().optional(),
  isPublic: z.boolean().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

export const updateEmailSchema = z.object({
  newEmail: z.string().email('Invalid email address'),
});
```

#### User Management Procedures
```typescript
// apps/user-mgmt/src/server/trpc/routers/user.ts
export const userRouter = router({
  getProfile: protectedProcedure
    .query(async ({ ctx }) => {
      const profile = await userService.getProfile(ctx.user.id);
      return profile;
    }),

  updateProfile: protectedProcedure
    .input(updateProfileSchema)
    .mutation(async ({ input, ctx }) => {
      const updatedProfile = await userService.updateProfile(
        ctx.user.id, 
        input
      );
      return updatedProfile;
    }),

  changePassword: protectedProcedure
    .input(changePasswordSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await userService.changePassword(
        ctx.user.id,
        input.currentPassword,
        input.newPassword
      );
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Current password is incorrect',
        });
      }
      
      return { message: 'Password changed successfully' };
    }),

  requestEmailChange: protectedProcedure
    .input(updateEmailSchema)
    .mutation(async ({ input, ctx }) => {
      await userService.requestEmailChange(ctx.user.id, input.newEmail);
      return { 
        message: 'Verification email sent to new address' 
      };
    }),

  deleteAccount: protectedProcedure
    .mutation(async ({ ctx }) => {
      await userService.deleteAccount(ctx.user.id);
      return { message: 'Account deleted successfully' };
    }),

  getActivity: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input, ctx }) => {
      return await userService.getActivity(ctx.user.id, input);
    }),

  getSessions: protectedProcedure
    .query(async ({ ctx }) => {
      return await userService.getSessions(ctx.user.id);
    }),

  revokeSession: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await userService.revokeSession(ctx.user.id, input.sessionId);
      return { message: 'Session revoked successfully' };
    }),
});
```

#### Acceptance Criteria
- [ ] All user management endpoints migrated
- [ ] Profile update forms use tRPC
- [ ] Password change flow fully typed
- [ ] Session management working
- [ ] Activity logs properly typed

---

### Task 3.4: Admin Router Migration
**Owner:** Admin Team  
**Duration:** 2 days  
**Priority:** Medium

#### Admin Procedures
```typescript
// apps/user-mgmt/src/server/trpc/routers/admin.ts
export const adminRouter = router({
  getUsers: adminProcedure
    .input(z.object({
      search: z.string().optional(),
      role: z.enum(['admin', 'user']).optional(),
      status: z.enum(['active', 'suspended', 'pending']).optional(),
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input }) => {
      return await adminService.getUsers(input);
    }),

  getUserById: adminProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      return await adminService.getUserById(input.userId);
    }),

  updateUserRole: adminProcedure
    .input(z.object({
      userId: z.string(),
      role: z.enum(['admin', 'user']),
    }))
    .mutation(async ({ input }) => {
      await adminService.updateUserRole(input.userId, input.role);
      return { message: 'User role updated successfully' };
    }),

  suspendUser: adminProcedure
    .input(z.object({
      userId: z.string(),
      reason: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      await adminService.suspendUser(input.userId, input.reason);
      return { message: 'User suspended successfully' };
    }),

  getAuditLogs: adminProcedure
    .input(z.object({
      userId: z.string().optional(),
      action: z.string().optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input }) => {
      return await adminService.getAuditLogs(input);
    }),
});
```

#### Acceptance Criteria
- [ ] Admin panel API fully migrated
- [ ] User management interface typed
- [ ] Audit log queries working
- [ ] Admin permissions enforced

---

### Task 3.5: Frontend Integration & Hook Generation
**Owner:** Frontend Team  
**Duration:** 3 days  
**Priority:** Critical

#### Component Integration Example
```typescript
// Before (REST API)
const ProfileForm = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    fetch('/api/user/profile')
      .then(res => res.json())
      .then(setProfile);
  }, []);
  
  const handleUpdate = async (data: any) => {
    setLoading(true);
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      // Handle response...
    } catch (error) {
      // Handle error...
    } finally {
      setLoading(false);
    }
  };
};

// After (tRPC)
const ProfileForm = () => {
  const { data: profile, isLoading } = trpc.user.getProfile.useQuery();
  
  const updateProfileMutation = trpc.user.updateProfile.useMutation({
    onSuccess: () => {
      // Invalidate and refetch
      trpc.user.getProfile.invalidate();
      toast.success('Profile updated successfully');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const handleUpdate = (data: UpdateProfileInput) => {
    // TypeScript ensures data matches schema exactly
    updateProfileMutation.mutate(data);
  };
  
  // Full type safety throughout
};
```

#### Optimistic Updates Pattern
```typescript
const useOptimisticProfile = () => {
  const utils = trpc.useUtils();
  
  const updateProfile = trpc.user.updateProfile.useMutation({
    onMutate: async (newProfile) => {
      // Cancel outgoing refetches
      await utils.user.getProfile.cancel();
      
      // Snapshot previous value
      const previousProfile = utils.user.getProfile.getData();
      
      // Optimistically update
      utils.user.getProfile.setData(undefined, (old) => ({
        ...old,
        ...newProfile,
      }));
      
      return { previousProfile };
    },
    onError: (err, newProfile, context) => {
      // Rollback on error
      utils.user.getProfile.setData(undefined, context?.previousProfile);
    },
    onSettled: () => {
      // Refetch after success or error
      utils.user.getProfile.invalidate();
    },
  });
  
  return updateProfile;
};
```

#### Error Handling Patterns
```typescript
// Global error handling
const TRPCProvider = ({ children }: { children: React.ReactNode }) => {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => {
          // Don't retry on auth errors
          if (error.data?.code === 'UNAUTHORIZED') {
            return false;
          }
          return failureCount < 3;
        },
      },
    },
  }));

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
};
```

#### Acceptance Criteria
- [ ] All components migrated to tRPC hooks
- [ ] Optimistic updates working
- [ ] Error handling properly typed
- [ ] Loading states managed correctly
- [ ] Cache invalidation strategies working

## Migration Strategy

### Gradual Migration Approach
1. **Phase 1**: Set up tRPC infrastructure alongside existing REST
2. **Phase 2**: Migrate auth endpoints (highest priority)
3. **Phase 3**: Migrate user management endpoints
4. **Phase 4**: Migrate admin endpoints
5. **Phase 5**: Remove old REST endpoints

### Backward Compatibility
```typescript
// Maintain REST endpoints during transition
// apps/user-mgmt/app/api/auth/login/route.ts
export async function POST(request: Request) {
  const body = await request.json();
  
  // Use same service as tRPC procedure
  const result = await authService.login(body);
  
  return NextResponse.json(result);
}
```

### Testing Strategy
```typescript
// Test tRPC procedures directly
describe('Auth Router', () => {
  it('should login with valid credentials', async () => {
    const caller = createCaller({
      session: null,
      db: mockDb,
    });
    
    const result = await caller.auth.login({
      email: 'test@example.com',
      password: 'password123',
    });
    
    expect(result.user.email).toBe('test@example.com');
  });
});
```

## Performance Considerations

### Request Batching
```typescript
// tRPC automatically batches requests
const Component = () => {
  // These will be batched into a single HTTP request
  const user = trpc.user.getProfile.useQuery();
  const sessions = trpc.user.getSessions.useQuery();
  const activity = trpc.user.getActivity.useQuery();
};
```

### Caching Strategy
```typescript
// Smart caching with React Query
const Component = () => {
  const profile = trpc.user.getProfile.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
};
```

### Bundle Size Optimization
- Tree-shaking unused procedures
- Code splitting by router
- Lazy loading admin procedures

## Documentation Generation

### Auto-generated API Docs
```typescript
// Generate OpenAPI spec from tRPC router
import { generateOpenApiDocument } from 'trpc-openapi';
import { appRouter } from './server/trpc/router';

export const openApiDocument = generateOpenApiDocument(appRouter, {
  title: 'User Management API',
  version: '1.0.0',
  baseUrl: 'https://api.example.com',
});
```

### Type Documentation
```typescript
// Export types for external use
export type { 
  LoginInput,
  RegisterInput,
  UserProfile,
  AdminUser 
} from './server/trpc/router';
```

## Risk Assessment

### High Risk Items
1. **Migration Complexity**
   - Risk: Breaking existing functionality during migration
   - Mitigation: Gradual migration with parallel systems
   - Contingency: Quick rollback to REST endpoints

2. **Performance Regression**
   - Risk: tRPC overhead impacts response times
   - Mitigation: Performance testing and monitoring
   - Benchmarks: Target same or better performance

### Medium Risk Items
1. **Type Complexity**
   - Risk: Complex types become unwieldy
   - Mitigation: Keep schemas simple and focused
   - Review: Regular type complexity audits

2. **Bundle Size**
   - Risk: tRPC client increases bundle size
   - Mitigation: Tree-shaking and code splitting
   - Monitoring: Bundle size analysis

## Definition of Done

### Technical Completion
- [ ] All API endpoints available as tRPC procedures
- [ ] Frontend uses tRPC hooks exclusively
- [ ] Type safety validated end-to-end
- [ ] Performance meets or exceeds REST API
- [ ] Error handling properly implemented

### Quality Assurance
- [ ] All existing API tests pass
- [ ] New tRPC-specific tests added
- [ ] Type coverage >95%
- [ ] Documentation auto-generates correctly

### User Acceptance
- [ ] No functionality regressions
- [ ] Better developer experience confirmed
- [ ] API documentation meets standards
- [ ] Ready for SDK generation

## Success Metrics

### Quantitative Measures
- **Type Safety**: 100% typed API surface
- **Performance**: API response times ≤ REST baseline
- **Bundle Size**: tRPC overhead <10KB gzipped
- **Developer Productivity**: 50% fewer API-related bugs

### Qualitative Measures
- **Developer Experience**: IntelliSense and compile-time validation
- **Maintainability**: API contracts enforced by types
- **Documentation**: Auto-generated, always up-to-date
- **SDK Readiness**: Foundation for external SDK

## Next Steps After Completion

1. **Epic 3 Retrospective**: tRPC migration lessons learned
2. **Epic 4 Planning**: SDK development using tRPC types
3. **Performance Optimization**: Based on real-world usage
4. **Advanced Features**: Subscriptions, streaming, webhooks

---

**Key Success Factor: This epic enables type-safe development across the entire stack, catching errors at compile time instead of runtime and providing the foundation for a world-class SDK.**