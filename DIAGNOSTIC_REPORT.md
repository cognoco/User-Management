# User-Management Project Diagnostic Report

**Generated:** 2026-02-17  
**Method:** Live code analysis — `tsc --noEmit`, `vitest run` by directory, grep-based source inspection.  
**Note:** Documentation was intentionally ignored. All findings are sourced from the code.

---

## 1. TypeScript Error Summary

**Total errors: 2,811**

### Error Type Breakdown

| Error Code | Count | Meaning |
|---|---|---|
| TS2339 | 984 | Property does not exist on type |
| TS2322 | 297 | Type mismatch / not assignable |
| TS2345 | 206 | Argument type mismatch |
| TS7006 | 170 | Parameter implicitly has `any` type |
| TS2308 | 163 | Ambiguous re-export (duplicate names) |
| TS2551 | 141 | Property doesn't exist (did you mean X?) |
| TS2305 | 81 | Module has no exported member |
| TS2554 | 79 | Wrong number of arguments |
| TS2353 | 72 | Object literal has unrecognized properties |
| TS7005 | 68 | Variable implicitly has `any` type |
| TS2304 | 49 | Cannot find name |
| TS2614 | 16 | Module has no exported member (default vs named) |

### Error Distribution by Layer

| Layer | Error Count |
|---|---|
| `src/ui/` | 607 |
| `src/adapters/` | 462 |
| `src/lib/` | 332 |
| `src/tests/` | 304 |
| `app/api/` | 304 |
| `src/services/` | 191 |
| `src/hooks/` | 85 |
| `e2e/` | ~150 |
| `src/core/` | 54 |

### Files With Most Errors

| File | Errors |
|---|---|
| `src/index.ts` | 126 |
| `src/adapters/permission/supabase-permission-provider.ts` | 71 |
| `src/adapters/team/supabase-team-provider.ts` | 49 |
| `src/adapters/user/supabase-user-provider.ts` | 48 |
| `src/ui/styled/profile/AccountSettings.tsx` | 46 |
| `src/lib/stores/__tests__/auth.store.test.ts` | 43 |
| `e2e/auth/mfa/mfa-management.e2e.test.ts` | 42 |
| `src/ui/styled/permission/PermissionEditor.tsx` | 37 |
| `src/tests/integration/api-error-messages.test.tsx` | 33 |
| `src/services/permission/__tests__/mocks/mock-permission-service.ts` | 30 |

### Top TS2339 Properties That Don't Exist

The 984 "property does not exist" errors cluster around a small set of root causes:

| Missing Property | Count | Root Cause |
|---|---|---|
| `.from` | 171 | Supabase mock's `.from()` method not typed |
| `.getState` | 91 | Zustand store type doesn't include `.getState()` |
| `.setState` | 24 | Same Zustand issue |
| `.mockResolvedValue` / `.mockResolvedValueOnce` | 32 | Test mock typing |
| `.getUser` | 13 | `supabase.auth.getUser` not on mock type |
| `.addressService` | ~7 | `ServiceContainer` has `address`, not `addressService` |

---

## 2. Test Results Summary

Tests run by directory using `npx vitest run <dir> --reporter=verbose`.

### Results Table

| Directory | Files Failed | Files Passed | Tests Failed | Tests Passed | Skipped |
|---|---|---|---|---|---|
| `src/core/` | 5 | 8 | 26 | 34 | 0 |
| `src/services/` | 21 | 30 | 58 | 136 | 0 |
| `src/hooks/` | 7 | 27 | 27 | 94 | 0 |
| `src/adapters/` | 1 | 14 | 2 | 41 | 0 |
| `src/lib/` | 31 | 46 | 112 | 236 | 0 |
| `src/tests/` | 27 | 13 | 67 | 56 | 3 |
| `app/api/` | 89 | 19 | 246 | 68 | 2 |
| **TOTAL** | **181** | **157** | **538** | **665** | **5** |

**Overall pass rate: 55% tests, 46% files**  
**Unhandled errors (crash-level): 22**

### Failure Patterns by Directory

#### `app/api/` — 246 failing (worst area)
- Almost all route tests return HTTP 500 instead of expected 200/400/404
- Root cause: service injection broken; services that routes depend on aren't available
- Even valid requests fail because of the `ServiceContainer` naming mismatch

#### `src/lib/` — 112 failing
- `indexedDB is not defined` — `request-queue.ts` uses browser IDB API, no mock in test env
- Store tests fail because Zustand's `.getState()` / `.setState()` not recognized on typed stores
- Multiple auth store tests broken due to supabase mock shape mismatch

#### `src/tests/` — 67 failing, 8 unhandled errors
- Integration tests fail due to over-mocking + testing-library element errors
- `TypeError: Expected an element or document but got Object` in theme tests
- Tests written for a different component API than what exists

