## Client/Server Boundary Hardening & Supabase Isolation – Action Checklist

Goals
- Prevent client bundles from importing server-only modules (Supabase, fs/path, Node shims).
- Centralize Supabase usage behind one server entry point and API routes for UI.
- Add guardrails to stop regressions.

Acceptance criteria
- No client-side runtime errors referencing Supabase/Realtime/whatwg-url.
- No “Critical dependency: the request of a dependency is an expression” caused by client code importing server config.
- UI features previously using direct Supabase now call API endpoints.

Links
- Build config: [next.config.mjs](mdc:next.config.mjs)
- Current audit logger: [src/lib/audit/auditLogger.ts](mdc:src/lib/audit/auditLogger.ts)
- Runtime config: [src/core/config/runtime-config.ts](mdc:src/core/config/runtime-config.ts)
- Product docs (source of truth):
  - [01-Project-Brief.md](mdc:docs/refactor for final product/01-Project-Brief.md)
  - [02-PRD.md](mdc:docs/refactor for final product/02-PRD.md)
  - [03-Architecture.md](mdc:docs/refactor for final product/03-Architecture.md)
  - [03.1-Development-Methodology.md](mdc:docs/refactor for final product/03.1-Development-Methodology.md)
  - [03.2-Implementation-Guide.md](mdc:docs/refactor for final product/03.2-Implementation-Guide.md)
  - [04-UI-UX-Specification.md](mdc:docs/refactor for final product/04-UI-UX-Specification.md)

### Phase 0 — Product alignment
- [ ] Confirm scope alignment with PRD (H1-MVP): auth flows, profile, password/email changes, subscription API, webhook, status endpoint
- [ ] Map PRD endpoints to current code (App Router under `app/api/**`) and flag gaps
- [ ] Verify architecture compliance (interface-first, adapters, headless UI) across auth, profile, billing modules
- [ ] Record deltas and decisions in Alignment Summary doc
- [ ] Create/verify stubs for missing H1-Core items referenced indirectly (teams, activity log) without implementing yet

### Completed
- [x] Make `logUserAction` client-safe (dynamic server import; browser POST fallback)
  - Edit: [src/lib/audit/auditLogger.ts](mdc:src/lib/audit/auditLogger.ts)

### Phase 1 — Config boundary split
- [ ] Create `src/lib/config.server.ts` that re-exports `getConfig/getServerConfig` from `src/core/config/runtime-config` (server-only)
- [ ] Stop re-exporting server-only symbols from `src/lib/config.ts` (keep only plain constants safe for client)
- [ ] Update all imports using server config to `@/lib/config.server`
- [ ] Verify dev logs are free of the “Critical dependency” warning in client paths

### Phase 2 — Supabase entry-point consolidation (server)
- [ ] Create `src/lib/database/server-supabase.ts` with a single exported `supabase` (strongly typed generics) and helpers
- [ ] Replace direct `createClient(...)` usage across adapters/services with imports from `@/lib/database/server-supabase`
- [ ] Retire/alias `src/lib/database/index.ts` to the server entry (ensure no client imports)
- [ ] Confirm `next.config.mjs` keeps `@/lib/database/supabase` aliased to the browser shim for accidental UI imports

### Phase 3 — UI migration off Supabase to API routes
Replace Supabase calls with `fetch` to existing endpoints (or add minimal endpoints if missing).
- [ ] `src/ui/styled/settings/DataImport.tsx`
- [ ] `src/ui/styled/search/SearchPage.tsx`
- [ ] `src/ui/styled/common/FileManager.tsx`
- [ ] `src/ui/headless/settings/DataImport.tsx`
- [ ] `src/ui/headless/account/AccountSwitcher.tsx`
- [ ] `src/ui/headless/common/FileManager.tsx`
- [ ] `src/ui/headless/common/FeedbackForm.tsx`
- [ ] `src/ui/styled/account/AccountSwitcher.tsx`

### Phase 4 — Guardrails (ESLint)
- [ ] Add `no-restricted-imports` rules:
  - Forbid `@supabase/supabase-js` and `@/lib/database/server-supabase` in client code (`src/ui/**`, `src/hooks/**`, files with `"use client"`)
  - Forbid importing `src/core/config/runtime-config` from non-server modules; require `@/lib/config.server`
- [ ] Optional dev-only runtime assert to throw if server entry is imported in browser

### Phase 5 — Realtime bundling check
- [x] Ensure `@supabase/realtime-js` is aliased to `false` in client builds (see [next.config.mjs](mdc:next.config.mjs))
- [ ] Verify no Realtime/whatwg-url code appears in client chunk traces

### Phase 6 — Sanity scans (repeatable)
- [ ] Scan for direct Supabase imports in UI/hooks
  - Command: `rg "@supabase/supabase-js" src/ui src/hooks`
- [ ] Scan for `createClient(` in UI/hooks
  - Command: `rg "createClient\(" src/ui src/hooks`
- [ ] Scan for `fs|path|require\(` in modules used by client
  - Command: `rg "\brequire\(|\bfs\b|\bpath\b" src | rg -v "\.server|server-"`

### Phase 7 — Verification
- [ ] Dev run: `npm run dev` (no critical dependency warnings from client paths)
- [ ] Smoke: navigate key pages; no runtime errors; auth flows OK
- [ ] Build: `npm run build` succeeds without bundling server-only deps into client

Notes
- UI imports of `@/lib/database/supabase` currently resolve to a browser shim by design; these items in Phase 3 restore real functionality via API routes.
- Keep documentation updated if new patterns emerge.

