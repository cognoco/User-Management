# Complete Architecture Documentation

**Last Updated:** 2025-08-16  
**Status:** Consolidated Reference

## Table of Contents
1. [Architecture Guidelines](#architecture-guidelines)
2. [Architecture Rules](#architecture-rules)
3. [File Structure Guidelines](#file-structure-guidelines)
4. [Database Interfaces](#database-interfaces)
5. [Error Handling Architecture](#error-handling-architecture)
6. [API Architecture](#api-architecture)

---

## Architecture Guidelines

### Core Principles
1. **Modular First**: Build features as pluggable modules that can be enabled/disabled
2. **Database Agnostic**: Use adapter interfaces, never directly couple to Supabase
3. **UI Separation**: Keep business logic separate from UI components
4. **Interface-Based**: All services must implement core interfaces
5. **Configuration Driven**: Features should be toggleable via configuration

### Layered Architecture

```
┌─────────────────────────────────────────┐
│          Presentation Layer             │
│    (React Components, Next.js Pages)    │
├─────────────────────────────────────────┤
│           Application Layer             │
│     (Hooks, State Management)           │
├─────────────────────────────────────────┤
│           Service Layer                 │
│     (Business Logic, Validation)        │
├─────────────────────────────────────────┤
│           Adapter Layer                 │
│     (Database, External Services)       │
├─────────────────────────────────────────┤
│           Infrastructure                │
│     (Supabase, Prisma, APIs)           │
└─────────────────────────────────────────┘
```

### Service-Adapter Pattern

Every service follows this pattern:
```typescript
// Interface (Core)
interface IAuthService {
  login(credentials: LoginCredentials): Promise<User>;
  logout(): Promise<void>;
}

// Implementation (Service)
class AuthService implements IAuthService {
  constructor(private adapter: IAuthAdapter) {}
  
  async login(credentials: LoginCredentials) {
    // Business logic
    return this.adapter.authenticate(credentials);
  }
}

// Adapter (Data Provider)
class SupabaseAuthAdapter implements IAuthAdapter {
  async authenticate(credentials: LoginCredentials) {
    // Supabase-specific implementation
  }
}
```

---

## Architecture Rules

### Rule 1: No Direct Database Access
- ❌ NEVER import Supabase client directly in components
- ❌ NEVER use Prisma client outside of adapters
- ✅ ALWAYS use service layer with adapters
- ✅ ALWAYS define interfaces for data operations

### Rule 2: Dependency Direction
- UI → Hooks → Services → Adapters → Infrastructure
- Dependencies only flow inward (clean architecture)
- No circular dependencies allowed

### Rule 3: Configuration Over Code
- All feature flags in `userManagement.config.ts`
- Environment variables for infrastructure settings
- Runtime configuration for dynamic settings

### Rule 4: Type Safety
- All API contracts must have TypeScript types
- Use Zod for runtime validation
- No `any` types in production code

### Rule 5: Error Handling
- All errors must extend base `ApplicationError`
- Use error codes from registry
- Proper error boundaries in UI

---

## File Structure Guidelines

### Directory Organization

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Public auth routes
│   ├── (dashboard)/       # Protected routes
│   └── api/               # API routes
├── core/                  # Core business logic
│   ├── interfaces/        # Contract definitions
│   ├── models/           # Domain models
│   └── config/           # Configuration
├── services/             # Business logic implementation
│   ├── auth/
│   ├── user/
│   └── [feature]/
├── adapters/             # Data provider implementations
│   ├── supabase/
│   ├── prisma/
│   └── mock/
├── ui/                   # UI components (3 tiers)
│   ├── headless/        # Logic only
│   ├── primitives/      # Basic styled
│   └── styled/          # Full featured
├── hooks/               # React hooks
├── lib/                 # Utilities
└── types/               # TypeScript types
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Services | PascalCase + Service | `AuthService.ts` |
| Adapters | PascalCase + Adapter | `SupabaseAuthAdapter.ts` |
| Interfaces | I + PascalCase | `IAuthService.ts` |
| Components | PascalCase | `UserProfile.tsx` |
| Hooks | use + PascalCase | `useAuth.ts` |
| Utils | camelCase | `formatDate.ts` |
| Types | PascalCase | `User.ts` |

### Import Order
1. React/Next.js imports
2. External libraries
3. Absolute imports (@/)
4. Relative imports (../)
5. Type imports

---

## Database Interfaces

### Core Adapter Pattern

```typescript
// Base repository interface
interface IRepository<T> {
  findById(id: string): Promise<T | null>;
  findAll(filters?: QueryFilters): Promise<T[]>;
  create(data: Partial<T>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}

// Feature-specific interfaces
interface IUserRepository extends IRepository<User> {
  findByEmail(email: string): Promise<User | null>;
  findByRole(role: string): Promise<User[]>;
}

// Implementation registration
AdapterRegistry.register('user', {
  supabase: SupabaseUserAdapter,
  prisma: PrismaUserAdapter,
  mock: MockUserAdapter
});
```

### Database Schema Access

- **auth schema**: Managed by Supabase (users, sessions, MFA)
- **public schema**: Application data (profiles, teams, subscriptions)
- **Row Level Security**: Enforced at database level
- **Migrations**: Managed via Supabase migrations

---

## Error Handling Architecture

### Error Hierarchy

```typescript
ApplicationError (base)
├── ValidationError (400)
├── AuthenticationError (401)
├── AuthorizationError (403)
├── NotFoundError (404)
├── ConflictError (409)
├── RateLimitError (429)
└── InternalServerError (500)
```

### Error Flow

1. **Service Layer**: Catch and wrap infrastructure errors
2. **API Layer**: Transform to HTTP responses
3. **UI Layer**: Display user-friendly messages
4. **Logging**: Centralized error tracking

### Error Codes

All errors must use registered codes:
```typescript
export const ErrorCodes = {
  // Auth errors (1000-1999)
  AUTH_INVALID_CREDENTIALS: 'AUTH_1001',
  AUTH_SESSION_EXPIRED: 'AUTH_1002',
  
  // User errors (2000-2999)
  USER_NOT_FOUND: 'USER_2001',
  USER_ALREADY_EXISTS: 'USER_2002',
  
  // Validation errors (3000-3999)
  VALIDATION_REQUIRED_FIELD: 'VAL_3001',
  VALIDATION_INVALID_FORMAT: 'VAL_3002',
};
```

---

## API Architecture

### API Route Structure

```
/api/
├── auth/
│   ├── login/route.ts
│   ├── logout/route.ts
│   └── register/route.ts
├── users/
│   ├── route.ts (GET all, POST create)
│   └── [id]/route.ts (GET, PUT, DELETE)
└── middleware.ts
```

### API Patterns

1. **RESTful Design**: Standard HTTP methods
2. **Request Validation**: Zod schemas for all inputs
3. **Response Format**: Consistent JSON structure
4. **Error Responses**: Standardized error format
5. **Rate Limiting**: Per-endpoint limits
6. **CORS**: Configured for allowed origins

### Middleware Chain

```typescript
const middlewareChain = [
  corsMiddleware,
  rateLimitMiddleware,
  authenticationMiddleware,
  authorizationMiddleware,
  validationMiddleware,
  handler,
  errorHandlerMiddleware
];
```

### Future: tRPC Migration

The API will migrate to tRPC for:
- End-to-end type safety
- Automatic client generation
- Request batching
- Better DX

---

## Compliance & Security

### Data Privacy
- GDPR compliance with data export/deletion
- User consent tracking
- Data retention policies
- Encryption at rest and in transit

### Authentication Security
- JWT with httpOnly cookies
- MFA/2FA support
- Session management
- Password policies

### API Security
- Rate limiting
- CSRF protection
- Input validation
- SQL injection prevention

---

## Performance Considerations

### Frontend
- Code splitting by route
- Lazy loading components
- Image optimization
- Bundle size monitoring

### Backend
- Database query optimization
- Caching strategy (Redis ready)
- Connection pooling
- Background job processing

### Monitoring
- Error tracking (Sentry ready)
- Performance monitoring
- User analytics
- Health checks

---

*This document consolidates all architecture-related documentation. For implementation details, see the service-specific documentation.*