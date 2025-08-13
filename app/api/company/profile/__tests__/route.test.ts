import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextResponse } from 'next/server';
import { POST, GET } from '../route';
import { createAuthenticatedRequest } from '@/tests/utils/request-helpers';

// Mock the withValidatedServices wrapper
vi.mock('@/lib/api/with-services', () => ({
  withValidatedServices: vi.fn((config: any) => {
    return async (req: Request) => {
      // Parse body if needed
      let data = null;
      if (config.schema && req.method === 'POST') {
        try {
          const body = await req.json();
          if (config.schema.safeParse) {
            const result = config.schema.safeParse(body);
            if (!result.success) {
              return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Validation failed' } }, { status: 400 });
            }
            data = result.data;
          } else {
            data = body;
          }
        } catch {
          data = null;
        }
      }
      
      // Execute handler with mocked context
      const mockContext = {
        request: req,
        auth: { userId: 'test-user-id', user: { id: 'test-user-id', email: 'test@example.com' }, permissions: [] },
        data,
        services: {
          company: mockCompanyService
        }
      };
      
      try {
        return await config.handler(mockContext);
      } catch (error: any) {
        if (error.message === 'unauthorized') {
          return new NextResponse('unauthorized', { status: 401 });
        }
        if (error.message?.includes('not found')) {
          return NextResponse.json({ error: { message: error.message } }, { status: 404 });
        }
        throw error;
      }
    };
  })
}));

// Mock the withSecurity wrapper
vi.mock('@/middleware/with-security', () => ({
  withSecurity: vi.fn((handler: any) => handler)
}));

// Mock rate limiter
vi.mock('@/middleware/rate-limit', () => ({
  checkRateLimit: vi.fn(() => Promise.resolve(false))
}));

// Mock audit logger
vi.mock('@/lib/audit/auditLogger', () => ({
  logUserAction: vi.fn(() => Promise.resolve())
}));

let mockCompanyService: any;

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
    
    // Initialize mock company service
    mockCompanyService = {
      createProfile: vi.fn(),
      getProfileByUserId: vi.fn(),
      updateProfile: vi.fn(),
      deleteProfile: vi.fn()
    };
  });

  describe('POST /api/company/profile', () => {
    it('should create a new company profile', async () => {
      mockCompanyService.getProfileByUserId.mockResolvedValue(null);
      mockCompanyService.createProfile.mockResolvedValue(mockProfile);

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
      expect(data.data).toEqual(mockProfile);
      expect(mockCompanyService.createProfile).toHaveBeenCalled();
    });

    it('should return 401 if not authenticated', async () => {
      // Mock withValidatedServices to simulate authentication failure
      const { withValidatedServices } = await import('@/lib/api/with-services');
      vi.mocked(withValidatedServices).mockImplementationOnce(() => {
        return async () => new NextResponse('unauthorized', { status: 401 });
      });

      const request = createAuthenticatedRequest('POST', 'http://localhost/api/company/profile', {});

      const response = await POST(request);
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/company/profile', () => {
    it('should return the company profile', async () => {
      mockCompanyService.getProfileByUserId.mockResolvedValue(mockProfile);

      const request = createAuthenticatedRequest('GET', 'http://localhost/api/company/profile');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toEqual(mockProfile);
      expect(mockCompanyService.getProfileByUserId).toHaveBeenCalled();
    });

    it('should return 404 if profile not found', async () => {
      mockCompanyService.getProfileByUserId.mockResolvedValue(null);

      const request = createAuthenticatedRequest('GET', 'http://localhost/api/company/profile');

      const response = await GET(request);
      expect(response.status).toBe(404);
    });
  });
}); 