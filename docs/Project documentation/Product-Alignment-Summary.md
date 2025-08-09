## Product Alignment Summary (H1-MVP → Current Implementation)

Source docs
- 01-Project-Brief.md
- 02-PRD.md (authoritative scope tags: [Scope: H1-MVP], [H1-Core], [H2-Enterprise])
- 03-Architecture.md, 03.1, 03.2, 04-UI-UX-Specification.md

### H1-MVP features and status snapshot

- Authentication (register, login, logout, session validation, email verification, reset/update password)
  - Backend: implemented under `app/api/auth/**` with handlers and middleware; aligns with PRD endpoints and acceptance criteria.
  - Gaps: confirm rate-limit middleware on resend verification/reset endpoints; ensure lockout after 5 failed attempts is enforced.

- Profile management (get/update profile, avatar upload)
  - Backend: routes present under `app/api/profile/**` with upload endpoints and validations.
  - Gaps: double-validate image content sniffing and size limits per PRD; verify visibility/consent toggles exist or stub.

- Account deletion
  - Backend: endpoint exists; verify flow requires password/confirmation and retention policy application per PRD.

- Account security (change password, change email with verify-new-email)
  - Backend: change password route present; change-email/verify-new-email flow needs verification against PRD token flows and notifications.

- Billing (Stripe): checkout session, portal session, webhook, subscription status
  - Backend: present under `app/api/subscriptions/**` and `app/api/webhooks/stripe`.
  - Gaps: re-check idempotency, signature validation, and local subscription sync logic per PRD.

### Architecture compliance (non-negotiable)

- Interface-first services and adapters
  - Present conceptually (services, adapters); audit needed to ensure service contracts are provider-agnostic and have mock implementations per PRD quality gate.

- Headless UI with vendor-secure elements
  - UI layered (headless/styled). Confirm sensitive payment inputs rely on vendor components when embedded.

- Configuration-driven providers
  - ENV-driven selection partially present; consolidate into a single service container for auth, payments.

### Business & team features (Phases 3-6) — status snapshot

- Business registration & company profile  
  - Routes scaffolded under `app/api/company/**` and `app/api/organizations/**`.  
  - Missing UI flow wiring and validation for company size, industry, contact fields (PRD 3.1 §20-31).  
- Team invitations / member list / role updates  
  - DB tables & adapters exist; API shells present (`/api/team/**`).  
  - Invite-send, accept, revoke, seat-limit enforcement not yet connected to UI.  
- RBAC & admin console  
  - Role enum and middleware in place.  
  - Admin dashboard widgets and granular permission mapping still TODO.

### Advanced authentication (SSO & MFA) — gap list

- SSO providers  
  - OAuth handlers exist for GitHub/Google but not surfaced in UI.  
  - Email-collision linking & domain-verified auto-join logic unimplemented (PRD 4.1 §24-27, 4.2 §53-56).  
- MFA (TOTP)  
  - Secret generation & verification routes present; backup-code generation/storage missing.  
  - UI setup & interstitial login step not wired.  
  - Policy enforcement hooks for “Require MFA” pending.

### Subscription & billing — remaining tasks

- Seat licensing & plan gating  
  - Stripe products & prices synced; seat-count column on `organization` table.  
  - API middleware to enforce limits and UI upgrade prompts not yet implemented.  
- Invoice surfacing  
  - Portal link works; in-app invoice list (PRD 5.7) absent.  
- Usage-limit error messaging and feature toggles need integration.

### Service-layer compliance checklist

| Area | Direct adapter calls found | Action |
|------|---------------------------|--------|
| `app/api/*` routes | 17/92 import adapters directly | Refactor to call corresponding service |
| React hooks | 3 hooks bypass services | Wrap with service interface |
| Cron/jobs | ok | — |

### Road to Horizon-2 (external product)

1. Centralise `configureUserManagement()` factory exposing all service overrides & feature flags.  
2. Finish MFA & RBAC to satisfy enterprise security baseline.  
3. Implement custom-field extender & webhooks as per Refactor Doc §5.  
4. Harden multi-tenant data isolation & configurability for DB-agnostic adapters.

### Client/server boundary hardening

- Status: audit logger fixed; webpack aliases block realtime on client; remaining work tracked in Client-Server-Boundary-Checklist.

### Immediate actions (next)

1) Finalise config boundary split (Phase 1 tasks)  
2) Consolidate Supabase server entry (Phase 2)  
3) Wire company registration & team invite flows (Phase 3/6)  
4) Surface SSO buttons & add MFA setup UI (Phase 4)  
5) Add seat-count enforcement & upgrade prompts (Phase 5)  
6) Migrate remaining UI Supabase usages to API (Phase 3)  
7) Add ESLint guardrails & architectural rule tests (Phase 4)

This document will be updated as each phase completes.

