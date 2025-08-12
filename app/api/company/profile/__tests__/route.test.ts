import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextResponse } from 'next/server';
import { POST, GET } from '../route';
import { getApiCompanyService } from '@/services/company/factory';
import { withRouteAuth } from '@/middleware/auth';
import { createAuthenticatedRequest } from '@/tests/utils/request-helpers';

// Mock the auth middleware to bypass authentication
vi.mock('@/lib/api/auth-middleware', () => ({
  createAuthMiddleware: () => vi.fn((req: any) => Promise.resolve({
    userId: 'u1',
    user: { id: 'u1', email: 'test@example.com' },
    permissions: []
  }))
}));



// Mock rate limiter
vi.mock('@/middleware/rate-limit', () => ({
  checkRateLimit: vi.fn(() => Promise.resolve(false))
}));

vi.mock('@/middleware/auth', () => ({
  withRouteAuth: vi.fn((handler: any) => async (req: any) => handler(req, { userId: 'test-user-id', role: 'user' })),
}));

describe('Company Profile API', () => {
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com'
  };

  const mockProfile = {
    id: 'test-profile-id',
    name: 'Test Company',
    legal_name: 'Test Company Legal',
    industry: 'Technology',
    size_range: '11-50' as const,
    founded_year: 2020,
    status: 'pending' as const,
    verified: false,
    user_id: mockUser.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/company/profile', () => {
    it('should create a new company profile', async () => {
      const service = { createProfile: vi.fn().mockResolvedValue(mockProfile), getProfileByUserId: vi.fn().mockResolvedValue(null) } as any;
      // Clear and register services in ServiceLocator
  const locator = ServiceLocator.getInstance();
  locator.clear();
  locator.register(ServiceKeys.ADDRESS_SERVICE, service);

      const request = createAuthenticatedRequest('POST', 'http://localhost/api/company/profile', {
        name: mockProfile.name,
        legal_name: mockProfile.legal_name,
        industry: mockProfile.industry,
        size_range: mockProfile.size_range,
        founded_year: mockProfile.founded_year,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockProfile);
      expect(service.createProfile).toHaveBeenCalled();
    });

    it('should return 401 if not authenticated', async () => {
      vi.mocked(withRouteAuth).mockResolvedValueOnce(
        new NextResponse('unauthorized', { status: 401 })
      );

      const request = createAuthenticatedRequest('POST', 'http://localhost/api/company/profile', {});

      const response = await POST(request);
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/company/profile', () => {
    it('should return the company profile', async () => {
      const service = { getProfileByUserId: vi.fn().mockResolvedValue(mockProfile) } as any;
      // Clear and register services in ServiceLocator
  const locator = ServiceLocator.getInstance();
  locator.clear();
  locator.register(ServiceKeys.ADDRESS_SERVICE, service);

      const request = createAuthenticatedRequest('GET', 'http://localhost/api/company/profile');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockProfile);
      expect(service.getProfileByUserId).toHaveBeenCalled();
    });

    it('should return 404 if profile not found', async () => {
      const service = { getProfileByUserId: vi.fn().mockResolvedValue(null) } as any;
      // Clear and register services in ServiceLocator
  const locator = ServiceLocator.getInstance();
  locator.clear();
  locator.register(ServiceKeys.ADDRESS_SERVICE, service);

      const request = createAuthenticatedRequest('GET', 'http://localhost/api/company/profile');

      const response = await GET(request);
      expect(response.status).toBe(404);
    });
  });
}); 