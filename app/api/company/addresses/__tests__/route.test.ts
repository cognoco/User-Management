import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createAuthMiddleware } from '@/lib/api/auth-middleware';

// Mock the auth middleware to return authenticated context
vi.mock('@/lib/api/auth-middleware', () => ({
  createAuthMiddleware: vi.fn(() => vi.fn().mockResolvedValue({
    userId: 'test-user-id',
    isAuthenticated: true,
    user: { id: 'test-user-id', email: 'test@example.com' },
    permissions: []
  }))
}));

// Mock service factories
const mockAddressService = { 
  createAddress: vi.fn(),
  getAddresses: vi.fn()
};
const mockCompanyService = { 
  getProfileByUserId: vi.fn() 
};

vi.mock('@/services/address/factory', () => ({
  getApiAddressService: vi.fn(() => mockAddressService)
}));

vi.mock('@/services/company/factory', () => ({
  getApiCompanyService: vi.fn(() => mockCompanyService)
}));

import { POST, GET } from '../route';

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

  const createPostRequest = (body: any) => new NextRequest('http://localhost/api/company/addresses', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-token'
    },
    body: JSON.stringify(body)
  });
  
  const createGetRequest = () => new NextRequest('http://localhost/api/company/addresses', {
    method: 'GET',
    headers: { 
      'Authorization': 'Bearer test-token'
    }
  });

  describe('POST /api/company/addresses', () => {
    it('should create a new company address', async () => {
      mockCompanyService.getProfileByUserId.mockResolvedValue(mockCompanyProfile);
      mockAddressService.createAddress.mockResolvedValue({ success: true, address: mockAddress });

      const request = createPostRequest({
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

      expect(response.status).toBe(201);
      expect(data.data).toEqual(mockAddress);
    });


    it('should return 404 if company profile not found', async () => {
      mockCompanyService.getProfileByUserId.mockResolvedValue(null);

      const request = createPostRequest({
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
      mockCompanyService.getProfileByUserId.mockResolvedValue(mockCompanyProfile);
      mockAddressService.getAddresses.mockResolvedValue([mockAddress]);

      const request = createGetRequest();

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toEqual([mockAddress]);
    });

  });
}); 