import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import type { PermissionService } from '@/core/permission/interfaces';
import type { AuthService } from '@/core/auth/interfaces';
import { createAuthenticatedRequest } from '@/tests/utils/request-helpers';

vi.mock('@/lib/config/service-locator', () => ({
  ServiceLocator: {
    getInstance: vi.fn(() => ({
      get: vi.fn(),
      register: vi.fn(),
      clear: vi.fn(),
      createServiceContainer: vi.fn(),
    })),
  },
  ServiceKeys: {},
}));

// Mock auth middleware to return authenticated context
vi.mock('@/lib/api/auth-middleware', () => ({
  createAuthMiddleware: () => () => Promise.resolve({
    isAuthenticated: true,
    userId: 'u1',
    user: { id: 'u1', email: 'test@example.com' },
    permissions: ['VIEW_PROJECTS'],
    token: 'test-token',
  }),
}));

const mockService: Partial<PermissionService> = { hasPermission: vi.fn() };
const mockAuth: Partial<AuthService> = {
  getCurrentUser: vi.fn().mockResolvedValue({ id: 'u1', email: 'test@example.com' }),
};

// Mock the service container creation
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
            auth: mockAuth,
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
  vi.mocked(mockService.hasPermission!).mockResolvedValue(true);
});

function createReq(body: any) {
  return createAuthenticatedRequest(
    'POST',
    'http://test/api/auth/check-permissions',
    body,
  );
}

describe('POST /api/auth/check-permissions', () => {
  it('returns results for checks', async () => {
    const res = await POST(createReq({ checks: [{ permission: 'VIEW_PROJECTS' }] }) as any);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.results[0].hasPermission).toBe(true);
    expect(mockService.hasPermission).toHaveBeenCalledWith('u1', 'VIEW_PROJECTS');
  });

  it('validates body', async () => {
    const res = await POST(createReq({}) as any);
    expect(res.status).toBe(400);
  });
});
