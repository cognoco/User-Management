# Epic 4: SDK Creation

**Duration:** 2 weeks  
**Priority:** Medium - External integration enablement  
**Epic Owner:** SDK & Integration Team  
**Status:** Not Started  
**Prerequisites:** Epic 3 (tRPC Migration) must be complete

## Executive Summary

SDK Creation builds JavaScript/TypeScript SDKs that enable host applications to integrate the user management platform seamlessly. This epic transforms the internal tRPC client into external, publishable packages that provide a world-class developer experience for third-party integrations.

**Key Insight:** We're creating the bridge between our internal platform and external applications - the SDK is how the world will interact with our system.

## Problem Statement

Current integration requires deep platform knowledge:
- **No external API**: Host apps cannot integrate without complex setup
- **No abstraction layer**: Direct tRPC client exposure too complex
- **No configuration management**: Authentication and setup scattered
- **No React integration**: Framework-specific helpers missing
- **No documentation**: Integration patterns not documented

## Objectives

### Primary Goal
Create production-ready SDKs that enable:
- Simple integration (< 10 lines of code to get started)
- Type-safe operations with full IntelliSense
- Automatic authentication and token management
- Framework-specific helpers (React hooks)
- Comprehensive documentation and examples

### Secondary Goals
- Enable multiple deployment patterns (subdomain, iframe, SDK-only)
- Support multiple authentication strategies
- Provide extensive customization options
- Create foundation for marketplace/commercialization

## Success Criteria

### Critical Success Factors
- [ ] 📦 **Simple Integration**: Host apps can integrate in <10 lines of code
- [ ] 🔒 **Type Safety**: Full TypeScript support with IntelliSense
- [ ] 🔄 **Auto Token Management**: Automatic authentication handling
- [ ] ⚛️ **React Integration**: Comprehensive hooks and providers
- [ ] 📚 **Documentation**: Complete guides and API reference
- [ ] 🧪 **Example Apps**: Working integration examples for major frameworks

### Quality Gates
1. SDK works with Next.js, React, Vue, and vanilla JavaScript
2. Authentication flows work seamlessly across domains
3. Type definitions provide complete IntelliSense
4. Bundle size is optimized for production use
5. Documentation enables 0-to-integration in 15 minutes

## Target SDK Architecture

```
packages/
├── pump-sdk/                    # Core JavaScript SDK
│   ├── src/
│   │   ├── client/              # API client wrapper
│   │   │   ├── PumpClient.ts    # Main client class
│   │   │   ├── auth.ts          # Authentication module
│   │   │   ├── users.ts         # User management module
│   │   │   └── admin.ts         # Admin operations module
│   │   ├── config/              # Configuration management
│   │   │   ├── types.ts         # Config type definitions
│   │   │   └── defaults.ts      # Default configurations
│   │   ├── auth/                # Authentication handling
│   │   │   ├── TokenManager.ts  # Token storage and refresh
│   │   │   ├── strategies/      # Auth strategy implementations
│   │   │   └── types.ts         # Auth type definitions
│   │   ├── types/               # Public API types
│   │   │   ├── api.ts           # API request/response types
│   │   │   ├── auth.ts          # Authentication types
│   │   │   └── config.ts        # Configuration types
│   │   └── utils/               # Utility functions
│   └── package.json
├── pump-react/                  # React-specific SDK
│   ├── src/
│   │   ├── providers/           # Context providers
│   │   │   ├── PumpProvider.tsx # Main provider wrapper
│   │   │   └── AuthProvider.tsx # Authentication provider
│   │   ├── hooks/               # React hooks
│   │   │   ├── useAuth.ts       # Authentication hooks
│   │   │   ├── useUser.ts       # User management hooks
│   │   │   ├── useAdmin.ts      # Admin operation hooks
│   │   │   └── useConfig.ts     # Configuration hooks
│   │   ├── components/          # Optional UI components
│   │   │   ├── LoginForm.tsx    # Pre-built auth forms
│   │   │   ├── UserProfile.tsx  # User profile component
│   │   │   └── AuthGuard.tsx    # Route protection component
│   │   └── types/               # React-specific types
│   └── package.json
└── pump-vue/                    # Vue.js SDK (future)
    └── package.json
```

## Detailed Task Breakdown

### Task 4.1: Core SDK Development
**Owner:** SDK Core Team  
**Duration:** 4 days  
**Priority:** Critical

