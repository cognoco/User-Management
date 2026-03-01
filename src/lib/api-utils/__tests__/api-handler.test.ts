import { describe, it, expect } from 'vitest';
import { createApiHandler, createApiResponse, createErrorResponse } from '../api-handler';
import { ApiError } from '@/lib/api/common';
import { createApiMocks } from '@/tests/utils/api-testing-utils';
import { z } from 'zod';

const methods: ('GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE')[] = ['GET'];

function run(handler: any, reqOpts = {}) {
  const { req, res } = createApiMocks({ method: 'GET', ...reqOpts });
  return handler(req as any, res as any).then(() => res);
}

describe('createApiHandler', () => {
  it('returns success for valid request', async () => {
    const handler = createApiHandler({
      methods,
      async handler() {
        return { ok: true };
      },
    });

    const res = await run(handler);
    expect(res._getStatusCode()).toBe(200);
    expect(res.getJsonData()).toEqual({ success: true, data: { ok: true } });
  });

  it('rejects disallowed method', async () => {
    const handler = createApiHandler({ methods, async handler() { return {}; } });
    const res = await run(handler, { method: 'POST' });
    expect(res._getStatusCode()).toBe(405);
    expect(res.getHeader('Allow')).toEqual(methods);
  });

  it('handles ApiError from handler', async () => {
    const handler = createApiHandler({
      methods,
      async handler() {
        throw new ApiError('AUTH_ACCESS_002', 'forbidden', 403);
      },
    });

    const res = await run(handler);
    expect(res._getStatusCode()).toBe(403);
    expect(res.getJsonData().error.code).toBe('AUTH_ACCESS_002');
  });

  it('handles unexpected error', async () => {
    const handler = createApiHandler({
      methods,
      async handler() {
        throw new Error('boom');
      },
    });

    const res = await run(handler);
    expect(res._getStatusCode()).toBe(500);
    expect(res.getJsonData().error.code).toBe('INTERNAL_SERVER_ERROR');
  });

  it('respects headersSent', async () => {
    const handler = createApiHandler({
      methods,
      async handler(_, res) {
        res.status(201).json({ done: true });
      },
    });

    const res = await run(handler);
    expect(res._getStatusCode()).toBe(201);
    expect(res.getJsonData()).toEqual({ done: true });
  });

  it('honors requiresAuth option', async () => {
    const handler = createApiHandler({
      methods,
      requiresAuth: true,
      async handler() {
        return { ok: true };
      },
    });

    const res = await run(handler);
    expect(res._getStatusCode()).toBe(200);
  });

  it('honors requiredRoles option', async () => {
    const handler = createApiHandler({
      methods,
      requiredRoles: ['admin'],
      async handler() {
        return { ok: true };
      },
    });

    const res = await run(handler);
    expect(res._getStatusCode()).toBe(200);
  });

  it('validates request with schema', async () => {
    const schema = z.object({ name: z.string() });
    const handler = createApiHandler({
      methods: ['POST'],
      schema,
      async handler(req) {
        return req.body;
      },
    });

    const res = await run(handler, { method: 'POST', body: { name: 'A' } });
    expect(res._getStatusCode()).toBe(200);
    expect(res.getJsonData().data).toEqual({ name: 'A' });
  });

  it('returns validation error on invalid payload', async () => {
    const schema = z.object({ name: z.string() });
    const handler = createApiHandler({ methods: ['POST'], schema, async handler() { return {}; } });

    const res = await run(handler, { method: 'POST', body: {} });
    expect(res._getStatusCode()).toBe(400);
    expect(res.getJsonData().error.code).toBe('VALIDATION_REQUEST_001');
  });

  it('validates query with schema on GET', async () => {
    const schema = z.object({ q: z.string() });
    const handler = createApiHandler({
      methods: ['GET'],
      schema,
      async handler(req) {
        return req.query;
      },
    });

    const res = await run(handler, { method: 'GET', query: { q: 'ok' } });
    expect(res._getStatusCode()).toBe(200);
    expect(res.getJsonData().data).toEqual({ q: 'ok' });
  });

  it('uses fallback code when ApiError code missing', async () => {
    const err: any = new ApiError('x' as any, 'fail', 418);
    delete err.code;
    const handler = createApiHandler({ methods, async handler() { throw err; } });
    const res = await run(handler);
    expect(res._getStatusCode()).toBe(418);
    expect(res.getJsonData().error.code).toBe('API_ERROR');
  });

  it('createApiResponse adds meta when provided', () => {
    const result = createApiResponse({ ok: true }, { page: 1 });
    expect(result).toEqual({ success: true, data: { ok: true }, meta: { page: 1 } });
  });

  it('createErrorResponse includes details', () => {
    const err = createErrorResponse('E', 'boom', { info: 1 });
    expect(err).toEqual({ success: false, error: { code: 'E', message: 'boom', details: { info: 1 } } });
  });

  it('createErrorResponse omits details when not provided', () => {
    const err = createErrorResponse('E', 'boom');
    expect(err).toEqual({ success: false, error: { code: 'E', message: 'boom' } });
  });
});
