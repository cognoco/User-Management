# Complete Error Handling Documentation

This document consolidates all error handling information for the User Management module, combining architecture, guidelines, implementation, and reference information.

---

## Table of Contents
1. [Philosophy & Architecture](#philosophy--architecture)
2. [Error Flow Through Layers](#error-flow-through-layers)
3. [Implementation Guidelines](#implementation-guidelines)
4. [Error Code Reference](#error-code-reference)
5. [Review & Monitoring Process](#review--monitoring-process)
6. [Developer Guide](#developer-guide)

---

## Philosophy & Architecture

Errors are first-class objects in this system. They carry unique codes, human-friendly messages, and enough context to allow graceful recovery. The same structure is used on both server and client, enabling consistent logging, serialization, and rehydration.

### Core Architecture

| Module | Purpose |
|--------|---------|
| `src/core/common/errors.ts` | Defines the `ApplicationError` hierarchy and serialization helpers |
| `src/lib/api/common/api-error.ts` | Wraps core errors for API responses, includes helpers for common HTTP errors |
| `src/lib/api/error-handler.ts` | Maps error codes to HTTP status codes and categories |
| `src/lib/api/middleware/error-handler.middleware.ts` | Express-style wrapper that catches errors and returns standardized JSON |
| `src/lib/monitoring/error-logger.ts` | Buffered logger used by service and API layers |

### Error Hierarchy

The core layer defines `ApplicationError` as the base class with specialized subclasses:
- `ValidationError` - Input validation failures (400)
- `AuthenticationError` - Auth/authz failures (401/403)
- `DatabaseError` - Database operation failures (500)
- `NotFoundError` - Resource not found (404)
- `ConflictError` - Resource conflicts (409)

### Structure & Properties

All errors extend `ApplicationError` which includes:
- `code` – Unique identifier (e.g., `auth/invalid_credentials`)
- `message` – User-friendly message
- `httpStatus` – Suggested HTTP response code
- `details` – Optional structured data
- `timestamp` – Creation time
- `stack` – Stack trace (development only)

### Design Rationale

- Centralized codes prevent duplication and simplify translation
- Error classes are lightweight and serializable for cross-boundary communication
- Logging is buffered to avoid blocking the main request path
- Consistent structure enables automated monitoring and alerting

---

## Error Flow Through Layers

### 1. Service Layer
Services throw `ApplicationError` subclasses when business rules fail:
```typescript
throw createError(AUTH_ERROR.AUTH_002, 'Invalid credentials');
```

### 2. API Layer  
`withApiErrorHandling` converts thrown errors into JSON responses:
```typescript
const response = await withApiErrorHandling(async () => {
  // Service call that might throw
}, { service: 'userService', method: 'login' });
```

### 3. Client Layer
Hooks catch `ApiError` and surface translated messages:
```typescript
const { error, retry } = useApiError();
```

### 4. UI Components
Components display errors using standardized components:
- `ApiErrorAlert` - For API errors with retry
- `FormErrorSummary` - Form validation summary
- `FormMessage` - Inline field errors

---

## Implementation Guidelines

### 1. Form Validation

- **Inline validation** occurs as users type or blur fields
- **Error messages** must be clear and positioned next to related fields using `FormMessage`
- Use `FormErrorSummary` at form top for screen readers
- Provide real-time hints (password requirements, format examples)
- Field borders turn red on error, green on success

### 2. API Error Handling

- Use `useApiError` to translate API error codes into friendly text
- Display errors with `ApiErrorAlert`, offering retry when possible
- Differentiate user mistakes from system failures:
  - User mistakes: Clear correction instructions
  - System failures: Encourage retry later
- Detect offline status with `useOfflineDetection`

### 3. Authentication Errors

- **Never reveal** whether a user account exists on login failure
- Show password requirements using `PasswordRequirements` component
- Provide `MFATroubleshoot` on MFA screens for common problems
- Offer account recovery links where appropriate
- Log security-relevant errors for audit trails

### 4. Graceful Degradation

- Provide fallback UI when services are unavailable
- Cache critical data for offline functionality
- Queue failed operations for retry when possible
- Show estimated recovery time for known outages

---

## Error Code Reference

### Authentication Errors (`auth/*`)

| Code | Description | Resolution | HTTP |
|------|-------------|------------|------|
| `auth/unauthorized` | Authentication required | Log in and retry | 401 |
| `auth/forbidden` | Access denied | Check role or scope | 403 |
| `auth/invalid_credentials` | Invalid credentials | Reset credentials | 401 |
| `auth/email_not_verified` | Email not verified | Verify email or resend | 403 |
| `auth/mfa_required` | MFA required | Complete MFA challenge | 403 |
| `auth/account_locked` | Account locked | Contact support | 403 |
| `auth/password_expired` | Password expired | Reset password | 403 |
| `auth/session_expired` | Session expired | Log in again | 401 |
| `auth/token_refresh_failed` | Token refresh failed | Retry later | 401 |

### User Management Errors (`user/*`)

| Code | Description | Resolution | HTTP |
|------|-------------|------------|------|
| `user/not_found` | User not found | Verify user ID | 404 |
| `user/already_exists` | User already exists | Use different identifier | 409 |
| `user/invalid_data` | Invalid user data | Fix input and retry | 400 |
| `user/update_failed` | Update failed | Retry or contact support | 500 |
| `user/delete_failed` | Delete failed | Retry or contact support | 500 |

### Team & Permission Errors (`team/*`, `permission/*`)

| Code | Description | Resolution | HTTP |
|------|-------------|------------|------|
| `team/not_found` | Team not found | Verify team ID | 404 |
| `team/already_exists` | Team already exists | Use another name | 409 |
| `team/member_not_found` | Member not found | Check membership | 404 |
| `permission/not_found` | Permission not found | Verify permission key | 404 |
| `permission/assignment_failed` | Assignment failed | Verify request | 500 |

### Validation Errors (`validation/*`)

| Code | Description | Resolution | HTTP |
|------|-------------|------------|------|
| `validation/error` | Validation failed | Fix fields and retry | 400 |
| `validation/missing_field` | Required field missing | Supply all required fields | 400 |
| `validation/invalid_format` | Invalid field format | Correct field value | 400 |

### Infrastructure Errors (`server/*`)

| Code | Description | Resolution | HTTP |
|------|-------------|------------|------|
| `server/internal_error` | Internal server error | Try again later | 500 |
| `server/service_unavailable` | Service unavailable | Retry when service recovers | 503 |
| `server/database_error` | Database error | Retry or contact support | 500 |

---

## Review & Monitoring Process

### Weekly Review Cycle

1. **Collect Metrics** – Use `ErrorDashboardData` and `ErrorMetrics` to gather:
   - Error counts by code
   - Affected users count
   - User feedback/complaints
   - Error trends over time

2. **Score Impact** – Calculate impact score using:
   ```
   Impact = (Frequency × User Count × Severity) / Recovery Time
   ```

3. **Prioritize Fixes** – Use `ErrorPrioritizer` to produce ranked list:
   - Critical: Security or data loss errors
   - High: Blocking user workflows
   - Medium: Degraded experience
   - Low: Cosmetic or rare issues

4. **Review Meeting** – Weekly team review to:
   - Review top 10 errors by impact
   - Assign fixes to sprints
   - Update error messages
   - Plan preventive measures

5. **Track Progress** – Monitor:
   - Error reduction rates
   - User feedback improvements
   - Mean time to resolution

### Monitoring Tools

- **Error Dashboard** - Real-time error metrics
- **Alert System** - Threshold-based alerting
- **User Feedback** - Error report correlation
- **Performance Impact** - Error-related latency

---

## Developer Guide

### Creating & Throwing Errors

```typescript
// Use error factory helpers
import { createError, AUTH_ERROR } from '@/core/common/errors';

// Throw with context
throw createError(
  AUTH_ERROR.INVALID_CREDENTIALS,
  'Invalid email or password',
  { email: user.email }
);
```

### Catching & Handling Errors

```typescript
// In services
const result = await withErrorHandling(
  () => userService.authenticate(credentials),
  { service: 'auth', method: 'login' }
);

// In API routes
export async function POST(request: Request) {
  return withApiErrorHandling(async () => {
    // Route logic
  });
}

// In React components
const { data, error, loading, retry } = useApiCall(
  () => api.user.get(id)
);
```

### Adding New Error Types

1. **Add code to registry**:
   ```typescript
   // src/core/common/error-codes.ts
   export const DOMAIN_ERROR = {
     SPECIFIC_ERROR: 'domain/specific_error',
   };
   ```

2. **Create subclass if needed**:
   ```typescript
   export class DomainError extends ApplicationError {
     constructor(code: string, message: string) {
       super(code, message, 400); // HTTP status
     }
   }
   ```

3. **Update translations**:
   ```typescript
   // src/lib/api/error-translations.ts
   ERROR_CODE_DESCRIPTIONS['domain/specific_error'] = 
     'User-friendly error message';
   ```

### Testing Error Scenarios

```typescript
// Test error throwing
it('should throw validation error for invalid input', async () => {
  await expect(service.create(invalidData))
    .rejects.toThrow(ValidationError);
});

// Test error handling
it('should handle authentication errors', async () => {
  mockAuth.throwError(new AuthenticationError());
  const { error } = await callApi();
  expect(error.code).toBe('auth/unauthorized');
});
```

### Best Practices

1. **Be Specific** - Use precise error codes, not generic ones
2. **Be Helpful** - Include actionable resolution steps
3. **Be Secure** - Don't leak sensitive information
4. **Be Consistent** - Follow established patterns
5. **Be Logged** - Ensure errors are captured for analysis
6. **Be Tested** - Write tests for error scenarios

### Common Patterns

```typescript
// Validation with multiple errors
const errors = validateInput(data);
if (errors.length > 0) {
  throw new ValidationError('Multiple validation errors', errors);
}

// Conditional error types
if (!user) {
  throw new NotFoundError('User not found');
} else if (user.locked) {
  throw new ForbiddenError('Account locked');
}

// Wrapping external errors
try {
  await externalApi.call();
} catch (error) {
  throw new ServiceUnavailableError(
    'External service error',
    { originalError: error }
  );
}
```

---

## Migration Notes

When migrating from ad-hoc error handling:

1. Replace string errors with typed errors
2. Update catch blocks to use error types
3. Add error codes to all thrown errors
4. Update API responses to use standard format
5. Implement error logging and monitoring
6. Add user-friendly translations
7. Test error scenarios thoroughly

---

*This consolidated document replaces: Error Handling Architecture.md, Error Handling Guidelines.md, Error Handling Overview.md, Error Review Process.md, and Error Code Reference.md*