#### Main Client Implementation
```typescript
// packages/pump-sdk/src/client/PumpClient.ts
import { TRPCClientError, createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '@pump/types';
import { TokenManager } from '../auth/TokenManager';
import type { PumpConfig, AuthResult, User } from '../types';

export class PumpClient {
  private trpc: ReturnType<typeof createTRPCProxyClient<AppRouter>>;
  private tokenManager: TokenManager;
  private config: PumpConfig;

  constructor(config: PumpConfig) {
    this.config = config;
    this.tokenManager = new TokenManager(config.auth);
    
    this.trpc = createTRPCProxyClient<AppRouter>({
      links: [
        httpBatchLink({
          url: `${config.apiUrl}/trpc`,
          headers: async () => {
            const token = await this.tokenManager.getValidToken();
            return token ? { Authorization: `Bearer ${token}` } : {};
          },
        }),
      ],
    });
  }

  // Authentication methods
  async login(credentials: LoginCredentials): Promise<AuthResult> {
    try {
      const result = await this.trpc.auth.login.mutate(credentials);
      await this.tokenManager.setTokens(result.tokens);
      return result;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async logout(): Promise<void> {
    try {
      await this.trpc.auth.logout.mutate();
      await this.tokenManager.clearTokens();
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      return await this.trpc.auth.me.query();
    } catch (error) {
      if (this.isUnauthorizedError(error)) {
        return null;
      }
      throw this.handleError(error);
    }
  }

  // User management methods
  async updateProfile(data: ProfileUpdateData): Promise<User> {
    return this.trpc.user.updateProfile.mutate(data);
  }

  async changePassword(data: ChangePasswordData): Promise<void> {
    return this.trpc.user.changePassword.mutate(data);
  }

  // Admin methods (require admin permissions)
  get admin() {
    return {
      getUsers: (params?: UserListParams) => 
        this.trpc.admin.getUsers.query(params),
      
      getUserById: (userId: string) => 
        this.trpc.admin.getUserById.query({ userId }),
      
      updateUserRole: (userId: string, role: UserRole) =>
        this.trpc.admin.updateUserRole.mutate({ userId, role }),
    };
  }

  // Error handling
  private handleError(error: unknown): Error {
    if (error instanceof TRPCClientError) {
      return new PumpSDKError(error.message, error.data?.code);
    }
    return error instanceof Error ? error : new Error('Unknown error');
  }

  private isUnauthorizedError(error: unknown): boolean {
    return error instanceof TRPCClientError && 
           error.data?.code === 'UNAUTHORIZED';
  }
}
```

#### Token Management
```typescript
// packages/pump-sdk/src/auth/TokenManager.ts
export interface TokenStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export class TokenManager {
  private storage: TokenStorage;
  private config: AuthConfig;
  private refreshPromise: Promise<string> | null = null;

  constructor(config: AuthConfig) {
    this.config = config;
    this.storage = config.storage || new DefaultTokenStorage();
  }

  async getValidToken(): Promise<string | null> {
    const token = await this.storage.getItem('pump_access_token');
    
    if (!token) {
      return null;
    }

    // Check if token is expired
    if (this.isTokenExpired(token)) {
      return this.refreshToken();
    }

    return token;
  }

  async setTokens(tokens: TokenPair): Promise<void> {
    await Promise.all([
      this.storage.setItem('pump_access_token', tokens.accessToken),
      this.storage.setItem('pump_refresh_token', tokens.refreshToken),
    ]);
  }

  async clearTokens(): Promise<void> {
    await Promise.all([
      this.storage.removeItem('pump_access_token'),
      this.storage.removeItem('pump_refresh_token'),
    ]);
  }

  private async refreshToken(): Promise<string | null> {
    // Prevent multiple concurrent refresh attempts
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.performTokenRefresh();
    
    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async performTokenRefresh(): Promise<string | null> {
    const refreshToken = await this.storage.getItem('pump_refresh_token');
    
    if (!refreshToken) {
      await this.clearTokens();
      return null;
    }

    try {
      const response = await fetch(`${this.config.apiUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const tokens = await response.json();
      await this.setTokens(tokens);
      return tokens.accessToken;
    } catch (error) {
      await this.clearTokens();
      return null;
    }
  }

  private isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return Date.now() >= payload.exp * 1000;
    } catch {
      return true; // If we can't decode, assume expired
    }
  }
}
```

#### Configuration Management
```typescript
// packages/pump-sdk/src/config/types.ts
export interface PumpConfig {
  // API Configuration
  apiUrl: string;
  subdomain?: string;
  
  // Authentication Configuration
  auth: AuthConfig;
  
