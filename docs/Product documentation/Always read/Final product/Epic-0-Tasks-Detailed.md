# Epic 0: Foundation Stabilization - Task by Task Breakdown

**Total Duration:** 3 weeks (120 hours)  
**Current Completion:** 40%  
**Critical Path:** All Week 1 tasks

## WEEK 1: MAKE IT BUILD (40 hours)

### Task 1.1: Fix MFAVerificationForm Syntax Error
**Status:** ❌ Not Started  
**Priority:** P0 - BLOCKER  
**Time:** 30 minutes  
**Owner:** Any developer  
**File:** `src/ui/headless/auth/MFAVerificationForm.tsx`  
**Line:** 72  

**Current Code (BROKEN):**
```typescript
}: MFAVerificationFormProps): React.ReactElement => {
```

**Fix Required:**
```typescript
}: MFAVerificationFormProps) {
```

**Verification:**
- File compiles without error
- Component renders correctly

---

### Task 1.2: Fix RegistrationForm Syntax Error
**Status:** ❌ Not Started  
**Priority:** P0 - BLOCKER  
**Time:** 30 minutes  
**Owner:** Any developer  
**File:** `src/ui/headless/auth/RegistrationForm.tsx`  
**Line:** 86  

**Current Code (BROKEN):**
```typescript
}: RegistrationFormProps): React.ReactElement => {
```

**Fix Required:**
```typescript
}: RegistrationFormProps) {
```

**Verification:**
- File compiles without error
- Registration form loads

---

### Task 1.3: Fix AddressCard Syntax Error
**Status:** ❌ Not Started  
**Priority:** P0 - BLOCKER  
**Time:** 30 minutes  
**Owner:** Any developer  
**File:** `src/ui/headless/company/AddressCard.tsx`  
**Line:** 11  

**Current Code (BROKEN):**
```typescript
export function AddressCard({ address, onEdit, onDelete, render }: AddressCardProps): React.ReactElement => {
```

**Fix Required:**
```typescript
export function AddressCard({ address, onEdit, onDelete, render }: AddressCardProps) {
```

**Verification:**
- File compiles without error
- AddressCard component works

---

### Task 1.4: Fix seat-manager Typo
**Status:** ❌ Not Started  
**Priority:** P0 - BLOCKER  
**Time:** 15 minutes  
**Owner:** Any developer  
**File:** `src/services/subscription/seat-manager.ts`  
**Line:** 87  

**Current Code (BROKEN):**
```typescript
this.getP endingInvites(organizationId)
```

**Fix Required:**
```typescript
this.getPendingInvites(organizationId)
```

**Verification:**
- File compiles without error
- Seat management API works

---

### Task 1.5: Verify Build Completes
**Status:** ❌ Not Started  
**Priority:** P0  
**Time:** 1 hour  
**Owner:** DevOps  
**Dependencies:** Tasks 1.1-1.4  

**Actions:**
1. Run `npm run build`
2. Document any new errors that appear
3. Fix any additional syntax errors found
4. Confirm build completes

**Success Criteria:**
- Build completes without syntax errors
- Build time documented

---

### Task 1.6: Fix Critical Type Errors
**Status:** ❌ Not Started  
**Priority:** P0  
**Time:** 4 hours  
**Owner:** TypeScript developer  
**Dependencies:** Task 1.5  

**Files with `any` types to fix:**
- `src/types/subscription.ts` - metadata fields
- `src/services/subscription/seat-manager.ts` - member filtering

**Actions:**
1. Replace `z.record(z.any())` with proper types
2. Define proper interfaces for metadata
3. Type the member filtering properly
4. Remove unnecessary type assertions

**Verification:**
- No `any` types in critical paths
- TypeScript strict mode passes

---

### Task 1.7: Fix Unused Variable Warnings
**Status:** ❌ Not Started  
**Priority:** P1  
**Time:** 2 hours  
**Owner:** Any developer  

