import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '../route';
import type { PermissionService } from '@/core/permission/interfaces';
import type { AuthService } from '@/core/auth/interfaces';
import { createAuthenticatedRequest } from '@/tests/utils/request-helpers';

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
    permissions: ['MANAGE_ROLES'],
    token: 'test-token',
  }),
}));

const mockPermissionService: Partial<PermissionService> = { getAllPermissions: vi.fn() };
const mockAuth: Partial<AuthService> = { getCurrentUser: vi.fn().mockResolvedValue({ id: 'u1', email: 'test@example.com' }) };

import { getServiceContainer } from '@/lib/config/service-container';
vi.mocked(getServiceContainer).mockReturnValue({
  permission: mockPermissionService as PermissionService,
  auth: mockAuth as AuthService,
} as any);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(mockPermissionService.getAllPermissions!).mockResolvedValue(['READ']);
});

describe('permissions root API', () => {
  it('GET returns permissions', async () => {
    const res = await GET(createAuthenticatedRequest('GET', 'http://test') as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.permissions).toEqual(['READ']);
    expect(mockPermissionService.getAllPermissions).toHaveBeenCalled();
  });

  it('POST is not allowed', async () => {
    const res = await POST(createAuthenticatedRequest('POST', 'http://test') as any);
    expect(res.status).toBe(405);
  });
});
