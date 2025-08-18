# Epic 1: Simplified Monorepo Transformation

**Duration:** 1 week (40 hours)  
**Priority:** HIGH - Foundation for SDK extraction  
**Epic Owner:** Architecture Team  
**Status:** 📋 PLANNED - Depends on Epic 0 completion  
**Updated:** 2025-08-18 (Post-Emergency Revision)

## Executive Summary

Transform the stabilized codebase from Epic 0 into a **minimal, functional monorepo** that can actually be extracted as packages. Focus on **proven patterns only** - no speculative abstractions, no unused adapters, just working code organized for distribution.

## Prerequisites (Epic 0 Must Be Complete)

- ✅ Build succeeds reliably
- ✅ Core features work end-to-end
- ✅ Deployed to production
- ✅ Codebase reduced to essential components
- ✅ Direct Supabase implementation working

## Problem Statement

Even after Epic 0 stabilization, we still have:
- Single Next.js app (not extractable as SDK)
- No shared packages
- Mixed client/server code
- Cannot publish to npm
- Host applications can't integrate easily

## Objectives

### Primary Goal: **EXTRACTABLE PACKAGES**
1. **Package Extraction** - Move working code to packages
2. **Clean Boundaries** - Client vs server code separation
3. **SDK Creation** - Publishable `@pump/client` package
4. **Host Integration** - Real external app can consume our packages

### Non-Goals (Learned from Epic 0)
- Complex adapter patterns (keep it simple)
- Multiple database providers (Supabase + Mock only)
- Over-engineered abstractions
- Premature optimization

## Success Criteria

- [ ] **Turborepo Structure**: Working monorepo with packages
- [ ] **@pump/client SDK**: Installable npm package
- [ ] **@pump/core**: Shared types and interfaces
- [ ] **Example App**: Separate app consuming packages
- [ ] **Build Performance**: All packages build in <2 minutes total
- [ ] **Real Integration**: External app using the SDK

## Detailed Task Breakdown

### Day 1: Monorepo Foundation [8 hours]
**Owner:** DevOps Team

#### Hour 1-2: Create Turborepo Structure
```bash
# Create new turborepo
npx create-turbo@latest pump --example basic
cd pump

# Copy working code from Epic 0
cp -r ../user-management-reorganized/src ./apps/web/src
```

**New Structure:**
```
pump/
├── apps/
│   ├── web/                    # Main Next.js app (current working code)
│   └── example/                # Example integration app
├── packages/
│   ├── core/                   # Shared types & interfaces
│   ├── client/                 # Client-side SDK
│   ├── supabase/              # Supabase implementations
│   └── ui/                    # Shared UI components
├── turbo.json
└── package.json
```

#### Hour 3-4: Configure Build System
- [ ] Setup Turborepo build pipeline
- [ ] Configure TypeScript paths
- [ ] Setup package dependencies
- [ ] Verify build works

#### Hour 5-8: Package Boundary Planning
- [ ] Identify client-safe code
- [ ] Identify server-only code
- [ ] Plan package exports
- [ ] Document integration patterns

### Day 2: Core Package Extraction [8 hours]
**Owner:** Backend Team

#### Create `packages/core/` (Shared Types)
```typescript
// packages/core/src/types.ts
export interface User {
  id: string
  email: string
  firstName?: string
  lastName?: string
}

export interface Team {
  id: string
  name: string
  ownerId: string
}

export interface AuthResponse {
  user: User | null
  error?: string
}

// Only proven, working types - no speculation
```

#### Extract Working Interfaces
```typescript
// packages/core/src/services.ts
export interface AuthService {
  login(email: string, password: string): Promise<AuthResponse>
  logout(): Promise<void>
  register(email: string, password: string): Promise<AuthResponse>
  getCurrentUser(): Promise<User | null>
}

export interface UserService {
  getProfile(userId: string): Promise<User | null>
  updateProfile(userId: string, data: Partial<User>): Promise<User>
}

// Only services we actually implement
```

#### Package Configuration
- [ ] Setup exports in package.json
- [ ] Configure TypeScript builds
- [ ] Add README with usage
- [ ] Test package in isolation

### Day 3: Client SDK Creation [8 hours]
**Owner:** Frontend Team

#### Create `packages/client/` (SDK)
```typescript
// packages/client/src/index.ts
import { AuthService, UserService } from '@pump/core'
import { createClient } from '@supabase/supabase-js'

export class PumpClient {
  private supabase: SupabaseClient
  
  constructor(config: { url: string; key: string }) {
    this.supabase = createClient(config.url, config.key)
  }
  
  get auth(): AuthService {
    return new SupabaseAuthService(this.supabase)
  }
  
  get users(): UserService {
    return new SupabaseUserService(this.supabase)
  }
}

// React hooks
export function useAuth() {
  // Client-safe auth state management
}

export function useUser(userId: string) {
  // Client-safe user data fetching
}
```