#### `src/services/` — 58 failing
- `Adapter 'user' not registered in AdapterRegistry` cascade: `DefaultPermissionService` constructor instantiates `ResourcePermissionResolver` → calls `getApiUserService()` → hits empty `AdapterRegistry`
- Several tests expect `true` from service methods that return `false`/`undefined`

#### `src/core/` — 26 failing
- `ReferenceError: jest is not defined` — 13 instances of `jest.fn()` / `jest.clearAllMocks()` in tests never migrated from Jest to Vitest
- `TypeError: ServerStorage is not a constructor` — class exported incorrectly

#### `src/hooks/` — 27 failing
- Hook return objects are missing properties that tests assert on (e.g. `isError` is `undefined`)
- Hook contracts diverged from what app pages and tests expect

#### `src/adapters/` — 2 failing
- `createSupabaseDatabaseProvider is not defined` at runtime — ESM import without file extension in factory

---

## 3. Top 10 Critical Issues

### Issue #1 — `src/index.ts` Duplicate Barrel Exports (126 TS errors)
**Severity: HIGH | Effort: SMALL**

`src/index.ts` does:
```ts
export * from './ui/styled';   // exports AccountDeletion, ApiKeyForm, etc.
export * from './ui/headless'; // exports SAME names again
```
Both `./ui/styled/index.ts` and `./ui/headless/index.ts` export identically-named components (e.g. `AccountDeletion`, `AdminDashboard`, `ApiKeyForm`, etc.). TypeScript raises TS2308 for every duplicate — 126 errors in one file.

**Fix:** Either use explicit named re-exports with prefixes (`StyledAccountDeletion`), or have `./ui/styled` export exclusively and `./ui/headless` not be re-exported from the top-level barrel, or use `export { AccountDeletion } from './ui/styled'` explicitly.

---

### Issue #2 — `ServiceContainer` Naming Duality (TS2339 cascade in routes)
**Severity: HIGH | Effort: MEDIUM**

`src/core/config/interfaces.ts` defines TWO separate interfaces:
- `ServiceContainer` — uses short names: `address`, `auth`, `user`, `team`
- `ServiceConfig` — uses long names: `addressService`, `authService`, `userService`

`createApiHandler` in `src/lib/api/route-helpers.ts` passes a `ServiceContainer` to route handlers. But many routes call `services.addressService`, `services.profileService`, etc. — properties that only exist on `ServiceConfig`, not `ServiceContainer`. Result: TS2339 errors across all affected API routes, and at runtime the properties are `undefined`, causing 500 errors on valid requests.

**Fix:** Pick one convention and apply it everywhere. Easiest: add `addressService`, `profileService` etc. as aliases in `ServiceContainer`, or update all route handlers to use the short form (`services.address`).

---

### Issue #3 — Supabase Type Imports Don't Match Installed Version
**Severity: HIGH | Effort: MEDIUM**

Installed: `@supabase/supabase-js@2.49.8`, `@supabase/auth-js@2.69.1`

Multiple files import `{ User }` from `@supabase/supabase-js`, but supabase-js re-exports `User` as `AuthUser`. Files also import `AuthResponse`, `UserResponse`, `SignInWithPasswordCredentials` etc. — these exist in `@supabase/auth-js` but aren't always accessible via the supabase-js re-export path under `moduleResolution: "bundler"`.

Affected: `app/admin/audit-logs/page.tsx`, `app/admin/layout.tsx`, `app/admin/roles/page.tsx`, `app/admin/users/page.tsx`, `src/tests/mocks/supabase.ts`, `src/adapters/__tests__/mocks/supabase.ts`, and ~20+ more files.

**Fix:** Replace `import { User } from '@supabase/supabase-js'` with `import type { User } from '@supabase/auth-js'`. For `AuthResponse`, `UserResponse` etc., import directly from `@supabase/auth-js`.

---

### Issue #4 — `jest.fn()` Called in Vitest Tests (ReferenceError)
**Severity: HIGH | Effort: SMALL**

13 occurrences of `jest.fn()`, `jest.clearAllMocks()`, `jest.mock()` etc. in test files under `src/core/platform/__tests__/`. These were written for Jest and never migrated. Vitest does not provide a `jest` global (only `vi`), so they crash with `ReferenceError: jest is not defined` at test runtime.

**Fix:** Mechanical replacement — `jest.fn()` → `vi.fn()`, `jest.clearAllMocks()` → `vi.clearAllMocks()` etc. Also remove any `jest.mock()` calls and replace with `vi.mock()`.

---

### Issue #5 — AdapterRegistry Not Initialized in Tests (Cascade Crash)
**Severity: HIGH | Effort: MEDIUM**

