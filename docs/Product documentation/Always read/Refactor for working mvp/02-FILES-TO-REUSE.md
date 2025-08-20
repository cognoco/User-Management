# Exact Files to Reuse from Current Codebase

## Database Schema (100% Reuse)
```
✅ COPY COMPLETELY:
/supabase/migrations/
  - 20240101000000_initial_schema.sql
  - 20240520000000_create_adapter_tables.sql
  - All other migration files
  
/supabase/seed.sql (if exists)
```

## UI Components (80% Reuse)
```
✅ COPY & SIMPLIFY:
/src/components/ui/
  - button.tsx
  - card.tsx
  - dialog.tsx
  - dropdown-menu.tsx
  - form.tsx
  - input.tsx
  - label.tsx
  - select.tsx
  - textarea.tsx
  - toast.tsx
  - toaster.tsx
  - avatar.tsx
  - badge.tsx
  - alert.tsx
  - alert-dialog.tsx
  - tabs.tsx
  - separator.tsx
  - skeleton.tsx
  - switch.tsx
  
/src/lib/utils.ts (cn function for Tailwind)
```

## Form Components (Selective Reuse)
```
✅ COPY & REFACTOR:
/src/components/auth/
  - login-form.tsx (simplify, remove complex hooks)
  - register-form.tsx (simplify, remove adapters)
  
⚠️ REVIEW & SIMPLIFY:
/src/components/forms/
  - profile-form.tsx
  - team-form.tsx
  - company-form.tsx
```

## Types & Interfaces (60% Reuse)
```
✅ COPY:
/src/types/
  - auth.types.ts (keep interfaces, remove complex types)
  - user.types.ts
  - team.types.ts
  - database.types.ts (Supabase generated)

❌ DON'T COPY:
  - adapter types
  - complex generic types
  - unused interfaces
```

## Configuration (Selective)
```
✅ COPY & MODIFY:
/.env (credentials only)
/tailwind.config.js
/postcss.config.js
/tsconfig.json (simplify)
/.eslintrc.json (basic)

⚠️ CREATE NEW:
/next.config.js (fresh, minimal)
```

## Styles (100% Reuse)
```
✅ COPY:
/src/app/globals.css (Tailwind setup)
/src/styles/ (if any custom styles)
```

## Testing (10% Reuse)
```
✅ COPY & SIMPLIFY:
/e2e/auth/personal/login.e2e.test.ts (as reference)
/e2e/auth/personal/registration.spec.ts (as reference)

❌ DON'T COPY:
- Complex test setups
- Broken tests
- Mock implementations
```

## What NOT to Copy

```
❌ NEVER COPY:
/src/adapters/ (entire folder - overcomplicated)
/src/core/adapters/ (entire folder)
/src/factories/ (entire folder)
/src/providers/ (will create simpler versions)
/src/lib/api/ (complex API setup)
/src/lib/telemetry/ (Sentry, monitoring)
/src/lib/monitoring/ (error systems)
/src/middleware/ (will create fresh)
/src/hooks/ (most are overcomplicated)
```

## Specific Files to Reference (Not Copy)

```
📖 USE AS REFERENCE:
/src/app/auth/login/page.tsx (structure only)
/src/app/auth/register/page.tsx (structure only)
/src/app/(dashboard)/profile/page.tsx (structure only)
/src/app/api/auth/login/route.ts (logic reference)
/src/app/api/auth/register/route.ts (logic reference)
```

## Migration Checklist

### Step 1: Copy Database
```bash
# Copy all migrations
cp -r ./supabase ../pump-v2/supabase
```

### Step 2: Copy UI Components
```bash
# Copy UI components
cp -r ./src/components/ui ../pump-v2/src/components/
cp ./src/lib/utils.ts ../pump-v2/src/lib/
```

### Step 3: Copy & Clean Types
```bash
# Copy types and clean manually
cp ./src/types/*.types.ts ../pump-v2/src/types/
# Then remove adapter-specific types
```

### Step 4: Copy Styles
```bash
# Copy global styles
cp ./src/app/globals.css ../pump-v2/src/app/
```

### Step 5: Copy Config
```bash
# Copy configs
cp ./.env ../pump-v2/
cp ./tailwind.config.js ../pump-v2/
cp ./postcss.config.js ../pump-v2/
```

## Refactoring Guidelines

### When Copying Forms
```typescript
// OLD (Don't copy this pattern):
const form = useForm({
  resolver: zodResolver(schema),
  defaultValues: useAuthAdapter().getDefaults()
})

// NEW (Use this pattern):
const form = useForm({
  resolver: zodResolver(schema),
  defaultValues: { email: '', password: '' }
})
```

### When Copying API Routes
```typescript
// OLD (Don't copy):
const authService = await getAuthService()
const adapter = authService.getAdapter()
const result = await adapter.signIn()

// NEW (Use):
const supabase = createClient()
const { data, error } = await supabase.auth.signIn()
```

### When Copying Components
```typescript
// OLD (Don't copy):
import { useAuthContext } from '@/contexts/auth'
import { useServiceLocator } from '@/hooks/use-service'

// NEW (Use):
import { useAuth } from '@/lib/hooks/use-auth'
```

## Summary Statistics

| Category | Files to Copy | Files to Reference | Files to Ignore |
|----------|--------------|-------------------|-----------------|
| Database | 10 (100%) | 0 | 0 |
| UI Components | 20 (80%) | 0 | 5 |
| Business Logic | 0 | 15 | 100+ |
| Types | 5 (60%) | 5 | 20+ |
| Config | 5 (80%) | 2 | 10+ |
| Tests | 2 (10%) | 10 | 150+ |
| **TOTAL** | **42 files** | **32 files** | **900+ files** |

## The Key: Copy UI, Rewrite Logic
- ✅ UI components are good - reuse them
- ✅ Database schema is solid - keep it
- ❌ Business logic is overcomplicated - rewrite simpler
- ❌ Adapter pattern is overkill - use direct integration