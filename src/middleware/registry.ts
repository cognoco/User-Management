// Central registry exporting all middleware utilities
// This enables a single import point for middleware across the app

export * from './auth';
export * from './audit-log';
export * from './cors';
export * from './csrf';
export * from './error-handling';
export * from './export-rate-limit';
// Explicitly re-export from ./index to avoid name collision with ./with-security
// (both export `withSecurity` — Pages Router vs App Router variants).
export {
  combineMiddleware,
  defaultSecurityMiddleware,
  createApiMiddleware,
  middleware,
} from './index';
export * from './permissions';
export * from './rate-limit';
export * from './security-headers';
export * from './validation';
export * from './with-auth-rate-limit';
// App Router withSecurity (NextRequest/NextResponse) — the Pages Router
// variant lives in ./index and can be imported directly when needed.
export * from './with-security';
export * from './protected-route';
