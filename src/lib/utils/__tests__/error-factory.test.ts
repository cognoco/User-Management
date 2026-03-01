import { describe, it, expect } from 'vitest';
import { createError, createValidationError, createAuthenticationError, createNotFoundError, enhanceError } from '../error-factory';
import { VALIDATION_ERROR_CODES, AUTH_ERROR_CODES, USER_ERROR_CODES } from '@/lib/api/common/error-codes';

describe('error factory', () => {
  it('creates basic error with details and stack', () => {
    const cause = new Error('root cause');
    const err = createError(VALIDATION_ERROR_CODES.INVALID_REQUEST, 'failed', { a: 1 }, cause, 400);
    expect(err.code).toBe(VALIDATION_ERROR_CODES.INVALID_REQUEST);
    expect(err.details).toEqual({ a: 1 });
    expect(err.status).toBe(400);
    expect(err.stack).toContain('root cause');
  });

  it('creates error without cause', () => {
    const err = createError(AUTH_ERROR_CODES.FORBIDDEN, 'forbidden');
    expect(err.cause).toBeUndefined();
  });

  it('creates validation error with field errors', () => {
    const err = createValidationError({ email: 'invalid' });
    expect(err.code).toBe(VALIDATION_ERROR_CODES.INVALID_REQUEST);
    expect(err.details).toEqual({ fields: { email: 'invalid' } });
  });

  it('creates validation error with custom message', () => {
    const err = createValidationError({ name: 'missing' }, 'bad');
    expect(err.message).toBe('bad');
  });

  it('creates validation error with missing locale', () => {
    const err = createValidationError({ field: 'x' }, undefined, undefined, 'zz' as any);
    expect(err.message).toBe('Validation failed.');
  });

  it('creates authentication error', () => {
    const err = createAuthenticationError('Auth required');
    expect(err.code).toBe(AUTH_ERROR_CODES.UNAUTHORIZED);
    expect(err.message).toBe('Auth required');
  });

  it('uses localized default message when none provided', () => {
    const err = createAuthenticationError(undefined as any);
    expect(err.message).toBe('Authentication required.');
  });

  it('uses fallback for unknown locale', () => {
    const err = createAuthenticationError(undefined as any, undefined, 'zz' as any);
    expect(err.message).toBe('Authentication required.');
  });

  it('creates not found error', () => {
    const err = createNotFoundError('user', '1');
    expect(err.code).toBe(USER_ERROR_CODES.NOT_FOUND);
    expect(err.details).toEqual({ resourceType: 'user', resourceId: '1' });
  });

  it('falls back to default locale', () => {
    const err = createNotFoundError('item', '2', undefined, 'zz' as any);
    expect(err.message).toBe('item 2 not found.');
  });

  it('uses translation when locale available', () => {
    const err = createNotFoundError('item', '3', undefined, 'en');
    expect(err.message).toBe('item 3 not found.');
  });

  it('sets timestamp and name properly', () => {
    const before = Date.now();
    const err = createError(AUTH_ERROR_CODES.FORBIDDEN, 'nope');
    const after = Date.now();
    expect(err.name).toBe('ApplicationError');
    expect(Date.parse(err.timestamp)).toBeGreaterThanOrEqual(before);
    expect(Date.parse(err.timestamp)).toBeLessThanOrEqual(after);
  });

  it('enhances existing Error instance', () => {
    const base = new Error('base');
    const enhanced = enhanceError(base);
    expect(enhanced).toBe(base);
  });

  it('enhances string error to Error instance', () => {
    const enhanced = enhanceError('boom') as Error;
    expect(enhanced).toBeInstanceOf(Error);
    expect(enhanced.message).toBe('boom');
  });

  it('enhances unknown error to generic Error', () => {
    const enhanced = enhanceError({ data: 1 }) as Error;
    expect(enhanced.message).toBe('Unknown error occurred');
  });

  it('allows switching locales', () => {
    const en = createAuthenticationError(undefined as any, undefined, 'en');
    const fr = createAuthenticationError(undefined as any, undefined, 'fr');
    expect(fr.message).toBe(en.message);
  });
});
