import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';
import { withRouteAuth } from '@/middleware/auth';
import { hasPermission } from '@/lib/auth/hasPermission';
import { getApiAuditService } from '@/services/audit/factory';
import { createAuthenticatedRequest } from '@/tests/utils/request-helpers';

// Mock the auth middleware to bypass authentication
vi.mock('@/lib/api/auth-middleware', () => ({
  createAuthMiddleware: () => vi.fn((req: any) => Promise.resolve({
    userId: 'u1',
    user: { id: 'u1', email: 'test@example.com' },
    permissions: []
  }))
}));

vi.mock('@/middleware/auth', () => ({ withRouteAuth: vi.fn((h: any) => h) }));
vi.mock('@/lib/auth/hasPermission', () => ({ hasPermission: vi.fn().mockResolvedValue(true) }));


describe('audit route', () => {
  const service = { getLogs: vi.fn() } as any;
  beforeEach(() => {
    // Clear and register services in ServiceLocator
  const locator = ServiceLocator.getInstance();
  locator.clear();
  locator.register(ServiceKeys.ADDRESS_SERVICE, service);
    vi.clearAllMocks();
  });

  it('returns logs', async () => {
    service.getLogs.mockResolvedValue({ logs: [], count: 0 });
    const res = await GET(createAuthenticatedRequest('GET', 'http://t?page=1&limit=10'));
    expect(res.status).toBe(200);
    expect(service.getLogs).toHaveBeenCalled();
  });
});