#### React Integration
- [ ] Create provider component
- [ ] Create essential hooks
- [ ] Handle authentication state
- [ ] Optimize for client-side usage

#### Package Testing
- [ ] Unit tests for SDK
- [ ] Integration tests
- [ ] Type safety verification
- [ ] Bundle size optimization

### Day 4: Supabase Package [8 hours]
**Owner:** Backend Team

#### Create `packages/supabase/` (Server Implementations)
```typescript
// packages/supabase/src/auth.ts
export class SupabaseAuthService implements AuthService {
  constructor(private supabase: SupabaseClient) {}
  
  async login(email: string, password: string) {
    const { data, error } = await this.supabase.auth
      .signInWithPassword({ email, password })
    
    return { user: data.user, error: error?.message }
  }
  
  // Implementation of all AuthService methods
}
```

#### Server-Only Code
- [ ] Database operations
- [ ] Server-side auth
- [ ] Email sending
- [ ] Stripe integration
- [ ] Audit logging

#### Security & Performance
- [ ] Server-only package (no client bundling)
- [ ] Environment variable handling
- [ ] Connection pooling
- [ ] Error handling

### Day 5: Integration & Testing [8 hours]
**Owner:** Full Team

#### Create Example App (`apps/example/`)
```typescript
// apps/example/src/app.tsx
import { PumpClient } from '@pump/client'
import { useAuth } from '@pump/client'

const pumpClient = new PumpClient({
  url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
})

export default function App() {
  const { user, login, logout } = useAuth()
  
  // Demonstrate real SDK usage
  return (
    <div>
      {user ? (
        <div>
          <p>Welcome, {user.email}!</p>
          <button onClick={() => logout()}>Logout</button>
        </div>
      ) : (
        <LoginForm onLogin={login} />
      )}
    </div>
  )
}
```

#### Verify Integration
- [ ] Example app uses only published packages
- [ ] No direct imports from main app
- [ ] All features work through SDK
- [ ] Performance meets requirements

#### Package Publishing Prep
- [ ] Version all packages
- [ ] Generate changelogs
- [ ] Create documentation
- [ ] Setup CI/CD for publishing

## Package Architecture (Final)

```
@pump/core          # Types, interfaces (500 LOC)
├── types.ts        # User, Team, Auth types
├── services.ts     # Service interfaces
└── errors.ts       # Error types

@pump/client        # Client SDK (1000 LOC)
├── client.ts       # Main PumpClient class
├── hooks/          # React hooks
├── providers/      # React providers
└── utils/          # Client utilities

@pump/supabase      # Server implementations (1500 LOC)
├── auth.ts         # AuthService implementation
├── users.ts        # UserService implementation
├── teams.ts        # TeamService implementation
└── utils/          # Server utilities

@pump/ui            # Optional UI components (500 LOC)
├── auth/           # Login, register forms
├── profile/        # Profile components
└── team/           # Team components
```

## Integration Patterns (How Host Apps Use It)

### Installation
```bash
npm install @pump/client @pump/core
```

### Basic Setup
```typescript
// Host app setup
import { PumpProvider } from '@pump/client'

function MyApp({ children }) {
  return (
    <PumpProvider config={{
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    }}>
      {children}
    </PumpProvider>
  )
}
```

### Usage in Components
```typescript
// Host app component
import { useAuth } from '@pump/client'

function NavBar() {
  const { user, logout } = useAuth()
  
  return (
    <nav>
      {user ? (
        <button onClick={logout}>Logout</button>
      ) : (
        <Link href="/login">Login</Link>
      )}
    </nav>
  )
}
```

## Quality Gates

### Before Merge:
- [ ] All packages build successfully
- [ ] Example app works end-to-end
- [ ] Type safety verified
- [ ] Bundle sizes reasonable
- [ ] Documentation complete

### Success Metrics:
- **Package Count**: 4 packages (not 20+)
- **Total Size**: <10MB (not 100MB)
- **Build Time**: <2 minutes (not 20 minutes)
- **Integration Time**: <30 minutes for new host app
- **Working Features**: 100% of Epic 0 features

## Risks & Mitigations

### Risk: "Breaking changes during extraction"
**Mitigation:** Keep apps/web/ working throughout. Extract incrementally.

### Risk: "Complex dependency management"
**Mitigation:** Use exact versions, test all combinations.

### Risk: "Performance regression"
**Mitigation:** Bundle analysis, performance testing.

## Definition of Done

### Epic 1 Complete When:
- [ ] 4 packages published to npm (or private registry)
- [ ] Example app demonstrates real integration
- [ ] Host applications can install and use SDK
- [ ] Build system supports package development
- [ ] Documentation enables external integration

---

**The New Philosophy:**
> "Extract what works, not what we think should work."

Epic 1 creates the **minimum viable monorepo** that actually delivers on the SDK promise. No gold-plating, no speculative features - just working packages that solve real problems.