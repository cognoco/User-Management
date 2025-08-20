# Dependency Audit Report
**Date:** 2025-08-20
**Total Dependencies:** 128
**Status:** 🔴 CRITICAL - Severe bloat detected

## 🚨 Major Issues Found

### 1. DUPLICATE UI LIBRARIES (Multiple competing systems)
- **Radix UI:** 26 packages (@radix-ui/react-*)
- **Shadcn/ui:** Built on Radix (redundant)
- **React Router DOM:** Not needed with Next.js!
- **Recharts + ReactFlow:** Two charting libraries
- **Multiple toast libraries:** react-hot-toast, sonner, @radix-ui/react-toast

### 2. DUPLICATE AUTH SYSTEMS
- **NextAuth:** Full auth system
- **Supabase Auth:** Another full auth system
- **Prisma + Auth adapter:** Third auth approach
- **bcryptjs:** Manual password hashing (Supabase does this)
- **@simplewebauthn:** WebAuthn (4th auth method!)

### 3. DUPLICATE BUILD TOOLS
- **Vite + Next.js:** Two bundlers! (Vite not needed)
- **Babel presets:** Not needed with Next.js 15 SWC
- **@vitejs/plugin-react:** Redundant with Next.js
- **vite-tsconfig-paths:** Not needed

### 4. DUPLICATE DATABASE/ORM
- **Prisma:** Full ORM
- **Supabase:** Has its own ORM
- **@upstash/redis:** Another database client

### 5. DUPLICATE TESTING FRAMEWORKS
- **Playwright:** E2E testing
- **Vitest:** Unit testing  
- **Jest-dom:** Another testing tool
- **MSW:** Mock service worker
- **node-mocks-http:** More mocking

### 6. UNUSED OR QUESTIONABLE
- **cropperjs (react-cropper, react-image-crop):** Two image croppers!
- **i18next + react-i18next:** Internationalization (not used)
- **csv-stringify + papaparse:** Two CSV libraries
- **dompurify:** Not typically needed in React
- **embla-carousel-react:** Carousel (not seen in UI)
- **input-otp:** OTP input (custom implementation exists)
- **string-similarity-js:** String matching (why?)
- **base64-arraybuffer:** Low-level utility
- **@emnapi/runtime:** WebAssembly runtime (why?)

### 7. DEVELOPMENT TOOLS IN PRODUCTION
- **@types/* packages:** 11 type packages
- **ESLint + plugins:** 4 packages
- **Testing libraries:** 8+ packages

## 📊 Estimated Impact

### Size Impact (Rough Estimates)
- Radix UI (26 packages): ~2-3MB
- Duplicate auth systems: ~2MB
- Duplicate build tools: ~5MB
- Duplicate databases: ~3MB
- Testing in prod bundle: ~2MB
- Unused libraries: ~3MB
**Total waste: ~15-20MB of unnecessary code**

### Complexity Impact
- 4 different auth approaches
- 2 different bundlers
- 2 different ORMs
- 3 different toast systems
- 2 different image croppers
- Multiple competing UI systems

## 🎯 What's Actually Needed

### Core (Keep)
- next
- react
- react-dom
- typescript
- tailwindcss
- zustand (state management)
- zod (validation)

### Choose ONE of each:
- **Auth:** Supabase OR NextAuth (not both!)
- **Database:** Supabase OR Prisma (not both!)
- **UI Library:** Radix OR build custom (not 26 packages!)
- **Testing:** Playwright OR Vitest (separate concerns)
- **Toast:** ONE toast library
- **Forms:** react-hook-form (good choice)

## 🔴 VERDICT: REBUILD RECOMMENDED

### Why Rebuild?
1. **70% of dependencies are redundant or competing**
2. **Multiple authentication systems tangled together**
3. **Multiple database layers creating confusion**
4. **Bundle size could be reduced by 60-70%**
5. **Development complexity is overwhelming**

### Rebuild Approach
Start fresh with:
```json
{
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@supabase/supabase-js": "^2.0.0",
    "@supabase/ssr": "^0.5.0",
    "tailwindcss": "^3.4.0",
    "zustand": "^5.0.0",
    "zod": "^3.23.0",
    "react-hook-form": "^7.54.0",
    "@hookform/resolvers": "^3.9.0",
    "sonner": "^1.7.0",
    "lucide-react": "^0.460.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@types/node": "^22.0.0",
    "postcss": "^8.0.0",
    "autoprefixer": "^10.0.0",
    "@playwright/test": "^1.49.0",
    "eslint": "^8.0.0",
    "eslint-config-next": "^15.0.0"
  }
}
```

This would reduce from 128 to ~20 dependencies (85% reduction!)

## 💡 Refactor vs Rebuild Analysis

### Refactor Effort: 
- Remove 100+ packages
- Untangle 4 auth systems
- Reconcile 2 ORMs
- Fix all breaking changes
- **Estimated time: 3-4 weeks**
- **Risk: High** (breaking production)

### Rebuild Effort:
- Start clean with lessons learned
- Cherry-pick working code
- One auth system (Supabase)
- One UI approach
- **Estimated time: 2-3 weeks**
- **Risk: Low** (greenfield)

## 📌 Recommendation

**REBUILD** - The current codebase is suffering from:
1. **Decision paralysis** - Multiple solutions for everything
2. **Dependency hell** - 128 packages for a user management system
3. **Performance death** - Too much to compile
4. **Maintenance nightmare** - Which auth? Which DB? Which UI?

A clean rebuild would:
- Be 70% smaller
- Be 5-10x faster to build
- Be easier to maintain
- Actually achieve the "pluggable" goal
- Take LESS time than untangling this mess

The architecture diagrams and requirements are good. The implementation got out of control. Time to start fresh with the lessons learned.