  // Feature Flags
  features?: {
    enableMFA?: boolean;
    enableSSO?: boolean;
    enableTeams?: boolean;
  };
  
  // Customization
  theme?: ThemeConfig;
  branding?: BrandingConfig;
}

export interface AuthConfig {
  // Storage strategy for tokens
  storage?: TokenStorage;
  
  // Auth flow configuration
  redirectUrl?: string;
  loginUrl?: string;
  logoutUrl?: string;
  
  // Token configuration
  tokenRefreshBuffer?: number; // Refresh tokens X seconds before expiry
}

// Factory function for easy setup
export function createPumpConfig(config: Partial<PumpConfig>): PumpConfig {
  return {
    apiUrl: config.apiUrl || 'https://auth.yourapp.com',
    auth: {
      tokenRefreshBuffer: 60, // 1 minute
      ...config.auth,
    },
    features: {
      enableMFA: true,
      enableSSO: false,
      enableTeams: true,
      ...config.features,
    },
    ...config,
  };
}
```

#### Acceptance Criteria
- [ ] Core client handles all major API operations
- [ ] Token management works across page refreshes
- [ ] Error handling provides useful feedback
- [ ] Configuration system is flexible and typed
- [ ] Bundle size optimized for production

---

### Task 4.2: React Integration Development
**Owner:** React Team  
**Duration:** 3 days  
**Priority:** High

#### React Provider Implementation
```typescript
// packages/pump-react/src/providers/PumpProvider.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { PumpClient } from '@pump/sdk';
import type { PumpConfig, User } from '@pump/sdk';

interface PumpContextValue {
  client: PumpClient;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const PumpContext = createContext<PumpContextValue | null>(null);

export interface PumpProviderProps {
  config: PumpConfig;
  children: React.ReactNode;
}

export const PumpProvider: React.FC<PumpProviderProps> = ({ 
  config, 
  children 
}) => {
  const [client] = useState(() => new PumpClient(config));
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setIsLoading(true);
        const currentUser = await client.getCurrentUser();
        setUser(currentUser);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, [client]);

  const value: PumpContextValue = {
    client,
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
  };

  return (
    <PumpContext.Provider value={value}>
      {children}
    </PumpContext.Provider>
  );
};

export const usePump = (): PumpContextValue => {
  const context = useContext(PumpContext);
  if (!context) {
    throw new Error('usePump must be used within a PumpProvider');
  }
  return context;
};
```

#### Authentication Hooks
```typescript
// packages/pump-react/src/hooks/useAuth.ts
import { useState } from 'react';
import { usePump } from '../providers/PumpProvider';
import type { LoginCredentials, RegisterData } from '@pump/sdk';

export const useAuth = () => {
  const { client, user, isAuthenticated } = usePump();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = async (credentials: LoginCredentials) => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await client.login(credentials);
      
      // Trigger re-render by updating user state
      // This would typically be handled by the provider
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterData) => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await client.register(data);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await client.logout();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Logout failed');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
  };
};
```

#### User Management Hooks
```typescript
// packages/pump-react/src/hooks/useUser.ts
import { useState, useCallback } from 'react';
import { usePump } from '../providers/PumpProvider';
import type { ProfileUpdateData, ChangePasswordData } from '@pump/sdk';