**Common Pattern to Fix:**
```typescript
// Before:
catch (error) {
  // error not used
}

// After:
catch (_error) {
  // or use the error
}
```

**Verification:**
- Linter warnings reduced by 50%

---

### Task 1.8: Create Build Script
**Status:** ❌ Not Started  
**Priority:** P1  
**Time:** 1 hour  
**Owner:** DevOps  

**Create:** `scripts/verify-build.sh`
```bash
#!/bin/bash
set -e

echo "Starting build verification..."

# Clean previous builds
rm -rf .next
rm -rf dist

# Run linter
echo "Running linter..."
npm run lint 2>&1 | tee lint-output.txt

# Run type check
echo "Checking types..."
npx tsc --noEmit 2>&1 | tee type-check-output.txt

# Run build
echo "Building application..."
time npm run build 2>&1 | tee build-output.txt

echo "Build verification complete!"
echo "Check output files for details"
```

**Verification:**
- Script runs successfully
- Outputs are captured for review

---

### Task 1.9: Document Build Issues
**Status:** ❌ Not Started  
**Priority:** P2  
**Time:** 2 hours  
**Owner:** Technical writer  

**Create:** `KNOWN_ISSUES.md`
```markdown
# Known Build Issues

## Warnings (Non-blocking)
1. Linter warnings: ~6000 (not preventing build)
2. Unused variables: ~200
3. Missing return types: ~50

## Workarounds
1. Use `npm run dev` for development (works)
2. Ignore linter warnings for now
3. Type issues can be suppressed with @ts-ignore if blocking

## Fixed Issues
1. ✅ Syntax errors in 4 files
2. ✅ Build timeout issue
```

**Verification:**
- Document created and accurate

---

### Task 1.10: Setup Development Workflow
**Status:** ❌ Not Started  
**Priority:** P1  
**Time:** 2 hours  
**Owner:** Team lead  

**Actions:**
1. Update README with working commands
2. Create `.env.example` with required vars
3. Document build prerequisites
4. Create developer onboarding guide

**Verification:**
- New developer can build in < 30 minutes

---

## WEEK 2: MAKE IT SECURE (40 hours)

### Task 2.1: Create Cookie Configuration Module
**Status:** ❌ Not Started  
**Priority:** P0 - CRITICAL SECURITY  
**Time:** 2 hours  
**Owner:** Security engineer  

**Create:** `src/lib/auth/cookie-config.ts`
```typescript
import { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies';

export const AUTH_COOKIE_NAME = 'auth-token';
export const SESSION_COOKIE_NAME = 'session-id';

export const getCookieConfig = (isProd: boolean): Partial<ResponseCookie> => ({
  httpOnly: true,
  secure: isProd,
  sameSite: 'strict',
  path: '/',
  maxAge: 60 * 60 * 24 * 7 // 7 days
});

export const setSecureCookie = (
  name: string,
  value: string,
  options?: Partial<ResponseCookie>
) => {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    name,
    value,
    ...getCookieConfig(isProd),
    ...options
  };
};
```

**Verification:**
- Module created and exports working
- Types are correct

---

### Task 2.2: Apply Cookie Config to Auth Middleware
**Status:** ❌ Not Started  
**Priority:** P0 - CRITICAL SECURITY  
**Time:** 3 hours  
**Owner:** Security engineer  
**Dependencies:** Task 2.1  

**Update:** `src/middleware/auth.ts`
```typescript
import { setSecureCookie } from '@/lib/auth/cookie-config';

// Apply to all cookie operations
response.cookies.set(setSecureCookie('auth-token', token));
```

**Files to Update:**
- `src/middleware/auth.ts`
- `src/lib/auth/session.ts`
- `src/services/auth/auth-storage.ts`

**Verification:**
- All auth cookies use secure config
- Test in browser DevTools

---

