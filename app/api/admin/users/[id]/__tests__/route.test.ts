import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PUT, DELETE } from '../route';

vi.mock('@/middleware/createMiddlewareChain', async () => {
  const actual = await vi.importActual<any>('@/middleware/createMiddlewareChain');
  return {
    ...actual,
    routeAuthMiddleware: vi.fn(() => (handler: any) =>
      (req: any, ctx?: any, data?: any) =>
        handler(req, { userId: 'u1', role: 'admin', permissions: ['admin.users.view','admin.users.update','admin.users.delete','admin.users.list'] }, data)
    ),
    errorHandlingMiddleware: vi.fn(() => (handler: any) => handler),
    validationMiddleware: vi.fn(() => (handler: any) => (req: any, ctx?: any) => {
      const data = { name: 'test', email: 'test@example.com' };
      return handler(req, ctx, data);
    }),
    createMiddlewareChain: (middlewares: any[]) => (handler: any) => handler,
  };
});

vi.mock('@/middleware/with-security', () => ({ 
  withSecurity: vi.fn((fn: any) => fn)
}));

// Create a mock admin service instance that will be reused
const mockAdminService = {
  getUserById: vi.fn(),
  updateUser: vi.fn(),
  deleteUser: vi.fn()
};



vi.mock('@/lib/realtime/notifyUserChanges', () => ({ 
  notifyUserChanges: vi.fn()
}));

vi.mock('@/lib/api/admin/error-handler', () => ({
  createUserNotFoundError: vi.fn(() => new Error('User not found'))
}));

vi.mock('@/lib/api/common', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    createSuccessResponse: vi.fn((data: any) => ({ json: () => Promise.resolve(data) })),
    createNoContentResponse: vi.fn(() => ({ status: 204 }))
  };
});

function createMockRequest() {
  return {
    method: 'GET',
    url: 'http://localhost/api/admin/users/1',
    nextUrl: { pathname: '/api/admin/users/1' },
    headers: {
      get: () => null
    },
    json: vi.fn().mockResolvedValue({})
  } as unknown as NextRequest;
}

const req = createMockRequest();
const ctx = { params: { id: '1' } } as any;

describe('Admin Users by ID API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set up the admin service mocks to return valid data
    mockAdminService.getUserById.mockResolvedValue({ id: '1', name: 'Test User', email: 'test@example.com' });
    mockAdminService.updateUser.mockResolvedValue({ id: '1', name: 'Updated User', email: 'test@example.com' });
    mockAdminService.deleteUser.mockResolvedValue(undefined);
  });

  it('calls auth middleware for GET', async () => {
    await GET(req, ctx);
    const { routeAuthMiddleware } = await import('@/middleware/createMiddlewareChain');
    expect(routeAuthMiddleware).toHaveBeenCalled();
  });

  it('calls auth middleware for PUT', async () => {
    await PUT(req, ctx);
    const { routeAuthMiddleware } = await import('@/middleware/createMiddlewareChain');
    const { withSecurity } = await import('@/middleware/with-security');
    expect(routeAuthMiddleware).toHaveBeenCalled();
    expect(withSecurity).toHaveBeenCalled();
  });

  it('calls auth middleware for DELETE', async () => {
    await DELETE(req, ctx);
    const { routeAuthMiddleware } = await import('@/middleware/createMiddlewareChain');
    const { withSecurity } = await import('@/middleware/with-security');
    expect(routeAuthMiddleware).toHaveBeenCalled();
    expect(withSecurity).toHaveBeenCalled();
  });
});
