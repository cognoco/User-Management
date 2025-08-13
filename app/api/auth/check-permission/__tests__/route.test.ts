import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { ServiceLocator, ServiceKeys } from '@/lib/config/service-locator';
import { createAuthMiddleware } from '@/lib/api/auth-middleware';
import type { PermissionService } from '@/core/permission/interfaces';

// Mock the permission service
const mockPermissionService: Partial<PermissionService> = {
  hasPermission: vi.fn(),
};

// Mock permission cache
vi.mock('@/lib/auth/permission-cache', () => ({
  permissionCheckCache: {
    getOrCreate: vi.fn(),
    clear: vi.fn(),
  },
}));

import { POST } from '../route';
import { permissionCheckCache } from '@/lib/auth/permission-cache';
const mockCache = vi.mocked(permissionCheckCache);

function createRequest(body: any) {
  return new NextRequest('http://localhost/api/auth/check-permission', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-token'
    },
    body: JSON.stringify(body)
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  
  // Register the mock service in ServiceLocator
  const locator = ServiceLocator.getInstance();
  locator.clear();
  locator.register(ServiceKeys.PERMISSION_SERVICE, mockPermissionService as PermissionService);
  
  vi.mocked(mockPermissionService.hasPermission!).mockResolvedValue(true);
  
  // Mock the auth middleware to return authenticated context
  vi.mocked(createAuthMiddleware).mockReturnValue(
    vi.fn().mockResolvedValue({
      userId: 'user-1',
      isAuthenticated: true,
      user: { id: 'user-1', email: 'test@example.com' },
      permissions: ['ADMIN_ACCESS']
    })
  );
  
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

afterEach(() => {
  ServiceLocator.getInstance().clear();
});

describe('POST /api/auth/check-permission', () => {
  it('returns permission result', async () => {
    // Set up cache to always call the function
    mockCache.getOrCreate.mockImplementation(async (key: string, fn: () => Promise<boolean>) => {
      return await fn();
    });
    
    const res = await POST(createRequest({ permission: 'ADMIN_ACCESS' }));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.data.hasPermission).toBe(true);
    expect(mockPermissionService.hasPermission).toHaveBeenCalledWith('user-1', 'ADMIN_ACCESS');
  });

  it('caches permission checks', async () => {
    await POST(createRequest({ permission: 'ADMIN_ACCESS' }));
    await POST(createRequest({ permission: 'ADMIN_ACCESS' }));
    expect(mockPermissionService.hasPermission).toHaveBeenCalledTimes(1);
  });

  it('validates request body', async () => {
    const res = await POST(createRequest({}));
    expect(res.status).toBe(400);
  });
});
