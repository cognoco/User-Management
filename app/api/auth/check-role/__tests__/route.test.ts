import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import type { PermissionService } from '@/core/permission/interfaces';
import { createAuthenticatedRequest } from '@/tests/utils/request-helpers';

const mockService: Partial<PermissionService> = { hasRole: vi.fn() };

// Mock withValidatedServices pattern
vi.mock('@/lib/api/with-services', async () => {
  const actual = await vi.importActual('@/lib/api/with-services');
  return {
    ...actual,
    withValidatedServices: ({ handler, schema }: any) => async (req: any) => {
      try {
        const body = await req.json();
        // Try to validate with schema
        const data = schema.parse(body);
        return handler({
          data,
          request: req,
          userId: 'u1',
          services: {
            permission: mockService,
          },
        });
      } catch (error: any) {
        // If validation fails, return 400 error
        if (error.name === 'ZodError') {
          return new Response(JSON.stringify({ 
            error: { 
              code: 'VALIDATION_ERROR', 
              message: 'Validation failed' 
            } 
          }), { 
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        throw error;
      }
    },
  };
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(mockService.hasRole!).mockResolvedValue(true);
});

function makeReq(body: any) {
  return createAuthenticatedRequest('POST', 'http://test/api/auth/check-role', body);
}

describe('POST /api/auth/check-role', () => {
  it('returns role result', async () => {
    const res = await POST(makeReq({ role: 'ADMIN' }) as any);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data.hasRole).toBe(true);
    expect(mockService.hasRole).toHaveBeenCalledWith('u1', 'ADMIN');
  });

  it('validates body', async () => {
    const res = await POST(makeReq({}) as any);
    expect(res.status).toBe(400);
  });
});