`DefaultPermissionService` constructor creates a `ResourcePermissionResolver`, which calls `getApiUserService()`, which calls `AdapterRegistry.getAdapter('user')`. In the test environment, no adapters are registered, so this throws:
```
Error: Adapter 'user' not registered in AdapterRegistry
```
This kills any test that instantiates `DefaultPermissionService` — which is many service tests. The `vitest.setup.ts` doesn't register test adapters.

**Fix:** Add a `registerTestAdapters()` call in `vitest.setup.ts` that registers mock adapters for all service types, OR refactor `DefaultPermissionService` to accept the resolver as a constructor argument (dependency injection) so tests can pass a mock directly.

---

### Issue #6 — Missing Named Exports From Middleware/Auth Modules
**Severity: HIGH | Effort: SMALL**

Three specific import failures affecting multiple API routes:

1. `import { middleware } from '@/middleware'` — `src/middleware/index.ts` does NOT export `middleware`. Used in `app/api/profile/export/route.ts` and `app/api/profile/notifications/route.ts`.

2. `import { getSession } from '@/lib/auth/session'` — `src/lib/auth/session.ts` exports `getCurrentSession`, `getSessionFromRequest` — NOT `getSession`. Used in `app/api/retention/check/route.ts` and `app/api/retention/reactivate/route.ts`.

3. `import { RouteAuthContext } from '@/middleware/createMiddlewareChain'` — `createMiddlewareChain.ts` does not export this type. Used in multiple `app/api/admin/` routes.

**Fix:** Either add the missing exports/aliases, or update the importing files to use the correct names.

---

### Issue #7 — App Pages Calling Non-Existent Hook Properties
**Severity: HIGH | Effort: LARGE**

App pages destructure properties from hooks that the hooks don't return. Examples:

- `app/account/profile/page.tsx` uses `uploadAvatar`, `removeAvatar` from `useProfile` — hook doesn't expose these
- `app/admin/permissions/ClientPage.tsx` uses `permissionCategories`, `createPermission`, `updatePermission`, `deletePermission`, `createCategory`, `selectedPermission`, `setSelectedPermission` from `usePermission` — none returned by hook
- `app/admin/roles/ClientPage.tsx` uses `selectedRole`, `setSelectedRole` from `useRole` — not returned
- `app/admin/audit-logs/page.tsx` uses `supabase.auth.getUser` directly on a mock that only has `admin.*`

The hooks were implemented with a minimal API; app pages were coded to an older or planned-but-not-built API.

**Fix:** Extend the hooks to expose the missing properties, OR rewrite the app pages to use what the hooks actually provide. This requires aligning hook contracts with actual usage — audit all hooks.

---

### Issue #8 — Supabase Mock Shape Broken in Test Files
**Severity: MEDIUM | Effort: MEDIUM**

`src/tests/mocks/supabase.ts` and `src/adapters/__tests__/mocks/supabase.ts` import non-existent types from `@supabase/supabase-js`:
```ts
import type {
  AuthResponse,      // ← doesn't exist at this path in v2.49
  UserResponse,      // ← same
  SignInWithPasswordCredentials, // ← same
  AuthMFAListFactorsResponse,   // ← same
  MFAChallengeParams,           // ← same
  ...
}
```
Plus the mock's `.from()` method structure doesn't match how the real Supabase client is typed, causing 171 TS2339 "Property 'from' does not exist" errors in adapter tests.

**Fix:** Reconstruct mock using types imported from `@supabase/auth-js` directly. Use `as SupabaseClient` cast more carefully, and make `.from()` return a properly-typed query builder mock.

---

### Issue #9 — `indexedDB` / Browser APIs in Node Test Environment
**Severity: MEDIUM | Effort: SMALL**