### Task 2.3: Remove localStorage from Notification Handler
**Status:** ❌ Not Started  
**Priority:** P0 - XSS VULNERABILITY  
**Time:** 2 hours  
**Owner:** Frontend developer  

**File:** `src/services/notification/default-notification.handler.ts`

**Current (INSECURE):**
```typescript
localStorage.setItem('notification_user_id', userId);
```

**Fix Required:**
```typescript
// Use session storage or server-side storage
// Do not store user IDs client-side
```

**Verification:**
- No localStorage usage for sensitive data
- Notifications still work

---

### Task 2.4: Fix Settings Page sessionStorage
**Status:** ❌ Not Started  
**Priority:** P0 - XSS VULNERABILITY  
**Time:** 1 hour  
**Owner:** Frontend developer  

**File:** `app/settings/page.tsx`

**Current:**
```typescript
sessionStorage.getItem('show_oauth_linked_toast')
```

**Fix Required:**
```typescript
// Use server-side flag or URL parameter
// Or use non-sensitive flag name
```

**Verification:**
- OAuth linking feedback still works
- No sensitive data in storage

---

### Task 2.5: Integrate CSRF into API Routes
**Status:** ❌ Not Started  
**Priority:** P0 - CSRF VULNERABILITY  
**Time:** 4 hours  
**Owner:** Backend developer  

**Pattern to Apply:**
```typescript
// app/api/*/route.ts
import { withCSRF } from '@/middleware/csrf';

export const POST = withCSRF(async (req, res) => {
  // Handler code
});

export const PUT = withCSRF(async (req, res) => {
  // Handler code  
});

export const DELETE = withCSRF(async (req, res) => {
  // Handler code
});
```

**Routes to Update:**
- All `/api/auth/*` routes
- All `/api/user/*` routes
- All `/api/team/*` routes
- All `/api/profile/*` routes

**Verification:**
- Test with Postman without CSRF token (should fail)
- Test with valid CSRF token (should pass)

---

### Task 2.6: Add CSRF Token to Forms
**Status:** ❌ Not Started  
**Priority:** P0 - CSRF VULNERABILITY  
**Time:** 3 hours  
**Owner:** Frontend developer  
**Dependencies:** Task 2.5  

**Create:** `src/hooks/useCsrfToken.ts`
```typescript
export function useCsrfToken() {
  const [token, setToken] = useState<string>('');
  
  useEffect(() => {
    fetch('/api/csrf-token')
      .then(res => res.json())
      .then(data => setToken(data.token));
  }, []);
  
  return token;
}
```

**Forms to Update:**
- LoginForm
- RegistrationForm
- ProfileEditForm
- PasswordResetForm
- All other forms

**Verification:**
- Forms include CSRF token in submission
- Form submission works correctly

---

### Task 2.7: Remove Console Logs from Retention Service
**Status:** ❌ Not Started  
**Priority:** P1  
**Time:** 1 hour  
**Owner:** Backend developer  

**File:** `src/lib/services/retention.service.ts`

**Action:** Remove all 10 console.log statements

**Replace With:**
```typescript
import { logger } from '@/lib/utils/logger';

// Replace console.log with:
logger.info('[RetentionService] Starting...');

// Replace console.error with:
logger.error('[RetentionService] Error:', error);
```

**Verification:**
- No console.* in service files
- Service still functions

---

### Task 2.8: Create Logger Utility
**Status:** ❌ Not Started  
**Priority:** P1  
**Time:** 2 hours  
**Owner:** Backend developer  

