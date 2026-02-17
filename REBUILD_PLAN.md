# Rebuild Plan — Rincewind

## What's Sound (Keep)

### 1. Prisma Schema (`prisma/schema.prisma`)
- Real DB model, all snake_case
- Two schemas: `auth` (Supabase managed) and `public` (our tables)
- Key models: users, profiles, organizations, organization_members, team_licenses, team_members, subscriptions, permissions, roles, user_roles, api_keys, webhooks

### 2. Core Interfaces & Models (`src/core/`)
- Clean domain models in camelCase
- Well-defined interfaces for auth, team, permission, user, notification
- Events system

### 3. Adapter Layer (`src/adapters/`)
- 95% tests passing
- Translates between camelCase (services) and snake_case (DB)
- Factory pattern, pluggable providers (supabase, prisma, mock)
- This is the most valuable code in the repo

### 4. Service Layer (`src/services/`)
- Clean interfaces, mostly correct
- Some wiring issues but structurally sound

### 5. UI Component Library (`src/ui/`)
- Headless + Styled split (good architecture)
- shadcn/ui primitives
- Needs alignment but structure is right

### 6. PRD (`docs/Product documentation/PRD.md`)
- Source of truth for what to build

## What's Broken (Rewrite/Fix)

### 1. API Routes (`app/api/`)
**Problem**: Routes bypass the service/adapter layer and hit Prisma directly with wrong field names (camelCase instead of snake_case). They also assume relationships and fields that don't exist.

**Fix approach**: Routes should call services, not Prisma. For each route:
1. Identify what service method it needs
2. Check if that method exists in the service layer
3. If yes: rewrite route to use service
4. If no: add method to service, then rewrite route
5. Run tests after each file

### 2. Tests
**Problem**: Tests were written against imagined implementations, not real ones.

**Fix approach**: Fix tests AFTER fixing the code they test. Don't fix tests to match broken code.

### 3. Stale docs and scripts
**Problem**: Docs describe a different codebase. Scripts are Windows-specific or outdated.

**Fix approach**: Clean up after the code is stable.

## Architecture Layers (correct flow)

```
Route Handler (app/api/)
  → Service Layer (src/services/)
    → Adapter Layer (src/adapters/)
      → Database (Prisma/Supabase) [snake_case]
    ← Returns camelCase domain models
  ← Returns camelCase to client
```

Routes should NEVER import prisma directly. If they do, that's a bug.

## Execution Order

### Phase 1: Make routes use services (biggest impact)
Fix `app/api/team/` routes first (most broken), then company, then admin.

### Phase 2: Fix remaining production TS errors
With routes going through services, many TS errors disappear automatically.

### Phase 3: Fix tests to match reality
Update test expectations to match actual service/route contracts.

### Phase 4: Clean up
Remove stale docs, dead scripts, .bak files, debug screenshots.

## Rules
- Fix one file at a time
- Run tsc + relevant tests after each change
- No blind find-and-replace
- Understand before changing
