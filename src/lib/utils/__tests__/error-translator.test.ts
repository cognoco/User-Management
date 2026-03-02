import { describe, it, expect } from 'vitest';
import { translateDatabaseError, translateApiError, enhanceError, formatErrorForLogging, sanitizeErrorForClient } from '../error-translator';
import { SERVER_ERROR_CODES, USER_ERROR_CODES } from '@/lib/api/common/error-codes';

describe('error translator', () => {
  it('translates Prisma unique constraint error', () => {
    const prismaErr = { code: 'P2002' };
    const err = translateDatabaseError(prismaErr);
    expect(err.code).toBe(SERVER_ERROR_CODES.DATABASE_ERROR);
    expect(err.status).toBe(409);
  });

  it('translates database connection error', () => {
    const dbErr = { code: 'ECONNREFUSED' };
    const err = translateDatabaseError(dbErr);
    expect(err.status).toBe(503);
  });

  it('handles unknown and non-object database errors', () => {
    expect(translateDatabaseError({ code: 'OTHER' }).status).toBe(500);
    expect(translateDatabaseError(null as any).status).toBe(500);
  });

  it('translates API 404 error', () => {
    const apiErr = { response: { status: 404, data: { id: '5' } } };
    const err = translateApiError(apiErr, 'service');
    expect(err.code).toBe(USER_ERROR_CODES.NOT_FOUND);
    expect(err.status).toBe(404);
  });

  it('translates API 401 error', () => {
    const apiErr = { response: { status: 401 } };
    const err = translateApiError(apiErr, 'svc');
    expect(err.status).toBe(401);
  });

  it('handles generic API errors', () => {
    expect(translateApiError({}, 'svc').code).toBe(SERVER_ERROR_CODES.OPERATION_FAILED);
    const apiErr = { response: { status: 500 } };
    expect(translateApiError(apiErr, 'svc').code).toBe(SERVER_ERROR_CODES.OPERATION_FAILED);
  });

  it('enhances plain and existing ApplicationError', () => {
    const plain = enhanceError(new Error('oops'), { requestId: 'abc' });
    expect(plain.requestId).toBe('abc');
    const existing = translateDatabaseError({ code: 'P2002' });
    const enhanced = enhanceError(existing, { requestId: 'xyz' });
    expect(enhanced).toBe(existing);
    expect(enhanced.requestId).toBe('xyz');
  });

  it('formats and sanitizes error', () => {
    const err = enhanceError(new Error('bad'), { requestId: 'id1' });
    const log = formatErrorForLogging(err);
    const client = sanitizeErrorForClient(err);
    expect(log.stack).toBeDefined();
    expect((client as any).stack).toBeUndefined();
    expect(client.code).toBe(err.code);
  });
});