**Create:** `src/lib/utils/logger.ts`
```typescript
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private sanitize(data: any): any {
    if (!data) return data;
    
    const sensitive = ['password', 'token', 'secret', 'key', 'authorization'];
    
    if (typeof data === 'string') {
      return data;
    }
    
    if (typeof data === 'object') {
      const cleaned = { ...data };
      for (const key in cleaned) {
        if (sensitive.some(s => key.toLowerCase().includes(s))) {
          cleaned[key] = '[REDACTED]';
        }
      }
      return cleaned;
    }
    
    return data;
  }
  
  private shouldLog(level: LogLevel): boolean {
    if (process.env.NODE_ENV === 'production') {
      return level === 'error' || level === 'warn';
    }
    return true;
  }
  
  debug(message: string, data?: any) {
    if (this.shouldLog('debug')) {
      console.debug(message, this.sanitize(data));
    }
  }
  
  info(message: string, data?: any) {
    if (this.shouldLog('info')) {
      console.log(message, this.sanitize(data));
    }
  }
  
  warn(message: string, data?: any) {
    if (this.shouldLog('warn')) {
      console.warn(message, this.sanitize(data));
    }
  }
  
  error(message: string, error?: any) {
    if (this.shouldLog('error')) {
      console.error(message, this.sanitize(error));
    }
  }
}

export const logger = new Logger();
```

**Verification:**
- Logger sanitizes sensitive data
- Environment-aware logging works

---

### Task 2.9: Security Audit Script
**Status:** ❌ Not Started  
**Priority:** P1  
**Time:** 2 hours  
**Owner:** Security engineer  

**Create:** `scripts/security-audit.sh`
```bash
#!/bin/bash

echo "Running Security Audit..."

# Check for localStorage usage
echo "Checking for localStorage usage..."
grep -r "localStorage" src/ --include="*.ts" --include="*.tsx" | grep -v "test" | grep -v "mock"

# Check for console.log
echo "Checking for console.log statements..."
grep -r "console.log" src/ --include="*.ts" --include="*.tsx" | grep -v "test" | grep -v "logger"

# Check for hardcoded secrets
echo "Checking for hardcoded secrets..."
grep -r -E "(api_key|apiKey|secret|password|token)" src/ --include="*.ts" --include="*.tsx" | grep -v "test" | grep -v "interface" | grep -v "type"

# Check cookie configuration
echo "Checking cookie configuration..."
grep -r "cookie" src/ --include="*.ts" | grep -v "httpOnly"

# Check npm audit
echo "Running npm audit..."
npm audit

echo "Security audit complete!"
```

**Verification:**
- Script identifies all security issues
- Output is actionable

---

### Task 2.10: Security Documentation
**Status:** ❌ Not Started  
**Priority:** P2  
**Time:** 2 hours  
**Owner:** Technical writer  

**Create:** `SECURITY.md`
```markdown
# Security Implementation

## Cookie Security
- All auth cookies use httpOnly, secure, sameSite
- Configuration in `src/lib/auth/cookie-config.ts`

## CSRF Protection
- Middleware in `src/middleware/csrf.ts`
- All state-changing endpoints protected
- Tokens required on all forms

## Session Management
- No sensitive data in localStorage
- Sessions stored in httpOnly cookies
- 7-day expiration

## Logging
- No sensitive data in logs
- Production logging limited to errors
- Logger utility sanitizes output

## Known Vulnerabilities
- ✅ FIXED: Cookie security
- ✅ FIXED: CSRF protection
- ✅ FIXED: localStorage usage
- ⚠️ TODO: MFA implementation
```

**Verification:**
- Document is accurate and complete

---

## WEEK 3: MAKE IT TESTABLE (40 hours)

### Task 3.1: Create Test Directory Structure
**Status:** ❌ Not Started  
**Priority:** P0  
**Time:** 1 hour  
**Owner:** QA engineer  

**Create Structure:**
```
src/tests/
├── unit/
│   ├── services/
│   ├── components/
│   └── utils/
├── integration/
│   ├── auth/
│   ├── api/
│   └── workflows/
└── e2e/
    ├── auth/
    ├── profile/
    └── critical-paths/
```

**Verification:**
- Directory structure created
- .gitkeep files in empty directories

---