export const useUser = () => {
  const { client, user } = usePump();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateProfile = useCallback(async (data: ProfileUpdateData) => {
    try {
      setIsLoading(true);
      setError(null);
      const updatedUser = await client.updateProfile(data);
      return updatedUser;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  const changePassword = useCallback(async (data: ChangePasswordData) => {
    try {
      setIsLoading(true);
      setError(null);
      await client.changePassword(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password change failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  return {
    user,
    isLoading,
    error,
    updateProfile,
    changePassword,
  };
};
```

#### Route Protection Component
```typescript
// packages/pump-react/src/components/AuthGuard.tsx
import React from 'react';
import { usePump } from '../providers/PumpProvider';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireRoles?: string[];
}

export const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  fallback = <div>Please log in to access this content.</div>,
  requireRoles = [],
}) => {
  const { user, isAuthenticated, isLoading } = usePump();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <>{fallback}</>;
  }

  // Check role requirements
  if (requireRoles.length > 0 && user) {
    const hasRequiredRole = requireRoles.some(role => 
      user.roles?.includes(role)
    );
    
    if (!hasRequiredRole) {
      return <div>You don't have permission to access this content.</div>;
    }
  }

  return <>{children}</>;
};
```

#### Acceptance Criteria
- [ ] React provider manages global state
- [ ] Authentication hooks work seamlessly
- [ ] User management hooks handle CRUD operations
- [ ] Route protection components work
- [ ] TypeScript integration is complete

---

### Task 4.3: Integration Examples Development
**Owner:** Integration Team  
**Duration:** 3 days  
**Priority:** Medium

#### Next.js Integration Example
```typescript
// apps/example-host-nextjs/pages/_app.tsx
import { PumpProvider, createPumpConfig } from '@pump/react';
import type { AppProps } from 'next/app';

const pumpConfig = createPumpConfig({
  apiUrl: process.env.NEXT_PUBLIC_PUMP_API_URL!,
  auth: {
    redirectUrl: '/auth/callback',
  },
  features: {
    enableMFA: true,
    enableTeams: false,
  },
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <PumpProvider config={pumpConfig}>
      <Component {...pageProps} />
    </PumpProvider>
  );
}
```

```typescript
// apps/example-host-nextjs/pages/dashboard.tsx
import { AuthGuard, useAuth, useUser } from '@pump/react';

export default function Dashboard() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}

function DashboardContent() {
  const { user, logout } = useAuth();
  const { updateProfile } = useUser();

  return (
    <div>
      <h1>Welcome, {user?.firstName}!</h1>
      <button onClick={logout}>Logout</button>
      
      <ProfileForm 
        user={user} 
        onSubmit={updateProfile}
      />
    </div>
  );
}
```

#### React SPA Integration Example
```typescript
// apps/example-host-react/src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { PumpProvider, createPumpConfig } from '@pump/react';
import { LoginPage, DashboardPage } from './pages';

const pumpConfig = createPumpConfig({
  apiUrl: import.meta.env.VITE_PUMP_API_URL,
});

function App() {
  return (
    <BrowserRouter>
      <PumpProvider config={pumpConfig}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
        </Routes>
      </PumpProvider>
    </BrowserRouter>
  );
}
```

#### Vanilla JavaScript Example
```javascript
// apps/example-host-vanilla/src/main.js
import { PumpClient, createPumpConfig } from '@pump/sdk';

const config = createPumpConfig({
  apiUrl: 'https://auth.myapp.com',
});

const pump = new PumpClient(config);

// Login form handler
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const credentials = {
    email: formData.get('email'),
    password: formData.get('password'),
  };

  try {
    const result = await pump.login(credentials);
    console.log('Login successful:', result.user);
    
    // Redirect to dashboard
    window.location.href = '/dashboard';
  } catch (error) {
    console.error('Login failed:', error.message);
    document.getElementById('error').textContent = error.message;
  }
});

// Check current user on page load
pump.getCurrentUser().then(user => {
  if (user) {
    document.getElementById('welcome').textContent = `Welcome, ${user.firstName}!`;
  }
});
```

#### Integration Testing
```typescript
// Integration test example
describe('SDK Integration', () => {
  let client: PumpClient;

  beforeEach(() => {
    client = new PumpClient(testConfig);
  });

  it('should handle complete auth flow', async () => {
    // Test registration
    const registerResult = await client.register({
      email: 'test@example.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
    });

    expect(registerResult.user.email).toBe('test@example.com');

    // Test login
    const loginResult = await client.login({
      email: 'test@example.com',
      password: 'password123',
    });

    expect(loginResult.user.email).toBe('test@example.com');

    // Test authenticated operations
    const currentUser = await client.getCurrentUser();
    expect(currentUser?.email).toBe('test@example.com');

    // Test logout
    await client.logout();
    const userAfterLogout = await client.getCurrentUser();
    expect(userAfterLogout).toBeNull();
  });
});
```

#### Acceptance Criteria
- [ ] Next.js integration example works end-to-end
- [ ] React SPA example demonstrates core flows
- [ ] Vanilla JavaScript example shows framework independence
- [ ] All examples have complete documentation
- [ ] Integration tests cover major scenarios

---

### Task 4.4: Documentation & Developer Experience
**Owner:** Documentation Team  
**Duration:** 4 days  
**Priority:** High

#### Quick Start Guide
```markdown
# Pump SDK Quick Start

Get your user management system integrated in under 15 minutes.

## Installation

```bash
# Core SDK (framework agnostic)
npm install @pump/sdk

# React-specific helpers
npm install @pump/react
```

## Basic Setup