`src/lib/offline/request-queue.ts` uses `indexedDB.open()` directly. When this module is loaded in the `jsdom` test environment (which doesn't include IndexedDB), it crashes with:
```
ReferenceError: indexedDB is not defined
```
This happens at module load time (in a `beforeAll`), so the entire test file is dead.

**Fix:** Add `fake-indexeddb` or `idb-keyval` mock to the test setup, or mock the `idb` module in `vitest.setup.ts`:
```ts
vi.mock('idb', () => ({ openDB: vi.fn() }));
```

---

### Issue #10 — ESM Import Without File Extension Breaks Database Factory
**Severity: MEDIUM | Effort: SMALL**

`src/adapters/database/factory/index.ts` uses:
```ts
export { createSupabaseDatabaseProvider } from './supabase-factory';
```
Without the `.ts` extension. While Vitest's transformer handles this, at runtime the factory's `switch` block calls `createSupabaseDatabaseProvider(config)` — which is `undefined` at that point because the module wasn't properly resolved. Test output: `ReferenceError: createSupabaseDatabaseProvider is not defined`.

This is actually a runtime ordering issue — the export works, but the `switch` uses the name in a way that the bundler doesn't tree-shake correctly without explicit extension. Vitest's ESM mode may also be tripping here.

**Fix:** Investigate whether the named export resolves correctly in Vitest's ESM mode; if not, use `import` instead of re-export + call pattern, or explicitly import inside the switch case.

---

## 4. Recommended Fix Order

### Phase 1 — Unlock TypeScript (get to zero compile errors)

| # | Fix | Effort | TS Errors Eliminated | Impact |
|---|---|---|---|---|
| 1 | Fix `src/index.ts` duplicate barrel exports | Small | ~126 | Barrel file compiles cleanly |
| 2 | Fix `jest.fn()` → `vi.fn()` in test files | Small | ~30 | Core tests can run |
| 3 | Add missing module exports (`middleware`, `getSession`, `RouteAuthContext`, `MFAManagementSection`) | Small | ~20 | Broken import chains fixed |
| 4 | Fix `@supabase/supabase-js` type imports (use `@supabase/auth-js` directly) | Medium | ~100 | Mock and adapter files type-check |
| 5 | Fix `ServiceContainer` naming — add `addressService` etc. or rename routes | Medium | ~50+ | API routes type-check |
| 6 | Fix Supabase mock shape (`src/tests/mocks/supabase.ts`) | Medium | ~170 | TS2339 `.from` errors eliminated |
| 7 | Fix Zustand store `.getState()` / `.setState()` typing | Medium | ~115 | Store tests compile |
| 8 | Align app pages with actual hook return types | Large | ~200 | UI layer compiles |
| 9 | Fix adapter TS2339s in `supabase-*-provider.ts` files | Large | ~170 | Adapter layer compiles |

### Phase 2 — Unlock Tests (get to >80% pass rate)

| # | Fix | Effort | Tests Unlocked |
|---|---|---|---|
| 10 | Register mock adapters in `vitest.setup.ts` | Small | ~30 service tests |
| 11 | Add `indexedDB` mock to test setup | Small | ~10 lib tests |
| 12 | Fix `ServerStorage` export in `src/core/platform/` | Small | ~5 core tests |
| 13 | Align service implementations with test expectations | Medium | ~58 service tests |
| 14 | Fix route handler service injection (Phase 1 fix #5) | Medium | ~246 API tests |
| 15 | Fix hook contracts (Phase 1 fix #8) | Large | ~27 hook tests |
| 16 | Reconstruct integration tests (many test wrong component APIs) | Large | ~67 integration tests |

### Phase 3 — Structural Cleanup

| # | Fix | Effort | Benefit |
|---|---|---|---|
| 17 | Remove direct Supabase usage from services (oauth, role, company-notification) | Medium | Architectural compliance |
| 18 | Add missing API routes for health, storage, recovery | Medium | Feature completeness |
| 19 | Decouple `DefaultPermissionService` constructor from global registry | Medium | Testability |
| 20 | E2E tests (Playwright) — fix auth utils, clean up broken helpers | Large | E2E coverage |

---

## 5. Root Cause Summary

The project was built by multiple AI agents over months with no single coherent handoff. The result:

1. **Two parallel naming conventions** coexist in the same interface file (`ServiceContainer` vs `ServiceConfig`) and neither is wrong by itself — but consumers mix them arbitrarily.

2. **Hooks were spec'd ahead of implementation.** App pages were written against a planned hook API. Hook implementations took a different shape. Nobody reconciled the two.

3. **Tests were copied from a Jest project** and never fully migrated to Vitest. 13 `jest.*` references still live in the codebase.

4. **The supabase mock** was written against an older API and has never been updated to match the installed library version.

5. **The barrel file (`src/index.ts`)** re-exports from both `./ui/headless` and `./ui/styled` without realizing dozens of component names are exported by both.

6. **Test setup doesn't initialize the adapter registry**, so any test that creates a service which internally calls `getServiceContainer()` will crash immediately — making the entire service layer effectively untestable as written.

---

## 6. What Actually Works

- `src/adapters/` — 41/43 adapter tests pass (95%). The adapter layer itself is largely sound.
- `src/hooks/` — 94/121 hook tests pass (78%). Many hooks work; the failures are contract mismatches.
- `src/services/` (when mocks work) — 136/194 pass (70%). Services that don't need the registry work fine.
- `src/core/` — 34/60 core tests pass (57%). The domain interfaces and validation logic are solid.
- TypeScript path aliases (`@/`) resolve correctly via `vite-tsconfig-paths` in Vitest.
- The adapter registry design (`src/adapters/registry.ts`) is architecturally sound — it just isn't initialized in tests.
- The `createApiHandler` pattern in `src/lib/api/route-helpers.ts` is a good abstraction — it just injects the wrong type.
