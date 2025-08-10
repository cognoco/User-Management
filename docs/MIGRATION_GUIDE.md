# Migration Guide: Service Container to Dependency Injection

## Overview

This guide helps you migrate from the old circular dependency-prone service container pattern to the new clean dependency injection architecture.

## Problem with Old Architecture

The old service container created circular dependencies:

```typescript
// OLD - Circular dependency problem
getServiceContainer() → creates services → services call getServiceContainer()
```

This made testing extremely difficult and created unpredictable singleton behavior.

## New Architecture Solution

The new architecture uses pure factory functions and dependency injection:

```typescript
// NEW - Clean dependency flow
createApiServices() → creates all services → injected into route handlers
```

## Migration Steps

### 1. Replace Service Container Usage

**Before:**
```typescript
import { getServiceContainer } from '@/lib/config/service-container';

export async function POST(request: NextRequest) {
  const container = getServiceContainer();
  const user = await container.userService.findByEmail(email);
  // ...
}
```

**After:**
```typescript
import { withValidatedServices } from '@/lib/api/with-services';

export const POST = withValidatedServices(
  ValidationSchema,
  async (services, data, request, context) => {
    const user = await services.user.findByEmail(data.email);
    // ...
  }
);
```

### 2. Update Service Creation

**Before:**
```typescript
// Circular dependency - service calls getServiceContainer
export class UserService {
  constructor() {
    this.container = getServiceContainer(); // CIRCULAR!
  }
}
```

**After:**
```typescript
// Clean dependency injection
export class UserService {
  constructor(
    private authService: AuthService,
    private dbService: DatabaseService
  ) {
    // Dependencies injected, no circular references
  }
}
```

### 3. Testing Improvements

**Before (20+ lines of setup):**
```typescript
const mockContainer = {
  authService: {
    login: jest.fn(),
    register: jest.fn(),
    // ... many more mocks
  },
  userService: {
    findByEmail: jest.fn(),
    // ... many more mocks
  },
  // ... setup for every service
};
jest.mock('@/lib/config/service-container', () => ({
  getServiceContainer: () => mockContainer
}));
```

**After (1 line):**
```typescript
const services = new ServiceTestHelper().setupSuccessfulAuth();
```

### 4. Route Migration Example

Here's a complete example of migrating a route:

**Old Route:**
```typescript
// app/api/auth/register/route.ts
import { getServiceContainer } from '@/lib/config/service-container';

export async function POST(request: NextRequest) {
  try {
    const container = getServiceContainer();
    const data = await request.json();
    
    // Manual validation
    if (!data.email || !data.password) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }
    
    const user = await container.authService.register(data);
    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
```

**New Route:**
```typescript
// app/api/auth/register-v2/route.ts
import { withValidatedServices } from '@/lib/api/with-services';
import { z } from 'zod';

const RegistrationSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  // ... other fields
});

export const POST = withValidatedServices(
  RegistrationSchema,
  async (services, data, request, context) => {
    const user = await services.auth.register(data);
    return createSuccessResponse({ user }, 201);
  }
);
```

## Benefits of Migration

### 1. No Circular Dependencies
- Services are created in explicit dependency order
- No more "Cannot access before initialization" errors
- Predictable initialization

### 2. Simplified Testing
```typescript
// Test setup reduced from 20+ lines to 1 line
const services = new ServiceTestHelper().setupSuccessfulAuth();
```

### 3. Type Safety
- Full TypeScript support throughout
- Validated request data is properly typed
- Service interfaces are explicit

### 4. Clean Architecture
- Clear separation of concerns
- Services don't know about the container
- Dependencies are explicit and injected

## Migration Checklist

- [ ] Install new dependencies (`zod` for validation)
- [ ] Create service factory (`/lib/services/factory.ts`)
- [ ] Create route helpers (`/lib/api/with-services.ts`)
- [ ] Create test utilities (`/tests/utils/test-service-factory.ts`)
- [ ] Migrate routes one by one
- [ ] Update tests to use new test helpers
- [ ] Remove old service container once all routes are migrated

## Common Patterns

### Pattern 1: Simple Route
```typescript
export const GET = withServices(async (services, request, context) => {
  const users = await services.user.findAll();
  return createSuccessResponse({ users });
});
```

### Pattern 2: Validated Route
```typescript
export const POST = withValidatedServices(
  Schema,
  async (services, data, request, context) => {
    // data is validated and typed
    const result = await services.someService.doSomething(data);
    return createSuccessResponse({ result });
  }
);
```

### Pattern 3: Optional Services
```typescript
export const POST = withValidatedServices(
  Schema,
  async (services, data, request, context) => {
    const user = await services.user.create(data);
    
    // Optional audit logging
    if (services.audit) {
      await services.audit.logEvent({
        action: 'USER_CREATED',
        userId: user.id
      });
    }
    
    return createSuccessResponse({ user });
  }
);
```

## Troubleshooting

### Issue: "Cannot find services"
**Solution:** Make sure you're importing from the new locations:
- Factory: `@/lib/services/factory`
- Helpers: `@/lib/api/with-services`
- Test utils: `@/tests/utils/test-service-factory`

### Issue: "Type errors in tests"
**Solution:** Use the ServiceTestHelper to create properly typed mock services:
```typescript
const helper = new ServiceTestHelper();
const services = helper.createMockServices();
```

### Issue: "Service not available"
**Solution:** Check if the service is optional and handle accordingly:
```typescript
if (services.notification) {
  await services.notification.sendEmail(...);
}
```

## Support

For questions or issues during migration:
1. Check the example migrated route: `/app/api/auth/register-v2/route.ts`
2. Review test examples: `/tests/utils/test-service-factory.ts`
3. Consult the service factory: `/lib/services/factory.ts`

## Next Steps

After migration:
1. Remove the old service container file
2. Update CI/CD to run new tests
3. Monitor for any edge cases
4. Document any custom patterns your team develops