```typescript
import { PumpClient, createPumpConfig } from '@pump/sdk';

const config = createPumpConfig({
  apiUrl: 'https://auth.yourapp.com',
});

const pump = new PumpClient(config);

// Your user management is ready!
const user = await pump.getCurrentUser();
```

## React Integration

```tsx
import { PumpProvider, useAuth } from '@pump/react';

function App() {
  return (
    <PumpProvider config={config}>
      <LoginForm />
    </PumpProvider>
  );
}

function LoginForm() {
  const { login, isLoading } = useAuth();
  
  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      login({ email, password });
    }}>
      {/* Your login form */}
    </form>
  );
}
```

## What's Next?

- [Authentication Guide](./auth-guide.md)
- [User Management](./user-management.md)
- [Custom Theming](./theming.md)
- [API Reference](./api-reference.md)
```

#### API Reference Documentation
```typescript
/**
 * Generate comprehensive API docs from TypeScript types
 */

// packages/pump-sdk/docs/api-reference.md (auto-generated)

/**
 * # PumpClient API Reference
 * 
 * ## Authentication Methods
 * 
 * ### login(credentials)
 * Authenticates a user with email and password.
 * 
 * **Parameters:**
 * - `credentials: LoginCredentials` - User login information
 *   - `email: string` - User's email address
 *   - `password: string` - User's password
 *   - `rememberMe?: boolean` - Keep user logged in (optional)
 * 
 * **Returns:** `Promise<AuthResult>`
 * - `user: User` - Authenticated user information
 * - `tokens: TokenPair` - Access and refresh tokens
 * 
 * **Example:**
 * ```typescript
 * const result = await pump.login({
 *   email: 'user@example.com',
 *   password: 'securePassword123'
 * });
 * console.log('Welcome,', result.user.firstName);
 * ```
 */
```

#### Integration Guides
```markdown
# Framework Integration Guides

## Next.js Integration

### App Router (Recommended)

```typescript
// app/layout.tsx
import { PumpProvider } from '@pump/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <PumpProvider config={pumpConfig}>
          {children}
        </PumpProvider>
      </body>
    </html>
  );
}
```

### Pages Router

```typescript
// pages/_app.tsx
import { PumpProvider } from '@pump/react';

export default function App({ Component, pageProps }) {
  return (
    <PumpProvider config={pumpConfig}>
      <Component {...pageProps} />
    </PumpProvider>
  );
}
```

## Server-Side Authentication

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@pump/sdk/server';

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('pump_token')?.value;
  
  if (!token || !(await verifyToken(token))) {
    return NextResponse.redirect('/login');
  }
  
  return NextResponse.next();
}
```

## Common Patterns

### Protected Routes
### User Profile Management  
### Admin Operations
### Error Handling
### Loading States
```

#### Troubleshooting Guide
```markdown
# Troubleshooting Guide

## Common Issues

### "usePump must be used within a PumpProvider"

**Problem:** Hook is called outside provider context.

**Solution:** Ensure PumpProvider wraps your component tree:

```tsx
// ❌ Wrong
function App() {
  const { user } = usePump(); // Error!
  return <div>...</div>;
}

// ✅ Correct
function App() {
  return (
    <PumpProvider config={config}>
      <Dashboard />
    </PumpProvider>
  );
}

function Dashboard() {
  const { user } = usePump(); // Works!
  return <div>...</div>;
}
```

### Token Refresh Issues

**Problem:** Users getting logged out frequently.

**Solutions:**
1. Check token expiration settings
2. Verify refresh token storage
3. Handle network interruptions

### CORS Errors

**Problem:** API calls failing in browser.

**Solution:** Configure CORS on your API server:
```typescript
// Next.js API route
export async function GET(request: Request) {
  const response = NextResponse.json(data);
  response.headers.set('Access-Control-Allow-Origin', '*');
  return response;
}
```
```

#### Acceptance Criteria
- [ ] Quick start guide enables 0-to-integration in 15 minutes
- [ ] API reference is comprehensive and searchable
- [ ] Framework guides cover major use cases
- [ ] Troubleshooting covers common issues
- [ ] All code examples are tested and working

## Bundle Optimization & Performance

### Tree Shaking
```typescript
// Enable tree shaking for optimal bundle size
export { PumpClient } from './client/PumpClient';
export { TokenManager } from './auth/TokenManager';
export type { PumpConfig, User, AuthResult } from './types';

// Users can import only what they need
import { PumpClient } from '@pump/sdk'; // Core client only
import { useAuth } from '@pump/react'; // React hooks only
```

