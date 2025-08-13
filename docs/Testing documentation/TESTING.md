# Testing Guidelines

## Core Testing Principles & Approach

node scripts/update-test-results.js to update the result md files if needed
node scripts/run-tests.js to run and show results directly in terminal

### A. Production-First, Test-Second Approach
- The project now follows a production-first, test-second approach for new features.
- Test skeletons are only created in advance if a feature is high-risk or likely to cause regressions.
- This ensures that tests are always written against the real, user-facing implementation.

### B. Documenting New Issues (in TESTING_ISSUES-UnitTests.md or TESTING_ISSUES-E2E.md )
- For ongoing issues, specific solutions, and advanced patterns learned from troubleshooting, refer to `TESTING_ISSUES.md`.
- Update `TESTING_ISSUES.md` as new specific issues or complex solutions are discovered during post-implementation testing.

## Philosophy & Best Practices
- Focus on user-centric, integration, and E2E tests that reflect real user flows.
- Avoid over-mocking; prefer real implementations unless isolation is required.
- Use robust selectors (getByRole, getByLabelText) and avoid implementation details.
- Align Zod schemas with rendered form fields to prevent validation/test failures.
- When refactoring a test, keep all current functionality! 
- The tests are working tool- their main task is to find bugs. Do not fix tests in such ways that they pass even with missing or wrong app codebase, apis, hook implementaions.
-Use mocks as little as possilbe, use the real thing! 

## Stack & Tooling
- **Unit/Integration:** Vitest, React Testing Library, User Event, MSW, JSDOM, Jest-DOM.
- **E2E:** Playwright (with data-testid selectors, robust locators, and API mocking via page.route).
- **i18n:** i18next with English as the default for tests; see i18nTestSetup for details.
- **Centralized Mocks:** All major stores (Zustand), Supabase, Axios, and API endpoints are mocked globally in `src/tests/mocks/`.

## Test Environment Setup
- **Global Setup:**
  - All tests use `vitest.setup.ts` for global mocks, polyfills, and environment variables.
  - MSW is configured for Node (Vitest) and browser (Playwright/component tests) with handlers in `src/tests/mocks/handlers.ts`.
  - i18n is initialized for English and mocked for synchronous translation.
  - Providers (Theme, QueryClient, etc.) are wrapped via `renderWithProviders` utility.
- **Mocking Patterns:**
  - **Supabase:** Use the builder chain mock pattern (see issues file for details).
  - **Axios:** Use `vi.spyOn` for direct mocking in Node; MSW for fetch/XHR in browser.
  - **Zustand:** Use centralized store mocks with getState/setState/subscribe/destroy.
  - **API:** Use MSW handlers for all API endpoints; reset state between tests.

## Writing Tests
- Use `userEvent` for all user interactions; always wrap in `await act(async () => { ... })` or `waitFor` for async updates.
- Set up all mocks before importing the module under test; use dynamic import if needed.
- Assert on visible output, not internal state.
- Provide valid, realistic mock data for all required props.
- For i18n, use the provided test setup and ensure all keys are present in en.json.

## Running Tests
- **Unit/Integration:** `pnpm test` or `vitest run` (see package.json for scripts).
- **E2E:** `pnpm e2e` or `playwright test` (see Playwright config for details).
- **Coverage:** `pnpm test --coverage` (thresholds enforced in CI).

### Toggling Supabase for E2E
The E2E suite can run entirely with mocks or against a real Supabase backend.

1. **Default (Mocks Only)**
   - `E2E_USE_SUPABASE` is set to `false` in `.env.example` and CI.
   - Playwright global setup starts an MSW server that mocks Supabase endpoints.
   - Use this mode when developing locally or when the backend is unavailable.

2. **Real Supabase**
   - Export `E2E_USE_SUPABASE=true` along with your Supabase credentials.
   - Global setup will create test users using the service role key.
   - Be aware that tests may modify data in your project; use a dedicated test project.

If setup fails (missing credentials or network issues), tests log the error but continue so they can be skipped or fail gracefully.

## Test Skeletons & Utilities
- Templates for new tests are in `src/tests/integration/` and `src/tests/__helpers__/`.
- Use `renderWithProviders` for all component/integration tests.
- All global mocks/utilities are in `src/tests/mocks/` and `src/tests/utils/`.

## References
- For ongoing issues, solutions, and remediation plans, see `Testing Issues and Solutions.md`.

## Project-Specific Testing Rules

### File Organization & Naming
- **Prevent Duplication:** Before creating ANY new test file, thoroughly check all directories to ensure a similar file doesn't already exist elsewhere.
- **Consistent Structure:** Place tests in `__tests__` directories alongside the code they test, following the architecture layers:
  ```
  /src/core/auth/__tests__/           # Tests for core interfaces and models
  /src/adapters/supabase/__tests__/   # Tests for Supabase adapters
  /src/services/auth/__tests__/       # Tests for service implementations
  /src/hooks/auth/__tests__/          # Tests for React hooks
  /src/ui/headless/auth/__tests__/    # Tests for headless components
  /src/ui/styled/auth/__tests__/      # Tests for styled components
  ```
- **Naming Convention:** Use kebab-case for test files with `.test.ts` or `.test.tsx` extension:
  ```
  auth-service.test.ts
  supabase-auth-provider.test.ts
  use-auth.test.ts
  login-form.test.tsx
  ```

### Testing Approach & Priorities
- **Architecture-Aligned Testing:** Test each layer of the architecture in isolation.
- **Interface-Based Testing:** Test against interfaces, not implementations.
- **End-User Focus:** Prioritize tests that verify complete user flows.
- **Critical Path Coverage:** Ensure all critical functionality has comprehensive test coverage.
- **No Implementation Simplification:** Never simplify application code just to make tests pass.

### Mocking Strategy
- **Global Mocking Only:** Use only global mocks from `/src/tests/mocks/`. NO LOCAL MOCKS.
- **Interface-Based Mocks:** Create mock implementations of interfaces for testing.
- **Centralized Mock Factories:** Use factory functions to create consistent mocks.
- **Realistic Test Data:** Provide valid, realistic mock data for all required props.

### Handling Test Failures
- **Test File Issues:** You may modify test files to fix issues with selectors, mocking, or timing.
- **Application Code Issues:** If you suspect the application code is broken, report the failing test and wait for guidance.
- **Documentation:** Document test results and any issues encountered.
- **Interdependency Awareness:** Before changing anything, understand how it affects other parts of the codebase.

### Technology & Tools
- **Approved Stack Only:** Use only the established testing stack (Vitest, React Testing Library, User Event, MSW, JSDOM, Testing Library Jest DOM).
- **Standard Utilities:** Use the provided test utilities and helpers consistently.

For further context and the most up-to-date rules, see `.cursorrules` in the project root and `TESTING_ISSUES-UnitTests.md` for specific patterns and solutions.
