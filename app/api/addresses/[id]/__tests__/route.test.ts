import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PUT, DELETE } from '../route';
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
  getAddress: vi.fn(async () => ({ id: '1', fullName: 'John Doe' })),
  updateAddress: vi.fn(async (id, data) => ({ id, ...data })),
  deleteAddress: vi.fn(async () => {}),
  getAddresses: vi.fn(async () => []),
  createAddress: vi.fn(async (a: any) => a),
  setDefaultAddress: vi.fn(async () => {}),
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

describe('[id] address API', () => {
  it('GET returns address', async () => {
    const req = createAuthenticatedRequest('GET', 'http://test/api/addresses/1');
    const res = await GET(req, { params: { id: '1' } });
    expect(res.status).toBe(200);
    expect(service.getAddress).toHaveBeenCalledWith('1', 'u1');
  });

  it('PUT updates address with valid data', async () => {
    const updateData = { fullName: 'John Updated' };
    const req = createAuthenticatedRequest('PUT', 'http://test/api/addresses/1', updateData);
    (req as any).json = vi.fn().mockResolvedValue(updateData);
    const res = await PUT(req, { params: { id: '1' } });
    expect(res.status).toBe(200);
    expect(service.updateAddress).toHaveBeenCalledWith('1', updateData, 'u1');
  });

  it('PUT validates input and rejects invalid data', async () => {
    const invalidData = { postalCode: 123 };
    const req = createAuthenticatedRequest('PUT', 'http://test/api/addresses/1', invalidData);
    (req as any).json = vi.fn().mockResolvedValue(invalidData);
    const res = await PUT(req, { params: { id: '1' } });
    expect(res.status).toBe(400);
  });

  it('DELETE deletes address', async () => {
    const req = createAuthenticatedRequest('DELETE', 'http://test/api/addresses/1');
    const res = await DELETE(req, { params: { id: '1' } });
    expect(res.status).toBe(204);
    expect(service.deleteAddress).toHaveBeenCalledWith('1', 'u1');
  });
});
