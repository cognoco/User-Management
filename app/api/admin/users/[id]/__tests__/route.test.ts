import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock the service container to inject our test services
const mockAdminService = {
  getUserById: vi.fn(),
  updateUser: vi.fn(),
  deleteUser: vi.fn(),
};

vi.mock('@/lib/config/service-container', () => ({
  getServiceContainer: vi.fn(() => ({
    admin: mockAdminService,
    auth: { validateSession: vi.fn() },
    permission: { hasPermissions: vi.fn() },
  })),
}));

// Mock auth middleware to always pass
vi.mock('@/lib/api/auth-middleware', () => ({
  createAuthMiddleware: vi.fn(() => vi.fn().mockResolvedValue({
    userId: 'admin1',
    role: 'admin',
    authenticated: true,
  })),
}));

vi.mock('@/lib/realtime/notifyUserChanges', () => ({
  notifyUserChanges: vi.fn(),
}));

vi.mock('@/lib/api/admin/error-handler', () => ({
  createUserNotFoundError: vi.fn((id: string) => {
    const err: any = new Error(`User ${id} not found`);
    err.code = 'USER_NOT_FOUND';
    err.statusCode = 404;
    return err;
  }),
}));

// Import after mocks
import { GET, PUT, DELETE } from '../route';

function createMockRequest(method = 'GET', body?: any) {
  return new NextRequest(`http://localhost/api/admin/users/u1`, {
    method,
    ...(body ? { body: JSON.stringify(body) } : {}),
    headers: body ? { 'Content-Type': 'application/json' } : {},
  });
}

describe('Admin Users by ID API', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockAdminService.getUserById.mockResolvedValue({
      id: 'u1',
      name: 'Test User',
      email: 'test@example.com',
    });
    mockAdminService.updateUser.mockResolvedValue({
      id: 'u1',
      name: 'Updated User',
      email: 'test@example.com',
    });
    mockAdminService.deleteUser.mockResolvedValue(undefined);
  });

  describe('GET', () => {
    it('returns user data for a valid user id', async () => {
      const req = createMockRequest('GET');
      const res = await GET(req);
      const data = await res.json();

      expect(mockAdminService.getUserById).toHaveBeenCalledWith('u1');
      expect(data).toMatchObject({
        data: { user: { id: 'u1', name: 'Test User', email: 'test@example.com' } },
      });
    });
  });

  describe('PUT', () => {
    it('updates a user with validated data', async () => {
      const req = createMockRequest('PUT', { name: 'Updated User', email: 'test@example.com' });
      const res = await PUT(req);
      const data = await res.json();

      expect(mockAdminService.updateUser).toHaveBeenCalledWith('u1', expect.objectContaining({
        name: 'Updated User',
        email: 'test@example.com',
      }));
      expect(data).toMatchObject({
        data: { user: { id: 'u1', name: 'Updated User', email: 'test@example.com' } },
      });
    });
  });

  describe('DELETE', () => {
    it('deletes the user and returns no content', async () => {
      const req = createMockRequest('DELETE');
      const res = await DELETE(req);

      expect(mockAdminService.deleteUser).toHaveBeenCalledWith('u1');
      expect(res.status).toBe(204);
    });
  });
});