### Code Splitting
```typescript
// Lazy load admin functionality
const AdminModule = {
  async getUsers() {
    const { AdminClient } = await import('./admin/AdminClient');
    return new AdminClient();
  }
};
```

### Bundle Size Targets
- **Core SDK**: <25KB gzipped
- **React SDK**: <15KB gzipped (excluding React)
- **Total including deps**: <50KB gzipped

## Testing Strategy

### Unit Testing
```typescript
// Test core SDK functionality
describe('PumpClient', () => {
  it('should authenticate users correctly', async () => {
    const client = new PumpClient(testConfig);
    const result = await client.login(testCredentials);
    
    expect(result.user.email).toBe(testCredentials.email);
  });
});
```

### Integration Testing
```typescript
// Test React hooks
describe('useAuth Hook', () => {
  it('should handle login flow', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => (
        <PumpProvider config={testConfig}>
          {children}
        </PumpProvider>
      ),
    });

    await act(async () => {
      await result.current.login(testCredentials);
    });

    expect(result.current.isAuthenticated).toBe(true);
  });
});
```

### E2E Testing
```typescript
// Test real integration scenarios
describe('SDK Integration E2E', () => {
  it('should complete full user journey', async () => {
    // Register new user
    // Verify email
    // Login
    // Update profile
    // Logout
  });
});
```

## Security Considerations

### Token Storage
- Secure storage in browser (httpOnly cookies when possible)
- Automatic token refresh
- Secure transmission (HTTPS only)

### Cross-Origin Security
- CORS configuration
- CSP headers
- XSS protection

### Input Validation
- Client-side validation for UX
- Server-side validation for security
- Sanitization of user inputs

## Publishing Strategy

### NPM Package Configuration
```json
{
  "name": "@pump/sdk",
  "version": "1.0.0",
  "main": "dist/index.js",
  "module": "dist/index.esm.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.esm.js",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "files": ["dist"],
  "keywords": ["authentication", "user-management", "sdk"]
}
```

### Release Process
1. **Development**: Alpha releases for testing
2. **Beta**: Public beta for feedback
3. **Stable**: Production-ready release
4. **Maintenance**: Ongoing updates and security patches

## Risk Assessment

### High Risk Items
1. **API Compatibility**
   - Risk: Breaking changes in tRPC API
   - Mitigation: Semantic versioning, backward compatibility
   - Testing: Comprehensive integration tests

2. **Bundle Size Growth**
   - Risk: SDK becomes too large for production use
   - Mitigation: Tree shaking, code splitting, bundle analysis
   - Monitoring: Automated bundle size checks

### Medium Risk Items
1. **Framework Compatibility**
   - Risk: New React/framework versions break SDK
   - Mitigation: Regular testing against latest versions
   - Support: Clear compatibility matrix

2. **Authentication Complexity**
   - Risk: Token management becomes unreliable
   - Mitigation: Comprehensive token refresh testing
   - Fallbacks: Manual token management options

## Definition of Done

### Technical Completion
- [ ] Core SDK handles all major operations
- [ ] React SDK provides comprehensive hooks
- [ ] Authentication flows work seamlessly
- [ ] Bundle size meets optimization targets
- [ ] Type safety is complete and tested

### Quality Assurance  
- [ ] Unit test coverage >90%
- [ ] Integration tests cover major flows
- [ ] E2E tests validate real-world usage
- [ ] Performance benchmarks meet targets
- [ ] Security review passed

### User Acceptance
- [ ] Quick start guide works in <15 minutes
- [ ] Documentation is comprehensive
- [ ] Framework examples are working
- [ ] Developer feedback is positive
- [ ] Ready for public beta release

## Success Metrics

### Quantitative Measures
- **Integration Time**: <15 minutes from zero to working auth
- **Bundle Size**: <50KB total including dependencies
- **Performance**: <100ms SDK initialization time
- **Adoption**: Ready for external developer use

### Qualitative Measures
- **Developer Experience**: Intuitive API design
- **Documentation Quality**: Complete and helpful
- **Framework Support**: Works with major React patterns
- **Type Safety**: Full IntelliSense support

## Next Steps After Completion

1. **Epic 4 Retrospective**: SDK development lessons learned
2. **Epic 5 Planning**: Platform integration deployment patterns
3. **Beta Testing**: External developer feedback program
4. **Marketplace Preparation**: Packaging for potential commercialization

---

**Key Success Factor: The SDK bridges the gap between our sophisticated internal platform and the external developer community - it must be both powerful and approachable.**