import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';
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
    userId: 'user-1',
    user: { id: 'user-1', email: 'test@example.com' },
    permissions: ['ADMIN_ACCESS'],
    token: 'test-token',
  }),
}));

// Mock permission cache
vi.mock('@/lib/auth/permission-cache', () => ({
  permissionCheckCache: {
    getOrCreate: vi.fn(),
    clear: vi.fn(),
  },
}));

const mockService: Partial<PermissionService> = {
  hasPermission: vi.fn(),
};
const mockAuth: Partial<AuthService> = {
  getCurrentUser: vi.fn().mockResolvedValue({ id: 'user-1', email: 'test@example.com' }),
};

import { ServiceLocator, ServiceKeys } from '@/lib/config/service-locator';
vi.mocked(getServiceContainer).mockReturnValue({
  permission: mockService as PermissionService,
  auth: mockAuth as AuthService,
} as any);

import { permissionCheckCache } from '@/lib/auth/permission-cache';
const mockCache = vi.mocked(permissionCheckCache);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(mockService.hasPermission!).mockResolvedValue(true);
  
  // Set up cache mock to simulate caching behavior
  let hasBeenCalled = false;
  mockCache.getOrCreate.mockImplementation(async (key: string, fn: () => Promise<boolean>) => {
    if (!hasBeenCalled) {
      hasBeenCalled = true;
      return await fn(); // Call the function first time
    }
    return true; // Return cached result on subsequent calls
  });
});

function createRequest(body: any) {
  return createAuthenticatedRequest(
    'POST',
    'http://localhost/api/auth/check-permission',
    body,
  );
}

describe('POST /api/auth/check-permission', () => {
  it('returns permission result', async () => {
    // Set up cache to always call the function
    mockCache.getOrCreate.mockImplementation(async (key: string, fn: () => Promise<boolean>) => {
      return await fn();
    });
    
    const res = await POST(
      createRequest({ permission: 'ADMIN_ACCESS' }) as any
    );
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.data.hasPermission).toBe(true);
    expect(mockService.hasPermission).toHaveBeenCalledWith('user-1', 'ADMIN_ACCESS');
  });

  it('caches permission checks', async () => {
    await POST(createRequest({ permission: 'ADMIN_ACCESS' }) as any);
    await POST(createRequest({ permission: 'ADMIN_ACCESS' }) as any);
    expect(mockService.hasPermission).toHaveBeenCalledTimes(1);
  });

  it('validates request body', async () => {
    const res = await POST(createRequest({}) as any);
    expect(res.status).toBe(400);
  });
});
