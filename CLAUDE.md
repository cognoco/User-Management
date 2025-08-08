# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Build and Development**
- `npm run dev` - Start Next.js development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues automatically

**Testing**
- `npm test` - Run Vitest unit tests
- `npm run test:coverage` - Run tests with coverage
- `npm run test:ui` - Run tests with Vitest UI
- `npx playwright test` - Run all E2E tests
- `npx playwright test <path>` - Run specific E2E test file
- `npx playwright test <path> --grep="test name"` - Run specific test
- `npx playwright test <path> --project="Desktop Chrome" --headed` - Run with specific browser

**Error Checking**
- `npm run error:search` - Search for error codes in codebase
- `npx tsc --noEmit` - Check TypeScript errors without emitting files
- Check `typescript-errors.txt` for current known errors

## Architecture Overview

This is a **modular, pluggable User Management System** built with Next.js 15, designed to be integrated into any web application. The architecture follows strict separation of concerns and is database-agnostic.

### Core Architecture Principles

**CRITICAL**: All development MUST follow the [Architecture Guidelines](./docs/Product%20documentation/Architecture%20Guidelines.md) and [Architecture Rules](./docs/Product%20documentation/Architecture%20Rules.md). These are non-negotiable requirements that ensure the module remains modular and pluggable.

### Key Architectural Layers

1. **Core Layer** (`src/core/`) - Business logic interfaces and models
   - Defines contracts for all data providers and services
   - Contains domain models and events
   - Platform-agnostic business rules

2. **Adapters Layer** (`src/adapters/`) - Data provider implementations
   - Database-specific implementations (Supabase, Prisma, Mock)
   - Configurable via `AdapterRegistry` pattern
   - Easy to swap implementations without changing business logic

3. **Services Layer** (`src/services/`) - Business logic implementation
   - Uses core interfaces to remain adapter-agnostic
   - Factory pattern for service creation
   - Client/server-aware service selection

4. **UI Layer** (`src/components/ui/`, `src/ui/`) - Three UI variants:
   - **Headless** (`src/ui/headless/`) - Logic only, no styling
   - **Primitives** (`src/ui/primitives/`) - Basic styled components
   - **Styled** (`src/ui/styled/`) - Fully styled components

### Application Initialization

The app initializes through `src/core/initialization/appInit.ts`:
- Configures all service providers via factories
- Registers adapters in the `AdapterRegistry`
- Sets up feature flags and configuration
- Handles client/server-specific service selection

### Database Abstraction

The system is truly database-agnostic:
- Switch between providers by changing configuration
- Currently supports: Supabase, Prisma, Mock
- Add new providers by implementing core interfaces
- Connection details via environment variables or config file

### State Management

- **Zustand** stores for client state (`src/lib/stores/`)
- **Context providers** for app-wide configuration
- **Event system** for cross-module communication

## Key Configuration Files

- `userManagement.config.ts` - Main configuration file
- `src/core/config/` - Configuration interfaces and runtime config
- `.env.local` - Environment variables (copy from `.env.example`)

## Testing Strategy

### E2E Testing with Playwright
- Tests located in `e2e/` directory
- Before running E2E tests, read the relevant feature documentation in `docs/Product documentation/functionality-features-phase*.md`
- Run tests incrementally, not the entire suite
- Focus on user flows and critical functionality

### Unit Testing with Vitest
- Test files use `.test.ts` or `.test.tsx` extensions
- Mocks are global, located in `src/tests/mocks/`
- Follow the file structure guidelines in `docs/File structure guidelines.md`

## Feature Implementation Status

**Fully Implemented (Phase 1-2)**
- Core Authentication (email/password, OAuth, password reset)
- User Profile Management (basic profile, avatar upload, settings)
- Basic Security (password hashing, CSRF protection, sessions)

**Partially Implemented (Phase 3-5)**
- Subscription System (UI components, payment processing)
- Advanced Security (2FA framework, rate limiting, audit logging)
- Team/Organization Management (basic structure, role hierarchy)

**Planned (Phase 6+)**
- Enterprise features (SSO, compliance reports)
- Advanced audit trails and session management
- API key management and webhook system

## Important Development Rules

1. **Modular First**: Build features as pluggable modules that can be enabled/disabled
2. **Database Agnostic**: Use adapter interfaces, never directly couple to Supabase
3. **UI Separation**: Keep business logic separate from UI components
4. **Interface-Based**: All services must implement core interfaces
5. **Configuration Driven**: Features should be toggleable via configuration

## File Structure Guidelines

Always follow the conventions in `docs/File structure guidelines.md` when creating new files. Check for existing files before creating duplicates.

## Documentation References

- [Setup Guide](docs/Product%20documentation/SETUP.md)
- [Testing Documentation](docs/Testing%20documentation/TESTING.md)
- [API Documentation](docs/Product%20documentation/API.md)
- [Architecture Guidelines](docs/Product%20documentation/Architecture%20Guidelines.md)
- [Gap Analysis](docs/Project%20documentation/GAP_ANALYSIS.md)

## Environment Setup

Required environment variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_APP_URL`

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **UI**: Tailwind CSS, Shadcn UI, Radix UI primitives
- **State**: Zustand, React Context
- **Database**: Supabase (configurable via adapters)
- **Testing**: Vitest, React Testing Library, Playwright, MSW
- **Build**: Next.js with TypeScript, ESLint

Never introduce new technologies without approval. The stack is intentionally curated for stability and modularity.

## Cursor Integration Rules

Key development constraints from Cursor configuration:
- **NEVER USE REAL API KEYS** in any config file - always reference .env file
- **ALWAYS READ** `docs/Product documentation/Architecture Guidelines.md` before making changes
- **ACCESS ALL FILES** directly - don't ask users to share code or check files and imports
- Focus on the big picture and process understanding rather than step-by-step explanations
- **DO NOT CHANGE OR CREATE .ENV FILES** - you can read them but not modify them

## Important Development Patterns

### File Naming and Import Paths
- Recent work has focused on standardizing import paths and fixing TypeScript errors
- Follow the established patterns in `src/` for import paths
- Use the factory pattern extensively for service creation
- Check existing implementations before creating new ones

### Error Handling
- Error codes are tracked and searchable via `npm run error:search`
- TypeScript errors are tracked in `typescript-errors.txt`
- Use the established error code registry in `src/core/common/errorCodeRegistry.ts`

### UI Component Architecture
The codebase uses a three-tier UI system:
- **Headless components** (`src/ui/headless/`) - Pure logic, no styling
- **Primitive components** (`src/ui/primitives/`) - Basic styled building blocks  
- **Styled components** (`src/ui/styled/`) - Fully featured, domain-specific components

Always check which tier is appropriate before creating new UI components.