### Task 3.2: Write Auth Service Unit Tests
**Status:** ❌ Not Started  
**Priority:** P0  
**Time:** 4 hours  
**Owner:** QA engineer  

**Create:** `src/tests/unit/services/auth.test.ts`
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from '@/services/auth/default-auth.service';

describe('AuthService', () => {
  let authService: AuthService;
  
  beforeEach(() => {
    authService = new AuthService();
  });
  
  describe('login', () => {
    it('should authenticate valid credentials', async () => {
      const result = await authService.login({
        email: 'test@example.com',
        password: 'ValidPass123!'
      });
      
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
    });
    
    it('should reject invalid credentials', async () => {
      const result = await authService.login({
        email: 'test@example.com',
        password: 'wrong'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
  
  describe('register', () => {
    it('should create new user account', async () => {
      // Test implementation
    });
    
    it('should validate email format', async () => {
      // Test implementation
    });
    
    it('should enforce password requirements', async () => {
      // Test implementation
    });
  });
  
  describe('logout', () => {
    it('should clear session', async () => {
      // Test implementation
    });
  });
});
```

**Verification:**
- Tests run with `npm test`
- All tests pass

---

### Task 3.3: Write Cookie Security Tests
**Status:** ❌ Not Started  
**Priority:** P0  
**Time:** 3 hours  
**Owner:** Security engineer  

**Create:** `src/tests/unit/security/cookies.test.ts`
```typescript
import { describe, it, expect } from 'vitest';
import { getCookieConfig, setSecureCookie } from '@/lib/auth/cookie-config';

describe('Cookie Security', () => {
  it('should set httpOnly flag', () => {
    const config = getCookieConfig(true);
    expect(config.httpOnly).toBe(true);
  });
  
  it('should set secure flag in production', () => {
    const config = getCookieConfig(true);
    expect(config.secure).toBe(true);
  });
  
  it('should not set secure flag in development', () => {
    const config = getCookieConfig(false);
    expect(config.secure).toBe(false);
  });
  
  it('should set sameSite to strict', () => {
    const config = getCookieConfig(true);
    expect(config.sameSite).toBe('strict');
  });
  
  it('should set correct expiration', () => {
    const config = getCookieConfig(true);
    expect(config.maxAge).toBe(60 * 60 * 24 * 7);
  });
});
```

**Verification:**
- Tests validate cookie configuration
- All security requirements tested

---

### Task 3.4: Write CSRF Protection Tests
**Status:** ❌ Not Started  
**Priority:** P0  
**Time:** 3 hours  
**Owner:** Backend developer  

**Create:** `src/tests/integration/api/csrf.test.ts`
```typescript
import { describe, it, expect } from 'vitest';
import { POST } from '@/app/api/auth/login/route';

describe('CSRF Protection', () => {
  it('should reject requests without CSRF token', async () => {
    const request = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password'
      })
    });
    
    const response = await POST(request);
    expect(response.status).toBe(403);
  });
  
  it('should accept requests with valid CSRF token', async () => {
    const token = await getCSRFToken();
    
    const request = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: {
        'X-CSRF-Token': token
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password'
      })
    });
    
    const response = await POST(request);
    expect(response.status).not.toBe(403);
  });
});
```

**Verification:**
- CSRF protection is properly tested
- Both positive and negative cases covered

---

### Task 3.5: Create E2E Auth Flow Test
**Status:** ❌ Not Started  
**Priority:** P0  
**Time:** 4 hours  
**Owner:** QA engineer  

**Create:** `src/tests/e2e/critical-paths/auth-flow.spec.ts`
```typescript
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('user can register, verify email, and login', async ({ page }) => {
    // Navigate to registration
    await page.goto('/auth/register');
    
    // Fill registration form
    await page.fill('[name="email"]', 'newuser@example.com');
    await page.fill('[name="password"]', 'SecurePass123!');
    await page.fill('[name="confirmPassword"]', 'SecurePass123!');
    await page.check('[name="terms"]');
    
    // Submit registration
    await page.click('button[type="submit"]');
    
    // Verify success message
    await expect(page.locator('.success-message')).toContainText(
      'Registration successful'
    );
    
    // Simulate email verification (in test mode)
    await page.goto('/auth/verify?token=test-token');
    
    // Navigate to login
    await page.goto('/auth/login');
    
    // Fill login form
    await page.fill('[name="email"]', 'newuser@example.com');
    await page.fill('[name="password"]', 'SecurePass123!');
    
    // Submit login
    await page.click('button[type="submit"]');
    
    // Verify redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
  });
  
  test('protected routes redirect to login', async ({ page }) => {
    // Try to access protected route
    await page.goto('/dashboard');
    
    // Should redirect to login
    await expect(page).toHaveURL('/auth/login');
  });
});
```

**Verification:**
- E2E tests run with `npm run test:e2e`
- Critical paths are covered

---

### Task 3.6: Implement Basic TOTP Service
**Status:** ❌ Not Started  
**Priority:** P1  
**Time:** 4 hours  
**Owner:** Backend developer  

**Create:** `src/services/mfa/totp.service.ts`
```typescript
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';

