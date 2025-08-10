import { NextRequest } from 'next/server';
import { GET, PATCH } from '../route';
import type { UserService } from '@/core/user/interfaces';
import type { AuthService } from '@/core/auth/interfaces';
import { vi } from 'vitest';
import { getServiceContainer } from '@/lib/config/service-container';

// Mock the service container
vi.mock('@/lib/config/service-container', () => ({
  getServiceContainer: vi.fn(),
}));

vi.mock('@/lib/api/auth-middleware', () => ({
  createAuthMiddleware: vi.fn(() => vi.fn(() => Promise.resolve({ userId: 'u123' })))
}));

vi.mock('@/middleware/with-security', () => ({ withSecurity: (h: any) => h }));

// Mock the service error handler to avoid compliance config issues
vi.mock('@/services/common/service-error-handler', () => ({
  logServiceError: vi.fn(),
  handleServiceError: vi.fn(),
  withErrorHandling: vi.fn((fn) => fn),
  safeQuery: vi.fn(),
  validateAndExecute: vi.fn(),
}));

describe('/api/profile', () => {
  const mockUserService = {
    getUserProfile: vi.fn(),
    updateUserProfile: vi.fn(),
  };
  
  const mockAuthService = {
    getCurrentUser: vi.fn(),
    isAuthenticated: vi.fn(),
  };
  
  beforeEach(() => {
    vi.clearAllMocks();
    (getServiceContainer as vi.Mock).mockReturnValue({
      user: mockUserService,
      auth: mockAuthService,
    });
  });

  describe('GET', () => {
    it('should return user profile for authenticated user', async () => {
      const mockProfile = {
        id: '123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      };

      // Mock user service
      mockUserService.getUserProfile.mockResolvedValue(mockProfile);

      const request = new NextRequest('http://localhost:3000/api/profile', {
        headers: { authorization: 'Bearer valid-token' },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockUserService.getUserProfile).toHaveBeenCalledWith('u123');
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockProfile);
    });

    it('should return 401 for unauthenticated requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/profile');

      const response = await GET(request);
      
      expect(response.status).toBe(401);
    });
  });

  describe('PATCH', () => {
    it('should update user profile for authenticated user', async () => {
      const updateData = {
        firstName: 'Jane',
        lastName: 'Smith',
      };

      const mockResult = {
        success: true,
        profile: {
          id: '123',
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
        },
      };

      // Mock user service
      mockUserService.updateUserProfile.mockResolvedValue(mockResult as any);

      const request = new NextRequest('http://localhost:3000/api/profile', {
        method: 'PATCH',
        headers: { 
          authorization: 'Bearer valid-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockUserService.updateUserProfile).toHaveBeenCalledWith('u123', updateData);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockResult.profile);
    });

    it('should validate request data', async () => {
      const invalidData = {
        firstName: 123, // Should be string
      };

      // Test validation without mocking user service

      const request = new NextRequest('http://localhost:3000/api/profile', {
        method: 'PATCH',
        headers: { 
          authorization: 'Bearer valid-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify(invalidData),
      });

      const response = await PATCH(request);
      
      expect(response.status).toBe(400);
      expect(mockUserService.updateUserProfile).not.toHaveBeenCalled();
    });
  });
});
