# API Route Test Fix Pattern

## Problem
After migrating API routes from `createApiHandler` to `withValidatedServices`, many tests are failing because they were designed for the old pattern.

## Solution
Mock the `ServiceLocator` instead of trying to mock `withValidatedServices` directly. This avoids circular dependencies and allows the actual validation wrapper to run with mock services.

## Files That Need Fixing (28 total)

### Already Fixed (2)
- ✅ app/api/2fa/webauthn/register/__tests__/route.test.ts
- ✅ app/api/2fa/webauthn/verify/__tests__/route.test.ts

### Need Fixing (26)
- app/api/admin/saved-searches/__tests__/route.test.ts
- app/api/admin/users/__tests__/route.test.ts
- app/api/admin/users/search/__tests__/route.test.ts
- app/api/auth/delete-account/__tests__/route.test.ts
- app/api/auth/login/__tests__/route.test.ts
- app/api/auth/logout/__tests__/route.test.ts
- app/api/auth/magic-link/__tests__/route.test.ts
- app/api/auth/magic-link/verify/__tests__/route.test.ts
- app/api/auth/password/reset/__tests__/route.test.ts
- app/api/auth/password/update/__tests__/route.test.ts
- app/api/auth/refresh/__tests__/route.test.ts
- app/api/auth/register/__tests__/route.test.ts
- app/api/auth/resend-verification/__tests__/route.test.ts
- app/api/auth/session/__tests__/route.test.ts
- app/api/auth/sessions/__tests__/route.test.ts
- app/api/auth/verify-email/__tests__/route.test.ts
- app/api/auth/verify-token/__tests__/route.test.ts
- app/api/company-notifications/__tests__/route.test.ts
- app/api/company-notifications/[id]/__tests__/route.test.ts
- app/api/company/__tests__/route.test.ts
- app/api/company/[id]/__tests__/route.test.ts
- app/api/permissions/check/__tests__/route.test.ts
- app/api/permissions/user/__tests__/route.test.ts
- app/api/subscription/cancel/__tests__/route.test.ts
- app/api/subscription/history/__tests__/route.test.ts
- app/api/subscription/reactivate/__tests__/route.test.ts

## The Fix Pattern

### Step 1: Mock the ServiceLocator
Add this mock BEFORE importing the route:

```typescript
// Mock the service locator to avoid initialization issues
vi.mock('@/lib/config/service-locator', () => ({
  ServiceLocator: {
    getInstance: vi.fn(() => ({
      has: vi.fn(() => true),
      get: vi.fn((key) => {
        // Return appropriate mock service based on key
        if (key.includes('AUTH')) return mockAuthService;
        if (key.includes('USER')) return mockUserService;
        // etc...
        return {};
      })
    }))
  },
  ServiceKeys: {
    AUTH_SERVICE: 'auth',
    USER_SERVICE: 'user',
    // Add other service keys as needed
  }
}));
```

### Step 2: Create Mock Services
Define the mock services your test needs:

```typescript
const mockAuthService = {
  login: vi.fn(),
  logout: vi.fn(),
  // Add methods your test uses
};
```

### Step 3: Mock Common Dependencies
```typescript
vi.mock('@/lib/api/common', () => ({
  createSuccessResponse: vi.fn((data) => Response.json(data)),
  createErrorResponse: vi.fn((error) => 
    Response.json({ error: error.message }, { status: error.status })
  ),
  ApiError: class ApiError extends Error {
    constructor(public code: string, message: string, public status: number) {
      super(message);
    }
  },
  ERROR_CODES: {
    INVALID_REQUEST: 'INVALID_REQUEST',
    // Add other codes as needed
  }
}));
```

### Step 4: Remove Old Mocks
Remove any mocks for:
- `withValidatedServices` 
- `@/lib/config/service-container`
- Direct service mocks that conflict

### Step 5: Import and Test
```typescript
import { POST, GET, PUT, DELETE } from '../route';

// Your tests...
```

## Example: Fixed WebAuthn Test

See `app/api/2fa/webauthn/register/__tests__/route.test.ts` for a complete example of the fixed pattern.

## Why This Works

1. **No Circular Dependencies**: We mock at the ServiceLocator level, not the wrapper level
2. **Real Validation**: The actual `withValidatedServices` runs, performing its validation
3. **Controlled Services**: We provide mock services through the locator
4. **Type Safety**: The pattern maintains TypeScript types

## Testing the Fix

Run the fixed test:
```bash
npm test -- app/api/2fa/webauthn/register/__tests__/route.test.ts
```

If successful, you should see the test pass with mocked service calls.

## Notes

- The vitest environment in the codespace appears to hang, but tests work locally
- Each test file needs individual fixing - no batch script due to file variations
- Ensure all service methods used by the route are mocked