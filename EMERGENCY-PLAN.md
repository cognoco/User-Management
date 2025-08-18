# 🚨 Emergency Stabilization Plan

## Your Immediate Action Steps (Do This Now)

### Hour 1: Stop the Bleeding
```bash
# 1. Make the script executable and run it
chmod +x scripts/emergency-fix.sh
./scripts/emergency-fix.sh

# 2. Add fast build scripts to package.json
npm pkg set scripts.build:fast="next build --experimental-turbo"
npm pkg set scripts.build:minimal="next build --config next.config.minimal.js"

# 3. Try to build
npm run build:minimal
```

### Hour 2-4: Radical Simplification

#### Delete These Directories (Keep the code in git history):
```bash
# These are over-engineered and unused
rm -rf src/adapters/saved-search/
rm -rf src/adapters/resource-relationship/
rm -rf src/adapters/webhooks/
rm -rf src/adapters/company-notification/
rm -rf src/adapters/consent/
rm -rf src/adapters/csrf/
rm -rf src/adapters/data-export/
rm -rf src/adapters/admin/
rm -rf src/adapters/api-keys/

# Keep only essential adapters:
# - auth/
# - user/
# - team/
# - permission/
# - subscription/
# - notification/
# - database/
```

#### Consolidate Services:
```bash
# Merge related services
# Before: 20+ services
# After: 6 core services
# - AuthService (login, mfa, sso)
# - UserService (profile, settings)
# - TeamService (teams, invites, roles)
# - BillingService (subscriptions, payments)
# - NotificationService (email, push, in-app)
# - AuditService (logging, compliance)
```

### Hour 5-6: Create Working Minimal Version

Create a new file: `src/simple-init.ts`

```typescript
// SIMPLE INITIALIZATION - Replace complex app-init.ts
import { createClient } from '@supabase/supabase-js'

// One client, configured once
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Simple service pattern
export const auth = {
  async login(email: string, password: string) {
    return supabase.auth.signInWithPassword({ email, password })
  },
  async logout() {
    return supabase.auth.signOut()
  },
  async register(email: string, password: string) {
    return supabase.auth.signUp({ email, password })
  }
}

export const users = {
  async getProfile(userId: string) {
    return supabase.from('profiles').select('*').eq('id', userId).single()
  },
  async updateProfile(userId: string, data: any) {
    return supabase.from('profiles').update(data).eq('id', userId)
  }
}

// Export for use in components
export { supabase }
```

### Day 2-3: Consolidate What Works

#### Pattern to Follow:
```typescript
// BEFORE: Complex factory pattern
factory → adapter → provider → service → implementation

// AFTER: Direct service pattern
service → supabase client

// Only add abstraction when you have 2+ implementations
```

#### Core Services to Keep (Simplified):
1. **Auth Service**
   - Login/Logout ✅
   - Registration ✅
   - Password Reset ✅
   - MFA (just TOTP) ⏸️

2. **User Service**
   - Profile CRUD ✅
   - Avatar Upload ✅
   - Settings ✅

3. **Team Service**
   - Create/Join Team ✅
   - Invitations ✅
   - Basic Roles ✅

4. **Billing Service**
   - Stripe Checkout ✅
   - Subscription Status ✅
   - Customer Portal ✅

### Day 4-5: Monorepo Structure (If Time Permits)

```bash
# Only after everything works
npx create-turbo@latest pump --example with-tailwind
# Move working code into packages
```

## Decision Matrix

| What | Keep? | Action |
|------|-------|--------|
| Service-Adapter Pattern | ⚠️ | Simplify to 1 level |
| 100+ Adapters | ❌ | Delete 80%, keep 6 |
| Factory Pattern | ⚠️ | Only for auth provider |
| TypeScript Interfaces | ✅ | Keep but simplify |
| Supabase | ✅ | Direct use, no abstraction |
| Mock Adapters | ⏸️ | Add later if needed |
| tRPC | ⏸️ | Add after stable |
| Current Tests | ❌ | Write new ones |

## Success Metrics

### Day 1 Success:
- [ ] Build completes without timeout
- [ ] Can run locally with `npm run dev`
- [ ] Login/Logout works

### Week 1 Success:
- [ ] All core features work
- [ ] Reduced to <50 files in adapters/
- [ ] Build time <30 seconds
- [ ] Can deploy to Vercel

### Month 1 Success:
- [ ] Monorepo structure
- [ ] Published @pump/client SDK
- [ ] 80% test coverage
- [ ] Production ready

## Remember

> "Perfection is achieved not when there is nothing more to add, but when there is nothing left to take away." - Antoine de Saint-Exupéry

**You're not building for 1000 customers yet. Build for 1 customer first.**

Start with the emergency fix script. Get it building. Then simplify aggressively.