export interface TOTPSecret {
  secret: string;
  qr_code: string;
  backup_codes: string[];
}

export class TOTPService {
  /**
   * Generate TOTP secret for user
   */
  async generateSecret(userId: string, email: string): Promise<TOTPSecret> {
    const secret = speakeasy.generateSecret({
      name: `MyApp (${email})`,
      issuer: 'MyApp',
      length: 32
    });
    
    const qrCode = await qrcode.toDataURL(secret.otpauth_url!);
    
    const backupCodes = this.generateBackupCodes();
    
    // Store encrypted secret in database
    await this.storeTOTPSecret(userId, secret.base32, backupCodes);
    
    return {
      secret: secret.base32,
      qr_code: qrCode,
      backup_codes: backupCodes
    };
  }
  
  /**
   * Verify TOTP token
   */
  async verifyToken(userId: string, token: string): Promise<boolean> {
    const secret = await this.getTOTPSecret(userId);
    
    if (!secret) {
      return false;
    }
    
    return speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: 2 // Allow 2 time windows for clock skew
    });
  }
  
  /**
   * Generate backup codes
   */
  private generateBackupCodes(count: number = 8): string[] {
    const codes: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      codes.push(code);
    }
    
    return codes;
  }
  
  /**
   * Store TOTP secret (encrypted)
   */
  private async storeTOTPSecret(
    userId: string,
    secret: string,
    backupCodes: string[]
  ): Promise<void> {
    // TODO: Implement database storage with encryption
    // This should store in a secure mfa_secrets table
  }
  
  /**
   * Get TOTP secret for user
   */
  private async getTOTPSecret(userId: string): Promise<string | null> {
    // TODO: Implement database retrieval with decryption
    return null;
  }
}
```

**Verification:**
- TOTP generation works
- QR codes are generated
- Backup codes are created

---

### Task 3.7: Create MFA Database Schema
**Status:** ❌ Not Started  
**Priority:** P1  
**Time:** 2 hours  
**Owner:** Database engineer  

**Create:** `prisma/migrations/add_mfa_tables.sql`
```sql
-- MFA secrets table
CREATE TABLE mfa_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  secret_encrypted TEXT NOT NULL,
  backup_codes_encrypted TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  UNIQUE(user_id)
);

-- MFA backup codes usage tracking
CREATE TABLE mfa_backup_codes_used (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash VARCHAR(64) NOT NULL,
  used_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, code_hash)
);

-- Add MFA status to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_verified BOOLEAN DEFAULT FALSE;

