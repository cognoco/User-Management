import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST, GET } from '../route';
import { getApiAddressService } from '@/services/address/factory';
import { getApiCompanyService } from '@/services/company/factory';
import { createAuthenticatedRequest } from '@/tests/utils/request-helpers';

// Mock the auth middleware to bypass authentication
vi.mock('@/lib/api/auth-middleware', () => ({
  createAuthMiddleware: () => vi.fn((req: any) => Promise.resolve({
    userId: 'u1',
    user: { id: 'u1', email: 'test@example.com' },
    permissions: []
  }))
}));

// Mock service factories


vi.mock('@/middleware/auth', () => ({
  withRouteAuth: vi.fn((handler: any, req: any) => handler(req, { userId: 'test-user-id' })),
}));

// Mock rate limiter
vi.mock('@/middleware/rate-limit', () => ({
  checkRateLimit: vi.fn(() => Promise.resolve(false))
}));

describe('Company Addresses API', () => {
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com'
  };

  const mockCompanyProfile = {
    id: 'test-company-id',
    user_id: mockUser.id
  };

  const mockAddress = {
    id: 'test-address-id',
    company_id: mockCompanyProfile.id,
    type: 'billing' as const,
    street_line1: '123 Test St',
    city: 'Test City',
    state: 'Test State',
    postal_code: '12345',
    country: 'US',
    is_primary: true,
    validated: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/company/addresses', () => {
    it('should create a new company address', async () => {
      const addressService = { createAddress: vi.fn() } as any;
      const companyService = { getProfileByUserId: vi.fn() } as any;
      vi.mocked(getApiAddressService).mockReturnValue(addressService);
      vi.mocked(getApiCompanyService).mockReturnValue(companyService);
      companyService.getProfileByUserId.mockResolvedValue(mockCompanyProfile);
      addressService.createAddress.mockResolvedValue({ success: true, address: mockAddress });

      const request = createAuthenticatedRequest('POST', 'http://localhost/api/company/addresses', {
        type: mockAddress.type,
        street_line1: mockAddress.street_line1,
        city: mockAddress.city,
        state: mockAddress.state,
        postal_code: mockAddress.postal_code,
        country: mockAddress.country,
        is_primary: mockAddress.is_primary,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockAddress);
    });

    it('should return 401 if not authenticated', async () => {
      const request = createAuthenticatedRequest('POST', 'http://localhost/api/company/addresses', {
        type: mockAddress.type,
      }, null);

      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it('should return 404 if company profile not found', async () => {
      const addressService = { createAddress: vi.fn() } as any;
      const companyService = { getProfileByUserId: vi.fn().mockResolvedValue(null) } as any;
      vi.mocked(getApiAddressService).mockReturnValue(addressService);
      vi.mocked(getApiCompanyService).mockReturnValue(companyService);

      const request = createAuthenticatedRequest('POST', 'http://localhost/api/company/addresses', {
        type: mockAddress.type,
        street_line1: mockAddress.street_line1,
        city: mockAddress.city,
        state: mockAddress.state,
        postal_code: mockAddress.postal_code,
        country: mockAddress.country,
        is_primary: mockAddress.is_primary,
      });

      const response = await POST(request);
      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/company/addresses', () => {
    it('should return company addresses', async () => {
      const addressService = { getAddresses: vi.fn() } as any;
      const companyService = { getProfileByUserId: vi.fn() } as any;
      vi.mocked(getApiAddressService).mockReturnValue(addressService);
      vi.mocked(getApiCompanyService).mockReturnValue(companyService);
      companyService.getProfileByUserId.mockResolvedValue(mockCompanyProfile);
      addressService.getAddresses.mockResolvedValue([mockAddress]);

      const request = createAuthenticatedRequest('GET', 'http://localhost/api/company/addresses');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual([mockAddress]);
    });

    it('should return 401 if not authenticated', async () => {
      const request = createAuthenticatedRequest('GET', 'http://localhost/api/company/addresses', undefined, null);

      const response = await GET(request);
      expect(response.status).toBe(401);
    });
  });
}); 