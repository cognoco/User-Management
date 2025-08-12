import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import { ServiceLocator, ServiceKeys } from '@/lib/config/service-locator';
import type { AddressService } from '@/core/address/interfaces';
import type { AuthService } from '@/core/auth/interfaces';
import { createAuthenticatedRequest } from '@/tests/utils/request-helpers';

// Mock the auth middleware to bypass authentication
vi.mock('@/lib/api/auth-middleware', () => ({
  createAuthMiddleware: () => vi.fn((req: any) => Promise.resolve({
    userId: 'u1',
    user: { id: 'u1', email: 'test@example.com' },
    permissions: []
  }))
}));

const service: AddressService = {
  setDefaultAddress: vi.fn(async () => {}),
  getAddresses: vi.fn(async () => []),
  createAddress: vi.fn(async (a: any) => a),
  getAddress: vi.fn(async () => ({})),
  updateAddress: vi.fn(async () => ({})),
  deleteAddress: vi.fn(async () => {}),
} as any;

const authService: Partial<AuthService> = {
  getCurrentUser: vi.fn().mockResolvedValue({ id: 'u1' }),
};

beforeEach(() => {
  vi.clearAllMocks();
  
  // Clear and register services in ServiceLocator
  const locator = ServiceLocator.getInstance();
  locator.clear();
  locator.register(ServiceKeys.ADDRESS_SERVICE, service);
  locator.register(ServiceKeys.AUTH_SERVICE, authService);
});

describe('default address API', () => {
  it('sets default address', async () => {
    const req = createAuthenticatedRequest('POST', 'http://test/api/addresses/default/1');
    const res = await POST(req, { params: { id: '1' } });
    expect(res.status).toBe(204);
    expect(service.setDefaultAddress).toHaveBeenCalledWith('1', 'u1');
  });
});