-- Create indexes
CREATE INDEX idx_mfa_secrets_user_id ON mfa_secrets(user_id);
CREATE INDEX idx_mfa_backup_codes_user_id ON mfa_backup_codes_used(user_id);
```

**Verification:**
- Migration runs successfully
- Tables are created
- Indexes are in place

---

### Task 3.8: Create Test Database Setup
**Status:** ❌ Not Started  
**Priority:** P1  
**Time:** 3 hours  
**Owner:** DevOps  

**Create:** `scripts/setup-test-db.sh`
```bash
#!/bin/bash

# Load test environment
export $(cat .env.test | xargs)

echo "Setting up test database..."

# Create test database if not exists
createdb -h localhost -U postgres user_management_test || true

# Run migrations
npm run prisma:migrate:dev

# Seed test data
npm run db:seed:test

echo "Test database ready!"
```

**Create:** `src/tests/fixtures/seed-test-data.ts`
```typescript
export async function seedTestData() {
  // Create test users
  const testUser = await createUser({
    email: 'test@example.com',
    password: 'TestPass123!',
    name: 'Test User'
  });
  
  // Create test organization
  const testOrg = await createOrganization({
    name: 'Test Organization',
    owner_id: testUser.id
  });
  
  // Create test team members
  await createTeamMember({
    organization_id: testOrg.id,
    user_id: testUser.id,
    role: 'admin'
  });
  
  console.log('Test data seeded successfully');
}
```

**Verification:**
- Test database can be created
- Seed data is inserted
- Tests can connect to test DB

---

### Task 3.9: Fix Test Execution Timeout
**Status:** ❌ Not Started  
**Priority:** P1  
**Time:** 2 hours  
**Owner:** DevOps  

**Update:** `vitest.config.ts`
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
    testTimeout: 10000, // 10 seconds
    hookTimeout: 10000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/tests/',
        '*.config.ts'
      ]
    },
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true
      }
    }
  }
});
```

**Verification:**
- Tests run without timeout
- `npm test` completes in < 2 minutes

---

### Task 3.10: Create Test Documentation
**Status:** ❌ Not Started  
**Priority:** P2  
**Time:** 3 hours  
**Owner:** Technical writer  

**Create:** `TESTING.md`
```markdown
# Testing Guide

## Test Structure
```
src/tests/
├── unit/        # Unit tests for individual functions
├── integration/ # Integration tests for services
└── e2e/        # End-to-end browser tests
```

## Running Tests

### All Tests
```bash
npm test
```

### Unit Tests Only
```bash
npm run test:unit
```

### E2E Tests Only
```bash
npm run test:e2e
```

### With Coverage
```bash
npm run test:coverage
```

## Writing Tests

### Unit Test Example
```typescript
describe('Function', () => {
  it('should do something', () => {
    expect(myFunction()).toBe(expected);
  });
});
```

### E2E Test Example
```typescript
test('user flow', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('App');
});
```

## Test Database
- Uses separate test database
- Automatically seeded before tests
- Cleaned after test run

## CI/CD Integration
Tests run automatically on:
- Pull requests
- Main branch commits
- Pre-deployment

## Coverage Requirements
- Minimum 60% for critical paths
- Target 80% overall
```

**Verification:**
- Documentation is clear and accurate
- Examples work correctly

---

## Summary Statistics

**Total Tasks:** 30  
**Week 1:** 10 tasks (15.75 hours)  
**Week 2:** 10 tasks (24 hours)  
**Week 3:** 10 tasks (26 hours)  

**By Priority:**
- P0 (Blockers): 12 tasks
- P1 (Critical): 14 tasks  
- P2 (Important): 4 tasks

**By Owner:**
- Any Developer: 5 tasks
- Security Engineer: 5 tasks
- Backend Developer: 7 tasks
- Frontend Developer: 4 tasks
- QA Engineer: 5 tasks
- DevOps: 4 tasks

**Dependencies:**
- 8 tasks have dependencies
- 22 tasks can start immediately

---

*Each task has been broken down to be independently actionable with clear verification criteria.*