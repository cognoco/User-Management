import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';
import type { PermissionService } from '@/core/permission/interfaces';
import type { AuthService } from '@/core/auth/interfaces';

vi.mock('@/services/permission/factory', () => ({}));
vi.mock('@/services/auth/factory', () => ({}));
vi.mock('@/lib/config/service-container', () => ({
  configureServices: vi.fn(),
  resetServiceContainer: vi.fn(),
  getServiceContainer: vi.fn(),
}));

// Mock auth middleware to return authenticated context
vi.mock('@/lib/api/auth-middleware', () => ({
  createAuthMiddleware: () => () => Promise.resolve({
    isAuthenticated: true,
    userId: 'u1',
    user: { id: 'u1', email: 'test@example.com' },
    permissions: ['P1'],
    token: 'test-token',
  }),
}));

const mockPermissionService: Partial<PermissionService> = {
  getUserRoles: vi.fn(),
  getRoleById: vi.fn(),
};
const mockAuth: Partial<AuthService> = {
  getCurrentUser: vi.fn().mockResolvedValue({ id: 'u1', email: 'test@example.com' }),
};

import { getServiceContainer } from '@/lib/config/service-container';
vi.mocked(getServiceContainer).mockReturnValue({
  permissionService: mockPermissionService as PermissionService,
  auth: mockAuth as AuthService,
} as any);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(mockPermissionService.getUserRoles!).mockResolvedValue([{ roleId: 'r1' }]);
  vi.mocked(mockPermissionService.getRoleById!).mockResolvedValue({ name: 'ADMIN', permissions: ['P1'] });
});

describe('GET /api/auth/my-permissions', () => {
  it('returns aggregated permissions', async () => {
    const res = await GET(new Request('http://test') as any);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.roles[0]).toBe('ADMIN');
    expect(body.data.permissions).toContain('P1');
    expect(mockPermissionService.getUserRoles).toHaveBeenCalledWith('u1');
    expect(mockPermissionService.getRoleById).toHaveBeenCalledWith('r1');
  });
});
